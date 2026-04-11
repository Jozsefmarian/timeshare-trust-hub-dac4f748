import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
];

const AI_TIMEOUT_MS = 60_000;

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
  document_type: string;
  document_type_id: string | null;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  ai_status: string | null;
  upload_status: string;
};

type WeekOfferRow = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_number: string | null;
  capacity: number | null;
};

type MismatchResult = {
  field_name: string;
  field_label: string;
  form_value: string | number | null;
  doc_value: string | number | null;
  is_mismatch: boolean;
};

type DbRestrictionRule = {
  id: string;
  rule_type: string;
  match_value: string | null;
  severity: string | null;
  is_active: boolean;
  message_template: string | null;
};

type RestrictionHit = {
  rule_id: string | null;
  matched_text: string;
  severity: "suspected" | "confirmed";
  action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow";
  details: Record<string, unknown>;
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

function isReadableText(text: string): boolean {
  if (!text || text.length < 30) return false;
  const printable = text.replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, "");
  const ratio = printable.length / text.length;
  return ratio >= 0.7;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = AI_TIMEOUT_MS): Promise<Response> {
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

async function callClaudeOCR(
  base64: string,
  mimeType: string,
  anthropicKey: string,
  fileName: string | null,
): Promise<string> {
  try {
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf" || mimeType === "application/x-pdf";

    let contentBlock: unknown;
    if (isPdf) {
      contentBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    } else if (isImage) {
      const supportedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const claudeMime = supportedImageTypes.includes(mimeType) ? mimeType : "image/jpeg";
      contentBlock = {
        type: "image",
        source: { type: "base64", media_type: claudeMime, data: base64 },
      };
    } else {
      console.warn("callClaudeOCR: unsupported mime type:", mimeType);
      return "";
    }

    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                contentBlock,
                {
                  type: "text",
                  text: "Kinyom ki az osszes szoveget ebbol a dokumentumbol. Csak a szoveget add vissza, semmi mast. Orizdz meg az eredeti strukturat, de ne adj magyarazatot vagy kommentart.",
                },
              ],
            },
          ],
        }),
      },
      AI_TIMEOUT_MS,
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude OCR API error:", response.status, errText);
      return "";
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === "text");
    return (textBlock?.text ?? "") as string;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") console.error("Claude OCR timeout");
    else console.error("Claude OCR call failed:", err);
    return "";
  }
}

async function extractTextFromFile(
  fileData: Blob,
  mimeType: string | null,
  fileName: string | null,
  anthropicKey: string,
): Promise<{ text: string; method: string }> {
  const effectiveMime = (mimeType ?? "").toLowerCase();

  if (effectiveMime.startsWith("text/") || effectiveMime === "application/json") {
    try {
      return { text: await fileData.text(), method: "direct_text" };
    } catch {
      return { text: "", method: "direct_text_failed" };
    }
  }

  if (!anthropicKey) {
    console.warn("No ANTHROPIC_API_KEY -- cannot extract text from non-text file");
    return { text: "", method: "stub_no_key" };
  }

  const base64 = uint8ToBase64(new Uint8Array(await fileData.arrayBuffer()));

  if (effectiveMime.startsWith("image/")) {
    const text = await callClaudeOCR(base64, effectiveMime, anthropicKey, fileName);
    return { text, method: text.length > 0 ? "claude_vision" : "claude_vision_failed" };
  }

  if (effectiveMime === "application/pdf" || effectiveMime === "application/x-pdf") {
    try {
      const rawText = await fileData.text();
      if (!rawText.trimStart().startsWith("%PDF-")) {
        const printable = text.replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, "");
        const cleanText = rawText.replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F]/g, "").trim();
        if (cleanText.length > 200 && isReadableText(cleanText)) {
          return { text: cleanText, method: "pdf_text_extraction" };
        }
      }
    } catch {
      /* fall through to Claude */
    }

    const pdfText = await callClaudeOCR(base64, "application/pdf", anthropicKey, fileName);
    if (pdfText.length > 0) {
      return { text: pdfText, method: "claude_pdf" };
    }
    return { text: "", method: "claude_pdf_failed" };
  }

  try {
    const t = await fileData.text();
    if (isReadableText(t)) return { text: t, method: "fallback_text" };
  } catch {
    /* ignore */
  }
  return { text: "", method: "fallback_failed" };
}

