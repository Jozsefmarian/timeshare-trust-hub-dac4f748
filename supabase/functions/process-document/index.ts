import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

type JobRow = {
  id: string;
  case_id: string;
  document_id: string | null;
  policy_version_id: string | null;
  job_type: string;
  status: string;
  attempt_count: number;
  input_payload: Record<string, unknown> | null;
};

type DocumentRow = {
  id: string;
  case_id: string;
  document_type: string | null;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  ai_status: string | null;
  upload_status: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] }),
      "Content-Type": "application/json",
    },
  });
}

function isInternalRequest(req: Request, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization");
  const apikey = req.headers.get("apikey");
  return authHeader === `Bearer ${serviceRoleKey}` || apikey === serviceRoleKey;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ── OCR / szöveg kinyerése ────────────────────────────────────────────────

/**
 * Uint8Array → base64 string (Deno-kompatibilis, nagy fájlokra is biztonságos)
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Kép küldése az OpenAI Vision API-nak szövegkinyerésre.
 */
async function callOpenAIVision(base64: string, mimeType: string, openAiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Extract all text from this document image. Return only the extracted text content, preserving the original structure as much as possible. Do not add any commentary or explanation.",
            },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenAI Vision API error:", response.status, err);
    return "";
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "") as string;
}

/**
 * PDF küldése az OpenAI API-nak szövegkinyerésre (gpt-5.4-nano file input).
 */
async function callOpenAIPDF(base64: string, fileName: string, openAiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: fileName,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Extract all text from this PDF document. Return only the extracted text content, preserving the original structure as much as possible. Do not add any commentary or explanation.",
            },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenAI PDF API error:", response.status, err);
    return "";
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "") as string;
}

/**
 * Fő szövegkinyerő függvény — MIME type alapján ágazik szét.
 *
 * - text/*        → közvetlen szövegolvasás
 * - image/*       → OpenAI Vision API
 * - application/pdf → először próbál szöveget kiolvasni;
 *                     ha kevés szöveget kap (szkennelt PDF), OpenAI PDF API-ra vált
 * - egyéb         → fallback: fileData.text()
 */
async function extractTextFromFile(
  fileData: Blob,
  mimeType: string | null,
  fileName: string | null,
  openAiKey: string,
): Promise<{ text: string; method: string }> {
  const effectiveMime = (mimeType ?? "").toLowerCase();

  // Sima szövegfájl
  if (effectiveMime.startsWith("text/") || effectiveMime === "application/json") {
    try {
      const text = await fileData.text();
      return { text, method: "direct_text" };
    } catch {
      return { text: "", method: "direct_text_failed" };
    }
  }

  // Ha nincs API kulcs, fallback szövegolvasásra
  if (!openAiKey) {
    console.warn("OPENAI_API_KEY not set, falling back to fileData.text()");
    try {
      const text = await fileData.text();
      return { text, method: "stub_no_key" };
    } catch {
      return { text: "", method: "stub_no_key_failed" };
    }
  }

  // Base64 konverzió (kép és PDF mindkettőhöz kell)
  const buffer = await fileData.arrayBuffer();
  const base64 = uint8ToBase64(new Uint8Array(buffer));

  // Kép → Vision API
  if (effectiveMime.startsWith("image/")) {
    const text = await callOpenAIVision(base64, effectiveMime, openAiKey);
    return { text, method: "openai_vision" };
  }

  // PDF
  if (effectiveMime === "application/pdf" || effectiveMime === "application/x-pdf") {
    // Próbáljuk meg szövegként kiolvasni (digitálisan létrehozott PDF)
    try {
      const textAttempt = await fileData.text();
      // Ha értelmes mennyiségű szöveget kaptunk (nem csak bináris szemét),
      // akkor digitális PDF → nem kell OCR
      const cleanText = textAttempt.replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F]/g, "").trim();
      if (cleanText.length > 100) {
        return { text: cleanText, method: "pdf_text_extraction" };
      }
    } catch {
      // fall through to OpenAI
    }

    // Szkennelt PDF → OpenAI PDF API
    const text = await callOpenAIPDF(base64, fileName ?? "document.pdf", openAiKey);
    return { text, method: "openai_pdf" };
  }

  // Minden más → fallback
  try {
    const text = await fileData.text();
    return { text, method: "fallback_text" };
  } catch {
    return { text: "", method: "fallback_failed" };
  }
}

// ── Dokumentumtípus felismerés ────────────────────────────────────────────

