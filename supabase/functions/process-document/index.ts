import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
];

const AI_TIMEOUT_MS = 60_000;
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

const OCR_REFUSAL_PATTERNS = [
  "nem tudom ezt a kerest teljesiteni",
  "szerzoi jogi",
  "nem reprodukalhato",
  "nem all modomban",
  "nem tudok segiteni",
  "jogosulatlan masolass",
];

function isOcrRefusal(text: string): boolean {
  if (!text || text.length === 0) return false;
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return OCR_REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

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

type RestrictionHit = {
  rule_id: string | null;
  matched_text: string;
  severity: "suspected" | "confirmed";
  action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow";
  details: Record<string, unknown>;
};

type DbRestrictionRule = {
  id: string;
  rule_type: string;
  match_value: string | null;
  field_name: string | null;
  severity: string | null;
  is_active: boolean;
  message_template: string | null;
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

    const ocrPrompt = isPdf
      ? "Ez egy automatizalt dokumentumelemzo rendszer. A feltoltott fajlbol kizarolag az adatmezok kinyerese a cel statisztikai feldolgozashoz. Ird ki az osszes lathato szoveget a dokumentumrol. Csak a szoveget add vissza, semmi mast. Orizdz meg az eredeti strukturat, ne adj magyarazatot vagy kommentart."
      : "Ez egy automatizalt dokumentumelemzo rendszer. A feltoltott keprol kizarolag az adatmezok kinyerese a cel statisztikai feldolgozashoz. Ird ki az osszes lathato szoveget a keprol. Csak a szoveget add vissza, semmi mast. Orizdz meg az eredeti strukturat, ne adj magyarazatot vagy kommentart.";

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
              content: [contentBlock, { type: "text", text: ocrPrompt }],
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
    const resultText = (textBlock?.text ?? "") as string;

    if (isOcrRefusal(resultText)) {
      console.warn("Claude OCR refusal detected, treating as empty text. File:", fileName);
      return "";
    }

    return resultText;
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
  fileSizeBytes: number | null,
): Promise<{ text: string; method: string; tooBig: boolean }> {
  const effectiveMime = (mimeType ?? "").toLowerCase();

  if (effectiveMime.startsWith("image/") && fileSizeBytes !== null && fileSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    console.warn(`Image too large for OCR: ${fileSizeBytes} bytes (max ${MAX_IMAGE_SIZE_BYTES}). File: ${fileName}`);
    return { text: "", method: "skipped_too_large", tooBig: true };
  }

  if (effectiveMime.startsWith("text/") || effectiveMime === "application/json") {
    try {
      return { text: await fileData.text(), method: "direct_text", tooBig: false };
    } catch {
      return { text: "", method: "direct_text_failed", tooBig: false };
    }
  }

  if (!anthropicKey) {
    console.warn("No ANTHROPIC_API_KEY -- cannot extract text from non-text file");
    return { text: "", method: "stub_no_key", tooBig: false };
  }

  const base64 = uint8ToBase64(new Uint8Array(await fileData.arrayBuffer()));

  if (effectiveMime.startsWith("image/")) {
    const text = await callClaudeOCR(base64, effectiveMime, anthropicKey, fileName);
    return { text, method: text.length > 0 ? "claude_vision" : "claude_vision_failed", tooBig: false };
  }

  if (effectiveMime === "application/pdf" || effectiveMime === "application/x-pdf") {
    try {
      const rawText = await fileData.text();
      if (!rawText.trimStart().startsWith("%PDF-")) {
        const cleanText = rawText.replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F]/g, "").trim();
        if (cleanText.length > 200 && isReadableText(cleanText)) {
          return { text: cleanText, method: "pdf_text_extraction", tooBig: false };
        }
      }
    } catch {
      /* fall through to Claude */
    }

    const pdfText = await callClaudeOCR(base64, "application/pdf", anthropicKey, fileName);
    if (pdfText.length > 0) {
      return { text: pdfText, method: "claude_pdf", tooBig: false };
    }
    return { text: "", method: "claude_pdf_failed", tooBig: false };
  }

  try {
    const t = await fileData.text();
    if (isReadableText(t)) return { text: t, method: "fallback_text", tooBig: false };
  } catch {
    /* ignore */
  }
  return { text: "", method: "fallback_failed", tooBig: false };
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
  const normalized = text.replace(/\r/g, "");
  const result: Record<string, unknown> = { detected_document_type: detectedType };

  const weekMatch = normalized.match(/(?:het(?:e|\u00e9ben|eben)?|week)\s*[:-]?\s*(\d{1,2})/i);
  if (weekMatch) result.week_number = Number(weekMatch[1]);

  const contractMatch = normalized.match(
    /(?:szerz[\u0151o]d[\u00e9e]s(?:sz[\u00e1a]m)?|contract(?: number)?)\s*[:-]?\s*([A-Z0-9-/]+)/i,
  );
  if (contractMatch) result.contract_number = contractMatch[1];

  const shareCountMatch = normalized.match(
    /(?:r[\u00e9e]szv[\u00e9e]ny(?:ek)?\s*sz[\u00e1a]ma|share count)\s*[:-]?\s*(\d+)/i,
  );
  if (shareCountMatch) result.share_count = Number(shareCountMatch[1]);

  const annualFeeMatch = normalized.match(
    /(?:fenntart[a\u00e1]si d[i\u00ed]j|annual fee)\s*[:-]?\s*([\d\s.,]+)\s*(?:ft|huf)?/i,
  );
  if (annualFeeMatch) result.annual_fee = annualFeeMatch[1].trim();

  const ownerLineMatch = normalized.match(/(?:jogosult|tulajdonos|owner|n[\u00e9e]v)\s*[:-]?\s*([^\n]+)/i);
  if (ownerLineMatch) result.owner_name = ownerLineMatch[1].trim();

  const resortLineMatch = normalized.match(
    /(?:\u00fcd[\u00fc\u00fc]l[\u0151o]ingatlan|resort|hotel|club)\s*[:-]?\s*([^\n]+)/i,
  );
  if (resortLineMatch) result.resort_name = resortLineMatch[1].trim();

  const unitNumberMatch = normalized.match(
    /(?:egys[\u00e9e]g(?:sz[\u00e1a]m)?|apartman\s*sz[\u00e1a]m|unit(?:\s*number)?|apart(?:ment)?\s*no)\s*[:-]?\s*([A-Z0-9-/]+)/i,
  );
  if (unitNumberMatch) result.unit_number = unitNumberMatch[1].trim();

  // Capacity: csak pozitív egész szám (1-20), 0 nem érvényes
  const capacityMatch = normalized.match(
    /(?:(\d+)\s*f[\u0151o]\s*(?:r[\u00e9e]sz[\u00e9e]re|sz[\u00e1a]m[\u00e1a]ra)?|(\d+)\s*szem[\u00e9e]lyes|capacity\s*[:-]?\s*(\d+))/i,
  );
  if (capacityMatch) {
    const cap = Number(capacityMatch[1] ?? capacityMatch[2] ?? capacityMatch[3]);
    if (cap >= 1 && cap <= 20) result.capacity = cap;
  }

  return result;
}