function detectDocumentType(documentType: string | null, fileName: string | null): string {
  if (documentType) {
    const dt = documentType.toLowerCase();
    if (dt.includes("timeshare") || dt.includes("contract") || dt.includes("udulo")) return "timeshare_contract";
    if (dt.includes("share") || dt.includes("reszveny") || dt.includes("statement")) return "share_statement";
    if (dt.includes("fee") || dt.includes("invoice") || dt.includes("maintenance")) return "annual_fee_invoice";
    if (dt.includes("standard") || dt.includes("information") || dt.includes("sif")) return "sif_document";
    if (dt.includes("other")) return "other";
  }
  const source = normalizeText(`${documentType ?? ""} ${fileName ?? ""}`);
  if (source.includes("timeshare") || source.includes("szerzodes") || source.includes("contract"))
    return "timeshare_contract";
  if (source.includes("share") || source.includes("reszveny")) return "share_statement";
  if (source.includes("fee") || source.includes("dij") || source.includes("szamla")) return "annual_fee_invoice";
  return "other";
}

function extractFieldsFromText(text: string, detectedType: string): Record<string, unknown> {
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

  const unitNumberMatch = normalized.match(
    /(?:egys[eu00e9]g(?:sz[au00e1]m)?|apartmans*sz[au00e1]m|unit(?:s*number)?|apart(?:ment)?s*no)s*[:-]?s*([A-Z0-9-/]+)/i,
  );
  if (unitNumberMatch) result.unit_number = unitNumberMatch[1].trim();

  const capacityMatch = normalized.match(
    /(?:(d+)s*f[ou0151]s*(?:r[eu00e9]sz[eu00e9]re|sz[au00e1]m[au00e1]ra)?|(d+)s*szem[eu00e9]lyes|capacitys*[:-]?s*(d+))/i,
  );
  if (capacityMatch) {
    const cap = Number(capacityMatch[1] ?? capacityMatch[2] ?? capacityMatch[3]);
    if (cap > 0 && cap <= 20) result.capacity = cap;
  }

  return result;
}