function detectDocumentType(documentType: string | null, fileName: string | null): string {
  const source = normalizeText(`${documentType ?? ""} ${fileName ?? ""}`);

  if (source.includes("share") || source.includes("reszveny")) return "share_statement";
  if (source.includes("szemelyi") || source.includes("id") || source.includes("passport")) return "id_document";
  if (source.includes("fee") || source.includes("dij") || source.includes("szamla")) return "annual_fee_invoice";
  if (source.includes("contract") || source.includes("szerzodes") || source.includes("timeshare"))
    return "timeshare_contract";

  return "other";
}

// ── Mező kinyerés a szövegből ────────────────────────────────────────────

function extractFieldsFromText(text: string, detectedType: string) {
  const normalized = text.replace(/\r/g, "");
  const result: Record<string, unknown> = {
    detected_document_type: detectedType,
  };

  const weekMatch = normalized.match(/(?:het(?:e|ében|eben)?|week)\s*[:\-]?\s*(\d{1,2})/i);
  if (weekMatch) result.week_number = Number(weekMatch[1]);

  const contractMatch = normalized.match(
    /(?:szerz[őo]d[ée]s(?:sz[aá]m)?|contract(?: number)?)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
  );
  if (contractMatch) result.contract_number = contractMatch[1];

  const endYearMatch = normalized.match(/(?:lej[aá]rat|end year|v[eé]g(?:e)?)\s*[:\-]?\s*(20\d{2})/i);
  if (endYearMatch) result.end_year = Number(endYearMatch[1]);

  const shareCountMatch = normalized.match(/(?:r[eé]szv[eé]ny(?:ek)?\s*sz[aá]ma|share count)\s*[:\-]?\s*(\d+)/i);
  if (shareCountMatch) result.share_count = Number(shareCountMatch[1]);

  const annualFeeMatch = normalized.match(/(?:fenntart[aá]si d[ií]j|annual fee)\s*[:\-]?\s*([\d\s.,]+)\s*(?:ft|huf)?/i);
  if (annualFeeMatch) result.annual_fee = annualFeeMatch[1].trim();

  const ownerLineMatch = normalized.match(/(?:jogosult|tulajdonos|owner|n[eé]v)\s*[:\-]?\s*([^\n]+)/i);
  if (ownerLineMatch) result.owner_name = ownerLineMatch[1].trim();

  const resortLineMatch = normalized.match(/(?:üdül[őo]ingatlan|resort|hotel|club)\s*[:\-]?\s*([^\n]+)/i);
  if (resortLineMatch) result.resort_name = resortLineMatch[1].trim();

  return result;
}

// ── Tiltó klauzulák keresése ─────────────────────────────────────────────

function buildRestrictionHits(text: string) {
  const hits: Array<{
    matched_text: string;
    severity: "suspected" | "confirmed";
    action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow";
    details: Record<string, unknown>;
  }> = [];

  const lowered = normalizeText(text);

  const rules = [
    {
      pattern: "nem ruhazhato at",
      severity: "confirmed" as const,
      action: "auto_reject" as const,
    },
    {
      pattern: "elidegenitesi tilalom",
      severity: "confirmed" as const,
      action: "auto_reject" as const,
    },
    {
      pattern: "hozzajarulasa szukseges",
      severity: "suspected" as const,
      action: "flag_manual_legal" as const,
    },
    {
      pattern: "elo vasarlasi jog",
      severity: "suspected" as const,
      action: "allow_but_yellow" as const,
    },
  ];

  for (const rule of rules) {
    if (lowered.includes(rule.pattern)) {
      hits.push({
        matched_text: rule.pattern,
        severity: rule.severity,
        action: rule.action,
        details: { source: "keyword_scan" },
      });
    }
  }

  return hits;
}

// ── Form vs. dokumentum összehasonlítás (mismatch motor) ─────────────────

type WeekOfferRow = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_type: string | null;
  season_label: string | null;
  rights_end_year: number | null;
};

type MismatchResult = {
  field_name: string;
  field_label: string;
  form_value: string | number | null;
  doc_value: string | number | null;
  is_mismatch: boolean;
};

/**
 * Szöveg hasonlóság: normalizált szövegek részleges egyezésvizsgálata.
 * Visszaad true-t ha elég hasonlóak (nem kell tökéletes egyezés).
 */
function textSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  // Részleges egyezés: az egyik tartalmazza a másikat
  if (na.length > 3 && nb.includes(na)) return true;
  if (nb.length > 3 && na.includes(nb)) return true;
  // Első szó egyezés (resort nevek csonkolva is elfogadhatók)
  const aFirst = na.split(" ")[0];
  const bFirst = nb.split(" ")[0];
  if (aFirst.length > 4 && aFirst === bFirst) return true;
  return false;
}

