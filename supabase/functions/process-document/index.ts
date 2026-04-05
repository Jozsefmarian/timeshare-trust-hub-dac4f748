import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
];

const OPENAI_TIMEOUT_MS = 30_000;

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
    .replace(/[u0300-u036f]/g, "")
    .toLowerCase()
    .replace(/s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = OPENAI_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function callOpenAIVision(base64: string, mimeType: string, openAiKey: string): Promise<string> {
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("OpenAI Vision timeout after", OPENAI_TIMEOUT_MS, "ms");
    } else {
      console.error("OpenAI Vision call failed:", err);
    }
    return "";
  }
}

async function callOpenAIPDF(base64: string, fileName: string, openAiKey: string): Promise<string> {
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("OpenAI PDF timeout after", OPENAI_TIMEOUT_MS, "ms");
    } else {
      console.error("OpenAI PDF call failed:", err);
    }
    return "";
  }
}

async function extractTextFromFile(
  fileData: Blob,
  mimeType: string | null,
  fileName: string | null,
  openAiKey: string,
): Promise<{ text: string; method: string }> {
  const effectiveMime = (mimeType ?? "").toLowerCase();

  if (effectiveMime.startsWith("text/") || effectiveMime === "application/json") {
    try {
      const text = await fileData.text();
      return { text, method: "direct_text" };
    } catch {
      return { text: "", method: "direct_text_failed" };
    }
  }

  if (!openAiKey) {
    try {
      const text = await fileData.text();
      return { text, method: "stub_no_key" };
    } catch {
      return { text: "", method: "stub_no_key_failed" };
    }
  }

  const buffer = await fileData.arrayBuffer();
  const base64 = uint8ToBase64(new Uint8Array(buffer));

  if (effectiveMime.startsWith("image/")) {
    const text = await callOpenAIVision(base64, effectiveMime, openAiKey);
    return { text, method: "openai_vision" };
  }

  if (effectiveMime === "application/pdf" || effectiveMime === "application/x-pdf") {
    try {
      const textAttempt = await fileData.text();
      const cleanText = textAttempt.replace(/[^x20-x7E
r	u00C0-u024F]/g, "").trim();
      if (cleanText.length > 100) {
        return { text: cleanText, method: "pdf_text_extraction" };
      }
    } catch {
      // fall through to OpenAI
    }
    const text = await callOpenAIPDF(base64, fileName ?? "document.pdf", openAiKey);
    return { text, method: "openai_pdf" };
  }

  try {
    const text = await fileData.text();
    return { text, method: "fallback_text" };
  } catch {
    return { text: "", method: "fallback_failed" };
  }
}

function detectDocumentType(documentType: string | null, fileName: string | null): string {
  const source = normalizeText(`${documentType ?? ""} ${fileName ?? ""}`);
  if (source.includes("timeshare") || source.includes("szerzodes") || source.includes("contract"))
    return "timeshare_contract";
  if (source.includes("share") || source.includes("reszveny")) return "share_statement";
  if (source.includes("szemelyi") || source.includes("id") || source.includes("passport")) return "id_document";
  if (source.includes("fee") || source.includes("dij") || source.includes("szamla")) return "annual_fee_invoice";
  return "other";
}