async function extractFieldsWithAI(
  text: string,
  anthropicKey: string,
  documentType: string,
): Promise<Record<string, unknown>> {
  if (!text || text.length < 50 || !anthropicKey) return {};
  if (!["timeshare_contract", "share_statement"].includes(documentType)) {
    return {};
  }
  try {
    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Te egy magyar udulesi szerzodoseket elemzo asszisztens vagy. A megadott szerzodes szovegebol nyerd ki a kovetkezo mezokat JSON formatumban. Csak valodi adatokat adj vissza, ne talalj ki semmit. Ha egy mezo nem talalhato, hagyd ki.

Keresendo mezok:
- resort_name: udulohely neve
- week_number: het szama egesz szamkent
- owner_name: tulajdonos neve
- contract_number: szerzodes szama
- annual_fee: eves fenntartasi dij szamkent (pl. 150000)
- share_count: reszvenyek darabszama
- unit_type: apartman tipusa (pl. studio, 1 haloszobas)
- unit_number: egyseg/apartman azonositoja (pl. A-12 vagy 304)
- capacity: max elhelyezheto fo szama egesz szamkent

Valaszolj KIZAROLAG valid JSON objektummal, semmi massal.

Szerzodes szovege:
${text.substring(0, 8000)}`,
            },
          ],
        }),
      },
      AI_TIMEOUT_MS,
    );
    if (!response.ok) {
      console.error("Claude field extraction error:", response.status, await response.text());
      return {};
    }
    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === "text");
    const content = textBlock?.text ?? "{}";
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") console.error("Field extraction timeout");
    else console.error("Field extraction AI error:", err);
    return {};
  }
}

async function buildRestrictionHitsFromDb(
  text: string,
  serviceClient: any,
  policyVersionId: string | null,
): Promise<RestrictionHit[]> {
  let resolvedPolicyId = policyVersionId;
  if (!resolvedPolicyId) {
    try {
      const { data: pv } = await serviceClient
        .from("policy_versions")
        .select("id")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedPolicyId = pv?.id ?? null;
    } catch (err) {
      console.error("Failed to load published policy version:", err);
    }
  }

  if (!resolvedPolicyId) {
    return [];
  }

  let rules: DbRestrictionRule[] = [];
  try {
    const { data, error } = await serviceClient
      .from("restriction_rules")
      .select("id, rule_type, match_value, severity, is_active, message_template")
      .eq("policy_version_id", resolvedPolicyId)
      .eq("is_active", true)
      .in("rule_type", ["keyword_ban", "keyword"]);
    if (error) throw error;
    rules = (data ?? []) as DbRestrictionRule[];
  } catch (err) {
    console.error("Failed to load restriction rules:", err);
    return [];
  }

  if (rules.length === 0) return [];

  const normalizedText = normalizeText(text);
  const hits: RestrictionHit[] = [];

  for (const rule of rules) {
    if (!rule.match_value) continue;
    const pattern = normalizeText(rule.match_value);
    if (!pattern) continue;

    if (normalizedText.includes(pattern)) {
      const severity: "suspected" | "confirmed" = rule.severity === "confirmed" ? "confirmed" : "suspected";
      const action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow" =
        severity === "confirmed" ? "auto_reject" : "flag_manual_legal";

      const rawText = (text ?? "").toLowerCase();
      const rawPattern = (rule.match_value ?? "").toLowerCase();
      const idx = rawText.indexOf(rawPattern);
      let excerpt = "";
      if (idx >= 0) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(rawText.length, idx + rawPattern.length + 60);
        excerpt = text.substring(start, end).trim();
      }

      hits.push({
        rule_id: rule.id,
        matched_text: rule.match_value,
        severity,
        action,
        details: {
          source: "db_restriction_scan",
          rule_type: rule.rule_type,
          pattern: rule.match_value,
          policy_version_id: resolvedPolicyId,
          excerpt,
        },
      });
    }
  }

  return hits;
}

function textSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length > 3 && nb.includes(na)) return true;
  if (nb.length > 3 && na.includes(nb)) return true;
  if (na.split(" ")[0].length > 4 && na.split(" ")[0] === nb.split(" ")[0]) return true;
  return false;
}

/**
 * Compares extracted document fields with the seller's form data.
 *
 * KEY CHANGE vs previous version:
 * For timeshare_contract, the resort_name and week_number are MANDATORY comparison fields.
 * If the OCR successfully extracted text (textExtracted=true) but could NOT find these
 * fields in the document, we treat that as a mismatch (is_mismatch: true, doc_value: null).
 * This prevents silent green classification when OCR text exists but key data is missing.
 *
 * If textExtracted=false (unreadable doc), we skip field comparison entirely — the
 * caller will add a document_check correction_required row instead.
 */
function compareWithWeekOffer(
  extractedFields: Record<string, unknown>,
  weekOffer: WeekOfferRow,
  documentType: string,
  textExtracted: boolean,
): MismatchResult[] {
  if (documentType !== "timeshare_contract") {
    return [];
  }

  // If OCR produced no usable text, skip field comparison.
  // The caller handles this as an unreadable-document correction.
  if (!textExtracted) {
    return [];
  }

  const results: MismatchResult[] = [];

  // --- resort_name: mandatory check ---
  // Compare if form has a value. If OCR text exists but resort not found → mismatch.
  if (weekOffer.resort_name_raw) {
    const docResort = extractedFields.resort_name as string | null | undefined;
    if (docResort) {
      results.push({
        field_name: "resort_name_raw",
        field_label: "Uduloingatlan neve",
        form_value: weekOffer.resort_name_raw,
        doc_value: docResort,
        is_mismatch: !textSimilar(docResort, weekOffer.resort_name_raw),
      });
    } else {
      // Text extracted but resort name not found in document
      results.push({
        field_name: "resort_name_raw",
        field_label: "Uduloingatlan neve",
        form_value: weekOffer.resort_name_raw,
        doc_value: null,
        is_mismatch: true,
      });
    }
  }

  // --- week_number: mandatory check ---
  // Compare if form has a value. If OCR text exists but week not found → mismatch.
  if (weekOffer.week_number != null) {
    const docWeek = extractedFields.week_number as number | null | undefined;
    if (docWeek != null) {
      results.push({
        field_name: "week_number",
        field_label: "Udulesi het sorszama",
        form_value: weekOffer.week_number,
        doc_value: docWeek,
        is_mismatch: Number(docWeek) !== Number(weekOffer.week_number),
      });
    } else {
      // Text extracted but week number not found in document
      results.push({
        field_name: "week_number",
        field_label: "Udulesi het sorszama",
        form_value: weekOffer.week_number,
        doc_value: null,
        is_mismatch: true,
      });
    }
  }

  // --- unit_number: optional check (only if both sides have a value) ---
  const docUnitNumber = extractedFields.unit_number as string | null | undefined;
  if (docUnitNumber && weekOffer.unit_number) {
    results.push({
      field_name: "unit_number",
      field_label: "Apartman/egyseg szama",
      form_value: weekOffer.unit_number,
      doc_value: docUnitNumber,
      is_mismatch: !textSimilar(docUnitNumber, weekOffer.unit_number),
    });
  }

  // --- capacity: optional check (only if both sides have a value) ---
  const docCapacity = extractedFields.capacity as number | null | undefined;
  if (docCapacity != null && weekOffer.capacity != null) {
    results.push({
      field_name: "capacity",
      field_label: "Ferohely (max. szemelyek szama)",
      form_value: weekOffer.capacity,
      doc_value: docCapacity,
      is_mismatch: Number(docCapacity) !== Number(weekOffer.capacity),
    });
  }

  return results;
}

async function saveCheckResults(
  serviceClient: any,
  caseId: string,
  documentId: string,
  documentTypeId: string | null,
  restrictionHits: RestrictionHit[],
  mismatchResults: MismatchResult[],
  unreadableDocument: boolean,
) {
  const rows: Array<Record<string, unknown>> = [];

  // --- Restriction hit summary row ---
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
      details: { source: "db_restriction_scan" },
    });
  }

  // --- Unreadable document: seller must re-upload ---
  if (unreadableDocument) {
    rows.push({
      case_id: caseId,
      document_id: documentId,
      check_type: "document_check",
      result: "correction_required",
      severity: "correction",
      message: "A feltoltott dokumentum nem olvashato. Kerem toltse fel ujra a dokumentumot jobb minosegben.",
      details: {
        document_type_id: documentTypeId,
        document_type_label: "Udulohaszanulati szerzodes",
        source: "ocr_failed",
      },
    });
    // Emit no field_match rows when doc is unreadable — document_check is sufficient
    const { error } = await serviceClient.from("check_results").insert(rows);
    if (error) throw error;
    return;
  }

  // --- Field match rows ---
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
  serviceClient: any,
  caseId: string,
  documentId: string,
  policyVersionId: string | null,
  restrictionHits: RestrictionHit[],
) {
  if (restrictionHits.length === 0) return;
  const rows = restrictionHits.map((hit) => ({
    case_id: caseId,
    document_id: documentId,
    policy_version_id: policyVersionId,
    rule_id: hit.rule_id ?? null,
    severity: hit.severity,
    action: hit.action,
    matched_text: hit.matched_text,
    excerpt: (hit.details.excerpt as string) ?? hit.matched_text,
    page_number: null,
    details: hit.details,
  }));
  const { error } = await serviceClient.from("case_restriction_hits").insert(rows);
  if (error) throw error;
}

async function markJobAndDocFailed(serviceClient: any, jobId: string, errorMessage: string) {
  try {
    await serviceClient
      .from("ai_validation_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: errorMessage })
      .eq("id", jobId);
    const { data: failedJob } = await serviceClient
      .from("ai_validation_jobs")
      .select("document_id, case_id")
      .eq("id", jobId)
      .maybeSingle();
    if (failedJob?.document_id)
      await serviceClient
        .from("documents")
        .update({ ai_status: "failed", ocr_status: "failed", parse_status: "failed" })
        .eq("id", failedJob.document_id);
    if (failedJob?.case_id)
      await serviceClient.from("cases").update({ ai_pipeline_status: "failed" }).eq("id", failedJob.case_id);
  } catch (cleanupErr) {
    console.error("markJobAndDocFailed cleanup error:", cleanupErr);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let jobIdForCleanup: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
    if (!isInternalRequest(req, serviceRoleKey)) return jsonResponse({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { job_id } = await req.json();
    if (!job_id) return jsonResponse({ error: "Missing required field: job_id" }, 400);
    jobIdForCleanup = job_id;

    const { data: job, error: jobLoadError } = await serviceClient
      .from("ai_validation_jobs")
      .select("id, case_id, document_id, policy_version_id, job_type, status, attempt_count, input_payload")
      .eq("id", job_id)
      .single<JobRow>();

    if (jobLoadError || !job)
      return jsonResponse({ error: "AI validation job not found", detail: jobLoadError?.message ?? null }, 404);
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      return jsonResponse({ success: true, skipped: true, reason: `Job already ${job.status}`, job_id: job.id });
    }
    if (!job.document_id) return jsonResponse({ error: "Job has no document_id" }, 400);

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
        "id, case_id, document_type, document_type_id, storage_bucket, storage_path, original_file_name, mime_type, file_size_bytes, ai_status, upload_status",
      )
      .eq("id", job.document_id)
      .single<DocumentRow>();

    if (docLoadError || !doc) throw new Error(`Document not found: ${docLoadError?.message ?? "unknown error"}`);
    if (doc.upload_status !== "uploaded")
      throw new Error(`Document upload_status must be 'uploaded', got '${doc.upload_status}'`);

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
    if (downloadError || !fileData)
      throw new Error(`Failed to download file: ${downloadError?.message ?? "unknown error"}`);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    let extractedTextRaw = "";
    let ocrMethod = "unknown";
    try {
      const { text, method } = await extractTextFromFile(fileData, doc.mime_type, doc.original_file_name, anthropicKey);
      extractedTextRaw = text;
      ocrMethod = method;
      console.log(`OCR: method=${method}, chars=${text.length}`);
    } catch (ocrErr) {
      console.error("Text extraction error (non-fatal):", ocrErr);
      ocrMethod = "error";
    }

    const detectedType = detectDocumentType(doc.document_type, doc.original_file_name);
    console.log(`Document type: db=${doc.document_type}, detected=${detectedType}`);

    const regexFields =
      extractedTextRaw.length > 30
        ? extractFieldsFromText(extractedTextRaw, detectedType)
        : { detected_document_type: detectedType };
    let aiFields: Record<string, unknown> = {};
    if (extractedTextRaw.length > 50 && anthropicKey) {
      aiFields = await extractFieldsWithAI(extractedTextRaw, anthropicKey, detectedType);
      if (Object.keys(aiFields).length > 0) console.log("AI extracted fields:", JSON.stringify(aiFields));
    }
    const extractedFields = { ...regexFields, ...aiFields };

    // textExtracted = true means OCR produced enough text to attempt field comparison.
    // Threshold: 100 chars. Below this, the document is considered unreadable.
    const textExtracted = extractedTextRaw.length >= 100;

    let mismatchResults: MismatchResult[] = [];
    // unreadableTimeshare = timeshare_contract where OCR failed to produce usable text
    let unreadableTimeshareDoc = false;

    try {
      const { data: weekOffer } = await serviceClient
        .from("week_offers")
        .select("resort_name_raw, week_number, unit_number, capacity")
        .eq("case_id", doc.case_id)
        .maybeSingle();

      if (weekOffer) {
        if (detectedType === "timeshare_contract" && !textExtracted) {
          // Document is unreadable — will be flagged as document_check correction
          unreadableTimeshareDoc = true;
          console.log(`timeshare_contract unreadable: chars_extracted=${extractedTextRaw.length}`);
        } else {
          mismatchResults = compareWithWeekOffer(
            extractedFields,
            weekOffer as WeekOfferRow,
            detectedType,
            textExtracted,
          );
          const mismatches = mismatchResults.filter((m) => m.is_mismatch);
          console.log(
            `Mismatch check (${detectedType}): ${mismatches.length} mismatches, chars_extracted=${extractedTextRaw.length}`,
          );
          if (mismatches.length > 0)
            console.log(
              "Mismatches:",
              JSON.stringify(mismatches.map((m) => ({ field: m.field_name, form: m.form_value, doc: m.doc_value }))),
            );
        }
      }
    } catch (mismatchErr) {
      console.error("Mismatch comparison error (non-blocking):", mismatchErr);
    }

    const restrictionHits = await buildRestrictionHitsFromDb(extractedTextRaw, serviceClient, job.policy_version_id);

    await saveRestrictionHits(serviceClient, doc.case_id, doc.id, job.policy_version_id, restrictionHits);
    await saveCheckResults(
      serviceClient,
      doc.case_id,
      doc.id,
      doc.document_type_id,
      restrictionHits,
      mismatchResults,
      unreadableTimeshareDoc,
    );

    const validationStatus = restrictionHits.some((h) => h.severity === "confirmed")
      ? "restriction_confirmed"
      : unreadableTimeshareDoc
      ? "failed"
      : "match_ok";

    await serviceClient
      .from("documents")
      .update({
        ai_status: "completed",
        ocr_status: "completed",
        parse_status: "completed",
        validation_status: validationStatus,
        extracted_text: {
          raw_text: extractedTextRaw.substring(0, 2000),
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
          mismatch_count: mismatchResults.filter((m) => m.is_mismatch).length,
          unreadable_document: unreadableTimeshareDoc,
        },
      })
      .eq("id", job.id);

    // Trigger classify-case. It decides the final classification once all docs are processed.
    try {
      const classifyResponse = await fetch(`${supabaseUrl}/functions/v1/classify-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: serviceRoleKey },
        body: JSON.stringify({ case_id: doc.case_id, policy_version_id: job.policy_version_id ?? null }),
      });

      if (!classifyResponse.ok) {
        console.error("classify-case invoke failed:", classifyResponse.status, await classifyResponse.text());
      } else {
        const classifyData = await classifyResponse.json();
        if (classifyData.pending) {
          console.log(
            `classify-case returned pending (${classifyData.docs_done}/${classifyData.docs_total} docs done) -- waiting for other documents`,
          );
        } else {
          console.log(
            `classify-case result: classification=${classifyData.classification}, status=${classifyData.case_status}`,
          );
        }
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
      restriction_hits_count: restrictionHits.length,
      mismatch_count: mismatchResults.filter((m) => m.is_mismatch).length,
      mismatch_fields: mismatchResults.filter((m) => m.is_mismatch).map((m) => m.field_name),
      unreadable_document: unreadableTimeshareDoc,
      ocr_method: ocrMethod,
      chars_extracted: extractedTextRaw.length,
    });
  } catch (err) {
    console.error("process-document unhandled error:", err);
    if (jobIdForCleanup) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey)
        await markJobAndDocFailed(
          createClient(supabaseUrl, serviceRoleKey),
          jobIdForCleanup,
          err instanceof Error ? err.message : "Unknown error",
        );
    }
    return jsonResponse(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});