/**
 * Összehasonlítja a kinyert dokumentummezőket a seller form adataival.
 * Csak akkor jelez eltérést, ha MINDKÉT oldalon van adat.
 */
function compareWithWeekOffer(extractedFields: Record<string, unknown>, weekOffer: WeekOfferRow): MismatchResult[] {
  const results: MismatchResult[] = [];

  // 1. Resort neve
  const docResort = extractedFields.resort_name as string | null | undefined;
  const formResort = weekOffer.resort_name_raw;
  if (docResort && formResort) {
    const match = textSimilar(docResort, formResort);
    results.push({
      field_name: "resort_name_raw",
      field_label: "Üdülőhely neve",
      form_value: formResort,
      doc_value: docResort,
      is_mismatch: !match,
    });
  }

  // 2. Hét száma
  const docWeek = extractedFields.week_number as number | null | undefined;
  const formWeek = weekOffer.week_number;
  if (docWeek != null && formWeek != null) {
    results.push({
      field_name: "week_number",
      field_label: "Hét száma",
      form_value: formWeek,
      doc_value: docWeek,
      is_mismatch: Number(docWeek) !== Number(formWeek),
    });
  }

  // 3. Apartman típus
  const docUnit = extractedFields.unit_type as string | null | undefined;
  const formUnit = weekOffer.unit_type;
  if (docUnit && formUnit) {
    results.push({
      field_name: "unit_type",
      field_label: "Apartman típus",
      form_value: formUnit,
      doc_value: docUnit,
      is_mismatch: !textSimilar(docUnit, formUnit),
    });
  }

  // 4. Jogosultság vége (end_year)
  const docEndYear = extractedFields.end_year as number | null | undefined;
  const formEndYear = weekOffer.rights_end_year;
  if (docEndYear != null && formEndYear != null) {
    results.push({
      field_name: "rights_end_year",
      field_label: "Jogosultság vége (év)",
      form_value: formEndYear,
      doc_value: docEndYear,
      is_mismatch: Number(docEndYear) !== Number(formEndYear),
    });
  }

  return results;
}

// ── check_results mentése ────────────────────────────────────────────────

async function saveCheckResults(
  serviceClient: ReturnType<typeof createClient>,
  caseId: string,
  documentId: string,
  extractedFields: Record<string, unknown>,
  restrictionHits: ReturnType<typeof buildRestrictionHits>,
  policyVersionId: string | null,
  mismatchResults: MismatchResult[] = [],
) {
  const rows: Array<Record<string, unknown>> = [];

  const fieldKeys = [
    "owner_name",
    "resort_name",
    "week_number",
    "contract_number",
    "end_year",
    "annual_fee",
    "share_count",
  ];

  for (const fieldKey of fieldKeys) {
    const extractedValue = extractedFields[fieldKey];

    rows.push({
      case_id: caseId,
      document_id: documentId,
      check_type: `field_presence:${fieldKey}`,
      result: extractedValue !== undefined && extractedValue !== null && extractedValue !== "" ? "pass" : "warning",
      severity: extractedValue !== undefined && extractedValue !== null && extractedValue !== "" ? "info" : "medium",
      message:
        extractedValue !== undefined && extractedValue !== null && extractedValue !== ""
          ? `Field extracted: ${fieldKey}`
          : `Field missing: ${fieldKey}`,
      details: {
        field_key: fieldKey,
        extracted_value: extractedValue ?? null,
        source: "process_document",
      },
    });
  }

  rows.push({
    case_id: caseId,
    document_id: documentId,
    check_type: "policy_version_linked",
    result: policyVersionId ? "pass" : "warning",
    severity: policyVersionId ? "info" : "medium",
    message: policyVersionId ? "Policy version linked to AI job." : "No policy version linked to AI job.",
    details: { policy_version_id: policyVersionId },
  });

  rows.push({
    case_id: caseId,
    document_id: documentId,
    check_type: "restriction_hit_count",
    result: restrictionHits.length > 0 ? "warning" : "pass",
    severity: restrictionHits.length > 0 ? "high" : "info",
    message:
      restrictionHits.length > 0 ? `Restriction hits found: ${restrictionHits.length}` : "No restriction hits found.",
    details: { restriction_hits_count: restrictionHits.length },
  });

  const hasConfirmedRestriction = restrictionHits.some((hit) => hit.severity === "confirmed");

  if (hasConfirmedRestriction) {
    rows.push({
      case_id: caseId,
      document_id: documentId,
      check_type: "restriction_confirmed",
      result: "fail",
      severity: "high",
      message: "Confirmed restriction found in document.",
      details: { source: "keyword_scan" },
    });
  }

  // Mismatch sorok hozzáadása
  for (const m of mismatchResults) {
    if (m.is_mismatch) {
      rows.push({
        case_id: caseId,
        document_id: documentId,
        check_type: "field_match",
        result: "correction_required",
        severity: "correction",
        message: `${m.field_label}: az űrlap adata eltér a dokumentumban szereplőtől.`,
        details: {
          field_name: m.field_name,
          field_label: m.field_label,
          current_value: m.form_value,
          expected_value: m.doc_value,
          source: "form_vs_document_comparison",
        },
      });
    } else {
      rows.push({
        case_id: caseId,
        document_id: documentId,
        check_type: "field_match",
        result: "pass",
        severity: "info",
        message: `${m.field_label}: egyezik.`,
        details: {
          field_name: m.field_name,
          form_value: m.form_value,
          doc_value: m.doc_value,
          source: "form_vs_document_comparison",
        },
      });
    }
  }

  const { error } = await serviceClient.from("check_results").insert(rows);
  if (error) throw error;
}