function extractFieldsFromText(text: string, detectedType: string) {
  const normalized = text.replace(/r/g, "");
  const result: Record<string, unknown> = { detected_document_type: detectedType };

  const weekMatch = normalized.match(/(?:het(?:e|u00e9ben|eben)?|week)s*[:-]?s*(d{1,2})/i);
  if (weekMatch) result.week_number = Number(weekMatch[1]);

  const contractMatch = normalized.match(
    /(?:szerz[u0151o]d[u00e9e]s(?:sz[au00e1]m)?|contract(?: number)?)s*[:-]?s*([A-Z0-9-/]+)/i,
  );
  if (contractMatch) result.contract_number = contractMatch[1];

  const shareCountMatch = normalized.match(
    /(?:r[eu00e9]szv[eu00e9]ny(?:ek)?s*sz[au00e1]ma|share count)s*[:-]?s*(d+)/i,
  );
  if (shareCountMatch) result.share_count = Number(shareCountMatch[1]);

  const annualFeeMatch = normalized.match(
    /(?:fenntart[au00e1]si d[iu00ed]j|annual fee)s*[:-]?s*([ds.,]+)s*(?:ft|huf)?/i,
  );
  if (annualFeeMatch) result.annual_fee = annualFeeMatch[1].trim();

  const ownerLineMatch = normalized.match(/(?:jogosult|tulajdonos|owner|n[eu00e9]v)s*[:-]?s*([^
]+)/i);
  if (ownerLineMatch) result.owner_name = ownerLineMatch[1].trim();

  const resortLineMatch = normalized.match(
    /(?:u00fcdu00fcl[u0151o]ingatlan|resort|hotel|club)s*[:-]?s*([^
]+)/i,
  );
  if (resortLineMatch) result.resort_name = resortLineMatch[1].trim();

  // Egységszám / apartman szám kinyerése
  const unitNumberMatch = normalized.match(
    /(?:egys[eu00e9]g(?:sz[au00e1]m)?|apartmans*sz[au00e1]m|unit(?:s*number)?|apart(?:ment)?s*no)s*[:-]?s*([A-Z0-9-/]+)/i,
  );
  if (unitNumberMatch) result.unit_number = unitNumberMatch[1].trim();

  // Férőhelyek száma / személyek száma kinyerése
  // Minta: "2 fő részére", "4 fő", "capacity: 4", "2 személyes"
  const capacityMatch = normalized.match(
    /(?:(d+)s*f[ou0151]s*(?:r[eu00e9]sz[eu00e9]re|sz[au00e1]m[au00e1]ra|r[eu00e9]sz[eu00e9]n)?|(d+)s*szem[eu00e9]lyes|capacitys*[:-]?s*(d+))/i,
  );
  if (capacityMatch) {
    const cap = Number(capacityMatch[1] ?? capacityMatch[2] ?? capacityMatch[3]);
    if (cap > 0 && cap <= 20) result.capacity = cap;
  }

  return result;
}

async function extractFieldsWithAI(text: string, openAiKey: string): Promise<Record<string, unknown>> {
  if (!text || text.length < 50 || !openAiKey) return {};

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Te egy magyar udulesi szerzodoseket elemzo asszisztens vagy. A megadott szerzodes szovegebol nyerd ki a kovetkezo mezokat JSON formatumban. Csak valodi adatokat adj vissza, ne talalj ki semmit. Ha egy mezo nem talalhato, hagyd ki. Keresendo mezok: resort_name (udulohely neve), week_number (het szama egesz szamkent), owner_name (tulajdonos neve), contract_number (szerzodes szama), annual_fee (eves fenntartasi dij szamkent pl. 150000), share_count (reszvenyek darabszama), unit_type (apartman tipusa pl. studio, 1 haloszobas), unit_number (egyseg/apartman azonositoja pl. A-12 vagy 304), capacity (max elhelyezheto fo szama egesz szamkent - keress 'X fo reszere' vagy 'X fo' vagy 'X szemelyes' mintakat). Valaszolj KIZAROLAG valid JSON objektummal, semmi massal.",
          },
          {
            role: "user",
            content: text.substring(0, 6000),
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI field extraction error:", response.status);
      return {};
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Field extraction timeout after", OPENAI_TIMEOUT_MS, "ms");
    } else {
      console.error("Field extraction AI error:", err);
    }
    return {};
  }
}