async function extractFieldsWithAI(
  text: string,
  anthropicKey: string,
  documentType: string,
): Promise<Record<string, unknown>> {
  if (!text || text.length < 50 || !anthropicKey) return {};
  if (!["timeshare_contract", "share_statement"].includes(documentType)) return {};
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
              content: `Te egy magyar udulesi szerzodoseket elemzo asszisztens vagy. A megadott szerzodes szovegebol nyerd ki a kovetkezo mezokat JSON formatumban. Csak valodi adatokat adj vissza, ne talalj ki semmit. Ha egy mezo nem talalhato, hagyd ki. FONTOS: a capacity (szemelyek szama) csak 1-20 kozotti pozitiv egesz szam lehet, ha 0-t vagy negativ szamot latnal, hagyd ki.\n\nKeresendo mezok:\n- resort_name: udulohely neve\n- week_number: het szama egesz szamkent\n- owner_name: tulajdonos neve\n- contract_number: szerzodes szama\n- annual_fee: eves fenntartasi dij szamkent (pl. 150000)\n- share_count: reszvenyek darabszama\n- unit_type: apartman tipusa (pl. studio, 1 haloszobas)\n- unit_number: egyseg/apartman azonositoja (pl. A-12 vagy 304)\n- capacity: max elhelyezheto fo szama egesz szamkent (csak 1-20 kozotti ertek)\n\nValaszolj KIZAROLAG valid JSON objektummal, semmi massal.\n\nSzerzodes szovege:\n${text.substring(0, 8000)}`,
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
    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    // Capacity 0 vagy negatív kiszűrése
    if (parsed.capacity !== undefined && (parsed.capacity <= 0 || parsed.capacity > 20)) {
      delete parsed.capacity;
    }
    return parsed;
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
  caseId: string,
  detectedDocumentType: string,
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

  if (!resolvedPolicyId) return [];

  let rules: DbRestrictionRule[] = [];
  try {
    const { data, error } = await serviceClient
      .from("restriction_rules")
      .select("id, rule_type, match_value, field_name, severity, is_active, message_template")
      .eq("policy_version_id", resolvedPolicyId)
      .eq("is_active", true)
      .in("rule_type", ["keyword_ban", "keyword", "week_ban"]);
    if (error) throw error;
    rules = (data ?? []) as DbRestrictionRule[];
  } catch (err) {
    console.error("Failed to load restriction rules:", err);
    return [];
  }

  if (rules.length === 0) return [];

  let weekNumber: number | null = null;
  let resortId: string | null = null;
  try {
    const { data: wo } = await serviceClient
      .from("week_offers")
      .select("week_number, resort_id")
      .eq("case_id", caseId)
      .maybeSingle();
    weekNumber = wo?.week_number ?? null;
    resortId = wo?.resort_id ?? null;
  } catch (err) {
    console.error("Failed to load week_offer for week_ban check:", err);
  }

  const normalizedText = normalizeText(text);
  const hits: RestrictionHit[] = [];

  for (const rule of rules) {
    if (!rule.match_value) continue;

    if (rule.rule_type === "keyword_ban" || rule.rule_type === "keyword") {
      if (!normalizedText) continue;

      const patterns = rule.match_value
        .split(",")
        .map((p) => normalizeText(p))
        .filter((p) => p.length > 0);

      for (const pattern of patterns) {
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordBoundaryRegex = new RegExp(`(?<![a-z0-9])${escapedPattern}(?![a-z0-9])`, "i");

        if (wordBoundaryRegex.test(normalizedText)) {
          const severity: "suspected" | "confirmed" = rule.severity === "confirmed" ? "confirmed" : "suspected";
          const action: "flag_manual_legal" | "auto_reject" | "allow_but_yellow" =
            severity === "confirmed" ? "auto_reject" : "flag_manual_legal";

          const rawText = (text ?? "").toLowerCase();
          const idx = rawText.indexOf(pattern);
          let excerpt = "";
          if (idx >= 0) {
            const start = Math.max(0, idx - 60);
            const end = Math.min(rawText.length, idx + pattern.length + 60);
            excerpt = text.substring(start, end).trim();
          }

          hits.push({
            rule_id: rule.id,
            matched_text: pattern,
            severity,
            action,
            details: {
              source: "keyword_scan",
              rule_type: rule.rule_type,
              pattern,
              original_match_value: rule.match_value,
              policy_version_id: resolvedPolicyId,
              excerpt,
            },
          });
          break;
        }
      }
    }

    if (rule.rule_type === "week_ban") {
      if (detectedDocumentType !== "timeshare_contract") continue;
      if (weekNumber === null) continue;

      const ruleResortId = rule.field_name ?? null;
      if (ruleResortId !== null && ruleResortId !== resortId) continue;

      const bannedWeeks = rule.match_value
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
        .map((w) => Number(w))
        .filter((w) => !isNaN(w));

      if (bannedWeeks.includes(weekNumber)) {
        hits.push({
          rule_id: rule.id,
          matched_text: String(weekNumber),
          severity: "suspected",
          action: "flag_manual_legal",
          details: {
            source: "week_ban_scan",
            rule_type: "week_ban",
            week_number: weekNumber,
            banned_weeks: bannedWeeks,
            resort_id: resortId,
            rule_resort_id: ruleResortId,
            policy_version_id: resolvedPolicyId,
          },
        });
      }
    }
  }

  return hits;
}