// ── case_restriction_hits mentése ────────────────────────────────────────

async function saveRestrictionHits(
  serviceClient: ReturnType<typeof createClient>,
  caseId: string,
  documentId: string,
  policyVersionId: string | null,
  restrictionHits: ReturnType<typeof buildRestrictionHits>,
) {
  if (restrictionHits.length === 0) return;

  const rows = restrictionHits.map((hit) => ({
    case_id: caseId,
    document_id: documentId,
    policy_version_id: policyVersionId,
    rule_id: null,
    severity: hit.severity,
    action: hit.action,
    matched_text: hit.matched_text,
    excerpt: hit.matched_text,
    page_number: null,
    details: hit.details,
  }));

  const { error } = await serviceClient.from("case_restriction_hits").insert(rows);
  if (error) throw error;
}

// ── Fő handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
    }

    if (!isInternalRequest(req, serviceRoleKey)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return jsonResponse({ error: "Missing required field: job_id" }, 400);
    }

    // 1. Job betöltése
    const { data: job, error: jobLoadError } = await serviceClient
      .from("ai_validation_jobs")
      .select("id, case_id, document_id, policy_version_id, job_type, status, attempt_count, input_payload")
      .eq("id", job_id)
      .single<JobRow>();

    if (jobLoadError || !job) {
      return jsonResponse({ error: "AI validation job not found", detail: jobLoadError?.message ?? null }, 404);
    }

    if (!job.document_id) {
      return jsonResponse({ error: "Job has no document_id" }, 400);
    }

    // 2. Job → processing
    await serviceClient
      .from("ai_validation_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempt_count: (job.attempt_count ?? 0) + 1,
      })
      .eq("id", job.id);

    // 3. Dokumentum betöltése
    const { data: doc, error: docLoadError } = await serviceClient
      .from("documents")
      .select(
        `id, case_id, document_type, storage_bucket, storage_path,
         original_file_name, mime_type, file_size_bytes, ai_status, upload_status`,
      )
      .eq("id", job.document_id)
      .single<DocumentRow>();

    if (docLoadError || !doc) {
      throw new Error(`Document not found: ${docLoadError?.message ?? "unknown error"}`);
    }

    if (doc.upload_status !== "uploaded") {
      throw new Error(`Document upload_status must be 'uploaded', got '${doc.upload_status}'`);
    }

    // 4. Dokumentum → processing
    await serviceClient
      .from("documents")
      .update({
        ai_status: "processing",
        ocr_status: "processing",
        parse_status: "processing",
        validation_status: "pending",
      })
      .eq("id", doc.id);

    // 5. Fájl letöltése storage-ból
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message ?? "unknown error"}`);
    }

    // 6. OCR / szöveg kinyerése
    const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    let extractedTextRaw = "";
    let ocrMethod = "unknown";

    try {
      const { text, method } = await extractTextFromFile(fileData, doc.mime_type, doc.original_file_name, openAiKey);
      extractedTextRaw = text;
      ocrMethod = method;
      console.log(`OCR completed: method=${method}, chars=${text.length}`);
    } catch (ocrErr) {
      console.error("Text extraction error:", ocrErr);
      extractedTextRaw = "";
      ocrMethod = "error";
    }

    // 7. Dokumentumtípus felismerés
    const detectedType = detectDocumentType(doc.document_type, doc.original_file_name);

    // 8. Mező kinyerés
    const extractedFields = extractFieldsFromText(extractedTextRaw, detectedType);

    // 9. Form vs. dokumentum összehasonlítás (mismatch motor)
    let mismatchResults: MismatchResult[] = [];
    try {
      const { data: weekOffer } = await serviceClient
        .from("week_offers")
        .select("resort_name_raw, week_number, unit_type, season_label, rights_end_year")
        .eq("case_id", doc.case_id)
        .maybeSingle();

      if (weekOffer) {
        mismatchResults = compareWithWeekOffer(extractedFields, weekOffer as WeekOfferRow);
        const mismatchCount = mismatchResults.filter((m) => m.is_mismatch).length;
        console.log(`Mismatch check: ${mismatchCount} eltérés találva`);
      }
    } catch (mismatchErr) {
      console.error("Mismatch comparison error (non-blocking):", mismatchErr);
    }

    // 10. Tiltó klauzula keresés
    const restrictionHits = buildRestrictionHits(extractedTextRaw);
    await saveRestrictionHits(serviceClient, doc.case_id, doc.id, job.policy_version_id, restrictionHits);

    // 11. check_results mentése (mező jelenlét + mismatch + restriction összefoglaló)
    await saveCheckResults(
      serviceClient,
      doc.case_id,
      doc.id,
      extractedFields,
      restrictionHits,
      job.policy_version_id,
      mismatchResults,
    );

    // 11. Dokumentum lezárása
    const hasConfirmedRestriction = restrictionHits.some((hit) => hit.severity === "confirmed");
    const validationStatus = hasConfirmedRestriction ? "restriction_confirmed" : "match_ok";

    await serviceClient
      .from("documents")
      .update({
        ai_status: "completed",
        ocr_status: "completed",
        parse_status: "completed",
        validation_status: validationStatus,
        extracted_text: {
          raw_text: extractedTextRaw,
          detected_document_type: detectedType,
          ocr_method: ocrMethod,
          chars_extracted: extractedTextRaw.length,
        },
        extracted_fields: extractedFields,
      })
      .eq("id", doc.id);

    // 12. Job lezárása
    await serviceClient
      .from("ai_validation_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        output_payload: {
          detected_document_type: detectedType,
          extracted_fields: extractedFields,
          restriction_hits_count: restrictionHits.length,
          ocr_method: ocrMethod,
          chars_extracted: extractedTextRaw.length,
        },
      })
      .eq("id", job.id);

    // 13. classify-case meghívása
    try {
      const classifyResponse = await fetch(`${supabaseUrl}/functions/v1/classify-case`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          case_id: doc.case_id,
          policy_version_id: job.policy_version_id ?? null,
        }),
      });

      if (!classifyResponse.ok) {
        const classifyText = await classifyResponse.text();
        console.error("classify-case invoke failed:", classifyResponse.status, classifyText);
      }
    } catch (classifyErr) {
      console.error("classify-case invoke error:", classifyErr);
    }

    return jsonResponse({
      success: true,
      job_id: job.id,
      document_id: doc.id,
      case_id: doc.case_id,
      detected_document_type: detectedType,
      extracted_fields: extractedFields,
      restriction_hits_count: restrictionHits.length,
      mismatch_count: mismatchResults.filter((m) => m.is_mismatch).length,
      mismatch_fields: mismatchResults.filter((m) => m.is_mismatch).map((m) => m.field_name),
      ocr_method: ocrMethod,
      chars_extracted: extractedTextRaw.length,
    });
  } catch (err) {
    console.error("process-document unhandled error:", err);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceRoleKey) {
        const serviceClient = createClient(supabaseUrl, serviceRoleKey);
        const body = await req
          .clone()
          .json()
          .catch(() => ({}));
        const jobId = body?.job_id;

        if (jobId) {
          await serviceClient
            .from("ai_validation_jobs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: err instanceof Error ? err.message : "Unknown error",
            })
            .eq("id", jobId);

          const { data: failedJob } = await serviceClient
            .from("ai_validation_jobs")
            .select("document_id, case_id")
            .eq("id", jobId)
            .maybeSingle();

          if (failedJob?.case_id) {
            await serviceClient.from("cases").update({ ai_pipeline_status: "failed" }).eq("id", failedJob.case_id);
          }
        }
      }
    } catch (innerErr) {
      console.error("process-document failure handling error:", innerErr);
    }

    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