function buildRestrictionHits(text: string) {
  const hits: Array<{
    matched_text: string;
    severity: "suspected" | "confirmed";
    action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow";
    details: Record<string, unknown>;
  }> = [];

  const lowered = normalizeText(text);
  const rules = [
    { pattern: "nem ruhazhato at", severity: "confirmed" as const, action: "auto_reject" as const },
    { pattern: "elidegenitesi tilalom", severity: "confirmed" as const, action: "auto_reject" as const },
    { pattern: "hozzajarulasa szukseges", severity: "suspected" as const, action: "flag_manual_legal" as const },
    { pattern: "elo vasarlasi jog", severity: "suspected" as const, action: "allow_but_yellow" as const },
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

type WeekOfferRow = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_number: string | null;
  capacity: number | null;
  // unit_type megmarad a DB-ben de nem ellenorizzuk
};

type MismatchResult = {
  field_name: string;
  field_label: string;
  form_value: string | number | null;
  doc_value: string | number | null;
  is_mismatch: boolean;
};

function textSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length > 3 && nb.includes(na)) return true;
  if (nb.length > 3 && na.includes(nb)) return true;
  const aFirst = na.split(" ")[0];
  const bFirst = nb.split(" ")[0];
  if (aFirst.length > 4 && aFirst === bFirst) return true;
  return false;
}