async function saveCheckResultsDocumentLevel(
  serviceClient: any,
  caseId: string,
  documentId: string,
  documentTypeId: string | null,
  restrictionHits: RestrictionHit[],
  unreadableDocument: boolean,
  imageTooBig: boolean,
) {
  const rows: Array<Record<string, unknown>> = [];

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

  if (imageTooBig) {
    rows.push({
      case_id: caseId,
      document_id: documentId,
      check_type: "document_check",
      result: "correction_required",
      severity: "correction",
      message: "A feltoltott fajl merete tul nagy, kerem toltse fel ujra kisebb felbontasban.",
      details: { document_type_id: documentTypeId, source: "image_too_large", file_size_limit_mb: 4 },
    });
  } else if (unreadableDocument) {
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
    if (["completed", "failed", "cancelled"].includes(job.status))
      return jsonResponse({ success: true, skipped: true, reason: `Job already ${job.status}`, job_id: job.id });
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
    let imageTooBig = false;
    try {
      const { text, method, tooBig } = await extractTextFromFile(
        fileData,
        doc.mime_type,
        doc.original_file_name,
        anthropicKey,
        doc.file_size_bytes,
      );
      extractedTextRaw = text;
      ocrMethod = method;
      imageTooBig = tooBig;
      console.log(`OCR: method=${method}, chars=${text.length}, tooBig=${tooBig}`);
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
    const textExtracted = extractedTextRaw.length >= 100;

    // MEGJEGYZES: A field_match összehasonlítás (form vs dokumentum) a classify-case EF-ben
    // fut le case-szinten, miután minden dokumentum feldolgozódott. Ez azért szükséges, mert
    // egy szerződés több fájlban is feltölthető (pl. 2 JPG = 2 oldal), és a mezők különböző
    // oldalakon lehetnek. A classify-case összefűzi az összes ugyanolyan típusú dokumentum
    // szövegét és extracted_fields-jét, majd egységesen hasonlítja össze a form adatokkal.

    // timeshare_contract esetén: ha nem olvasható, document_check check mentése
    let unreadableTimeshareDoc = false;
    if (detectedType === "timeshare_contract" && !imageTooBig && !textExtracted) {
      unreadableTimeshareDoc = true;
      console.log(`timeshare_contract unreadable: chars_extracted=${extractedTextRaw.length}`);
    }

    const restrictionHits = await buildRestrictionHitsFromDb(
      extractedTextRaw,
      serviceClient,
      job.policy_version_id,
      doc.case_id,
      detectedType,
    );

    await saveRestrictionHits(serviceClient, doc.case_id, doc.id, job.policy_version_id, restrictionHits);
    await saveCheckResultsDocumentLevel(
      serviceClient,
      doc.case_id,
      doc.id,
      doc.document_type_id,
      restrictionHits,
      unreadableTimeshareDoc,
      imageTooBig,
    );

    const validationStatus = restrictionHits.some((h) => h.severity === "confirmed")
      ? "restriction_confirmed"
      : imageTooBig || unreadableTimeshareDoc
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
          image_too_big: imageTooBig,
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
          unreadable_document: unreadableTimeshareDoc,
          image_too_big: imageTooBig,
        },
      })
      .eq("id", job.id);

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
            `classify-case returned pending (${classifyData.docs_done}/${classifyData.docs_total} docs done)`,
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
      unreadable_document: unreadableTimeshareDoc,
      image_too_big: imageTooBig,
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