// Ellenorzott mezok: resort_name_raw, week_number, unit_number, capacity
// NEM ellenorzott: unit_type (renter oldalhoz kell, de nem egyeztetjuk)
function compareWithWeekOffer(extractedFields: Record<string, unknown>, weekOffer: WeekOfferRow): MismatchResult[] {
  const results: MismatchResult[] = [];

  // 1. Udulohely neve
  const docResort = extractedFields.resort_name as string | null | undefined;
  const formResort = weekOffer.resort_name_raw;
  if (docResort && formResort) {
    results.push({
      field_name: "resort_name_raw",
      field_label: "Uduloingatlan neve",
      form_value: formResort,
      doc_value: docResort,
      is_mismatch: !textSimilar(docResort, formResort),
    });
  }

  // 2. Udulesi het sorszama
  const docWeek = extractedFields.week_number as number | null | undefined;
  const formWeek = weekOffer.week_number;
  if (docWeek != null && formWeek != null) {
    results.push({
      field_name: "week_number",
      field_label: "Udulesi het sorszama",
      form_value: formWeek,
      doc_value: docWeek,
      is_mismatch: Number(docWeek) !== Number(formWeek),
    });
  }

  // 3. Apartman/egyseg szama
  const docUnitNumber = extractedFields.unit_number as string | null | undefined;
  const formUnitNumber = weekOffer.unit_number;
  if (docUnitNumber && formUnitNumber) {
    results.push({
      field_name: "unit_number",
      field_label: "Apartman/egyseg szama",
      form_value: formUnitNumber,
      doc_value: docUnitNumber,
      is_mismatch: !textSimilar(docUnitNumber, formUnitNumber),
    });
  }

  // 4. Ferohely (max elhelyezheto fo szama)
  const docCapacity = extractedFields.capacity as number | null | undefined;
  const formCapacity = weekOffer.capacity;
  if (docCapacity != null && formCapacity != null) {
    results.push({
      field_name: "capacity",
      field_label: "Ferohely (max. szemelyek szama)",
      form_value: formCapacity,
      doc_value: docCapacity,
      is_mismatch: Number(docCapacity) !== Number(formCapacity),
    });
  }

  return results;
}

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

  // Restriction hit count (belso statusz, nem seller-facing)
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

  if (restrictionHits.some((hit) => hit.severity === "confirmed")) {
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

  // Mezo-egyeztetes eredmenyek (field_match) - ezek jelennek meg a CorrectionPanel-ben
  for (const m of mismatchResults) {
    if (m.is_mismatch) {
      rows.push({
        case_id: caseId,
        document_id: documentId,
        check_type: "field_match",
        result: "correction_required",
        severity: "correction",
        message: `${m.field_label}: az urlap adata elter a dokumentumban szereplotol.`,
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

async function markJobAndDocFailed(
  serviceClient: ReturnType<typeof createClient>,
  jobId: string,
  errorMessage: string,
) {
  try {
    await serviceClient
      .from("ai_validation_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", jobId);

    const { data: failedJob } = await serviceClient
      .from("ai_validation_jobs")
      .select("document_id, case_id")
      .eq("id", jobId)
      .maybeSingle();

    if (failedJob?.document_id) {
      await serviceClient
        .from("documents")
        .update({ ai_status: "failed", ocr_status: "failed", parse_status: "failed" })
        .eq("id", failedJob.document_id);
    }
    if (failedJob?.case_id) {
      await serviceClient.from("cases").update({ ai_pipeline_status: "failed" }).eq("id", failedJob.case_id);
    }
  } catch (cleanupErr) {
    console.error("markJobAndDocFailed cleanup error:", cleanupErr);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let jobIdForCleanup: string | null = null;

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

    jobIdForCleanup = job_id;

    const { data: job, error: jobLoadError } = await serviceClient
      .from("ai_validation_jobs")
      .select("id, case_id, document_id, policy_version_id, job_type, status, attempt_count, input_payload")
      .eq("id", job_id)
      .single<JobRow>();

    if (jobLoadError || !job) {
      return jsonResponse({ error: "AI validation job not found", detail: jobLoadError?.message ?? null }, 404);
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      console.log(`Job ${job_id} already in terminal state: ${job.status}, skipping.`);
      return jsonResponse({
        success: true,
        skipped: true,
        reason: `Job already ${job.status}`,
        job_id: job.id,
      });
    }

    if (!job.document_id) {
      return jsonResponse({ error: "Job has no document_id" }, 400);
    }

    await serviceClient
      .from("ai_validation_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempt_count: (job.attempt_count ?? 0) + 1,
      })
      .eq("id", job.id);

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

    await serviceClient
      .from("documents")
      .update({
        ai_status: "processing",
        ocr_status: "processing",
        parse_status: "processing",
        validation_status: "pending",
      })
      .eq("id", doc.id);

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message ?? "unknown error"}`);
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    let extractedTextRaw = "";
    let ocrMethod = "unknown";

    try {
      const { text, method } = await extractTextFromFile(fileData, doc.mime_type, doc.original_file_name, openAiKey);
      extractedTextRaw = text;
      ocrMethod = method;
      console.log(`OCR completed: method=${method}, chars=${text.length}`);
    } catch (ocrErr) {
      console.error("Text extraction error (non-fatal, continuing with empty text):", ocrErr);
      ocrMethod = "error";
    }

    const detectedType = detectDocumentType(doc.document_type, doc.original_file_name);
    const regexFields = extractFieldsFromText(extractedTextRaw, detectedType);
    let aiFields: Record<string, unknown> = {};

    if (extractedTextRaw.length > 50 && openAiKey) {
      console.log("Running AI field extraction...");
      aiFields = await extractFieldsWithAI(extractedTextRaw, openAiKey);
      console.log("AI extracted fields:", JSON.stringify(aiFields));
    }

    const extractedFields = { ...regexFields, ...aiFields };

    // Form vs. dokumentum osszehasonlitas
    // Mezok: resort_name_raw, week_number, unit_number, capacity
    let mismatchResults: MismatchResult[] = [];
    try {
      const { data: weekOffer } = await serviceClient
        .from("week_offers")
        .select("resort_name_raw, week_number, unit_number, capacity")
        .eq("case_id", doc.case_id)
        .maybeSingle();

      if (weekOffer) {
        mismatchResults = compareWithWeekOffer(extractedFields, weekOffer as WeekOfferRow);
        console.log(`Mismatch check: ${mismatchResults.filter((m) => m.is_mismatch).length} elteres talaltva`);
      }
    } catch (mismatchErr) {
      console.error("Mismatch comparison error (non-blocking):", mismatchErr);
    }

    const restrictionHits = buildRestrictionHits(extractedTextRaw);
    await saveRestrictionHits(serviceClient, doc.case_id, doc.id, job.policy_version_id, restrictionHits);

    await saveCheckResults(
      serviceClient,
      doc.case_id,
      doc.id,
      extractedFields,
      restrictionHits,
      job.policy_version_id,
      mismatchResults,
    );

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

    if (jobIdForCleanup) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        await markJobAndDocFailed(
          createClient(supabaseUrl, serviceRoleKey),
          jobIdForCleanup,
          err instanceof Error ? err.message : "Unknown error",
        );
      }
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