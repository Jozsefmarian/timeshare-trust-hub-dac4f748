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

type CheckRow = {
  id: string;
  case_id: string;
  document_id: string | null;
  check_type: string;
  result: string;
  severity: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type RestrictionHitRow = {
  id: string;
  case_id: string;
  document_id: string | null;
  policy_version_id: string | null;
  rule_id: string | null;
  severity: string | null;
  action: string | null;
  matched_text: string | null;
  excerpt: string | null;
  page_number: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function uniq(values: string[]) {
  return [...new Set(values)];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resortNamesSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length >= 5 && nb.includes(na)) return true;
  if (nb.length >= 5 && na.includes(nb)) return true;
  const wordsA = na.split(" ").filter((w) => w.length >= 3);
  const wordsB = nb.split(" ").filter((w) => w.length >= 3);
  const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longerStr = wordsA.length <= wordsB.length ? nb : na;
  if (shorter.length >= 1) {
    const matchCount = shorter.filter((w) => longerStr.includes(w)).length;
    if (matchCount / shorter.length >= 0.6) return true;
  }
  const minLen = 6;
  const shortStr = na.length <= nb.length ? na : nb;
  const longStr = na.length <= nb.length ? nb : na;
  for (let i = 0; i <= shortStr.length - minLen; i++) {
    if (longStr.includes(shortStr.substring(i, i + minLen))) return true;
  }
  return false;
}

function textSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length >= 5 && nb.includes(na)) return true;
  if (nb.length >= 5 && na.includes(nb)) return true;
  if (na.split(" ")[0].length > 4 && na.split(" ")[0] === nb.split(" ")[0]) return true;
  return false;
}

// Case-szintű field_match összehasonlítás
// Az adott típusú dokumentumok összes szövegét + extracted_fields-jét összefűzi
// és egységesen hasonlítja össze a form adatokkal.
// Ez megoldja a több fájlban feltöltött szerződések problémáját.
async function runCaseLevelFieldMatch(
  serviceClient: any,
  caseId: string,
): Promise<{
  mismatchResults: Array<{
    field_name: string;
    field_label: string;
    form_value: any;
    doc_value: any;
    is_mismatch: boolean;
  }>;
  hasTimeshareText: boolean;
}> {
  // 1. Week offer betöltése
  const { data: weekOffer } = await serviceClient
    .from("week_offers")
    .select("resort_name_raw, week_number, unit_number, capacity, resort_id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!weekOffer) return { mismatchResults: [], hasTimeshareText: false };

  // 2. Összes timeshare_contract típusú dokumentum betöltése
  const { data: timeshareDocsRaw } = await serviceClient
    .from("documents")
    .select("id, extracted_text, extracted_fields, ai_status")
    .eq("case_id", caseId)
    .eq("upload_status", "uploaded")
    .in("document_type", ["timeshare_contract", "timeshare_contract"])
    .in("ai_status", ["completed"]);

  // Ha nincs timeshare doc, próbáljuk a document_type_code alapján is
  let timeshareDocs = timeshareDocsRaw ?? [];
  if (timeshareDocs.length === 0) {
    const { data: allDocs } = await serviceClient
      .from("documents")
      .select("id, document_type, extracted_text, extracted_fields, ai_status")
      .eq("case_id", caseId)
      .eq("upload_status", "uploaded")
      .eq("ai_status", "completed");

    timeshareDocs = (allDocs ?? []).filter((d: any) => {
      const dt = (d.document_type ?? "").toLowerCase();
      return dt.includes("timeshare") || dt.includes("contract") || dt.includes("udulo");
    });
  }

  if (timeshareDocs.length === 0) return { mismatchResults: [], hasTimeshareText: false };

  // 3. Összes szöveg és mező összefűzése
  const allTexts: string[] = [];
  const mergedFields: Record<string, unknown> = {};

  for (const doc of timeshareDocs) {
    const rawText = (doc.extracted_text as any)?.raw_text ?? "";
    if (rawText && rawText.length > 0) allTexts.push(rawText);

    // Mezők merge-elése: csak akkor írjuk felül, ha az új érték érvényes
    const fields = (doc.extracted_fields ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === "") continue;
      // capacity: csak 1-20 közötti érték érvényes
      if (key === "capacity") {
        const cap = Number(value);
        if (cap >= 1 && cap <= 20) mergedFields[key] = cap;
        continue;
      }
      mergedFields[key] = value;
    }
  }

  const combinedText = allTexts.join("\n\n--- NEXT PAGE ---\n\n");
  const hasTimeshareText = combinedText.length >= 100;

  if (!hasTimeshareText) return { mismatchResults: [], hasTimeshareText: false };

  // 4. Összehasonlítás az összefűzött szöveg és mezők alapján
  const results: Array<{
    field_name: string;
    field_label: string;
    form_value: any;
    doc_value: any;
    is_mismatch: boolean;
  }> = [];

  // Resort név: először extracted_fields-ből, ha nincs, akkor az összefűzött szövegből keresünk
  if (weekOffer.resort_name_raw) {
    let docResortName = mergedFields.resort_name as string | null | undefined;

    // Ha nincs kinyert resort név a mezőkből, de a form érték megtalálható az összefűzött szövegben
    if (!docResortName || docResortName === "") {
      const normalizedFormResort = normalizeText(weekOffer.resort_name_raw);
      if (normalizedFormResort.length >= 4 && normalizeText(combinedText).includes(normalizedFormResort)) {
        // A form resort neve megtalálható a szövegben → nem mismatch
        results.push({
          field_name: "resort_name_raw",
          field_label: "Uduloingatlan neve",
          form_value: weekOffer.resort_name_raw,
          doc_value: weekOffer.resort_name_raw,
          is_mismatch: false,
        });
      }
      // Ha nincs se extracted, se a szövegben → kihagyjuk (nem tudjuk ellenőrizni)
    } else {
      // Van kinyert resort név → összehasonlítás
      results.push({
        field_name: "resort_name_raw",
        field_label: "Uduloingatlan neve",
        form_value: weekOffer.resort_name_raw,
        doc_value: docResortName,
        is_mismatch: !resortNamesSimilar(docResortName, weekOffer.resort_name_raw),
      });
    }
  }

  // Hét száma
  if (weekOffer.week_number != null) {
    const docWeek = mergedFields.week_number as number | null | undefined;
    if (docWeek != null) {
      results.push({
        field_name: "week_number",
        field_label: "Udulesi het sorszama",
        form_value: weekOffer.week_number,
        doc_value: docWeek,
        is_mismatch: Number(docWeek) !== Number(weekOffer.week_number),
      });
    }
    // Ha nincs kinyerve → nem ellenőrizzük (kihagyjuk)
  }

  // Egység száma
  const docUnitNumber = mergedFields.unit_number as string | null | undefined;
  if (docUnitNumber && weekOffer.unit_number) {
    results.push({
      field_name: "unit_number",
      field_label: "Apartman/egyseg szama",
      form_value: weekOffer.unit_number,
      doc_value: docUnitNumber,
      is_mismatch: !textSimilar(docUnitNumber, weekOffer.unit_number),
    });
  }

  // Kapacitás: csak 1-20 közötti értékeket hasonlítunk össze
  const docCapacity = mergedFields.capacity as number | null | undefined;
  if (docCapacity != null && docCapacity >= 1 && docCapacity <= 20 && weekOffer.capacity != null) {
    results.push({
      field_name: "capacity",
      field_label: "Ferohely (max. szemelyek szama)",
      form_value: weekOffer.capacity,
      doc_value: docCapacity,
      is_mismatch: Number(docCapacity) !== Number(weekOffer.capacity),
    });
  }

  return { mismatchResults: results, hasTimeshareText };
}

async function saveCaseLevelFieldMatchResults(
  serviceClient: any,
  caseId: string,
  mismatchResults: Array<{
    field_name: string;
    field_label: string;
    form_value: any;
    doc_value: any;
    is_mismatch: boolean;
  }>,
) {
  if (mismatchResults.length === 0) return;

  const rows = mismatchResults.map((m) => ({
    case_id: caseId,
    document_id: null, // case-szintű, nem kötődik egy dokumentumhoz
    check_type: "field_match",
    result: m.is_mismatch ? "correction_required" : "pass",
    severity: m.is_mismatch ? "correction" : "info",
    message: m.is_mismatch
      ? `${m.field_label}: az urlap adata elter a dokumentumban szereplotol.`
      : `${m.field_label}: egyezik.`,
    details: {
      field_name: m.field_name,
      field_label: m.field_label,
      current_value: m.form_value,
      expected_value: m.doc_value,
      source: "case_level_comparison",
    },
  }));

  const { error } = await serviceClient.from("check_results").insert(rows);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
  }

  if (!isInternalRequest(req, serviceRoleKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const caseId = body?.case_id ?? null;
    const policyVersionId = body?.policy_version_id ?? null;

    if (!caseId) {
      return jsonResponse({ error: "Missing required field: case_id" }, 400);
    }

    // --- Load case ---
    const { data: caseRow, error: caseLoadError } = await serviceClient
      .from("cases")
      .select("id, status, submitted_at, recheck_count")
      .eq("id", caseId)
      .maybeSingle();

    if (caseLoadError) {
      return jsonResponse({ error: "Failed to load case", detail: caseLoadError.message }, 500);
    }
    if (!caseRow) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

    // --- Ellenőrzés: requires_manual_review resort ---
    const { data: weekOfferForResort } = await serviceClient
      .from("week_offers")
      .select("resort_id")
      .eq("case_id", caseId)
      .maybeSingle();

    if (weekOfferForResort?.resort_id) {
      const { data: resortRow } = await serviceClient
        .from("resorts")
        .select("requires_manual_review, name")
        .eq("id", weekOfferForResort.resort_id)
        .maybeSingle();

      if (resortRow?.requires_manual_review === true) {
        console.log(
          `classify-case: resort '${resortRow.name}' requires_manual_review=true → forcing yellow/manual_review`,
        );

        const { data: insertedClassification, error: insertError } = await serviceClient
          .from("classifications")
          .insert({
            case_id: caseId,
            classification: "yellow",
            reason_summary: "Az üdülőhely egyedi elbírálást igényel.",
            reason_codes: ["RESORT_REQUIRES_MANUAL_REVIEW"],
            created_by: "system",
            policy_version_id: policyVersionId,
          })
          .select("id")
          .single();

        if (insertError) {
          return jsonResponse({ error: "Failed to insert classification", detail: insertError.message }, 500);
        }

        const previousStatus = caseRow.status ?? null;
        const isSubmitted = !!caseRow.submitted_at;

        const caseUpdatePayload: Record<string, unknown> = {
          classification: "yellow",
          ai_pipeline_status: "completed",
        };

        if (isSubmitted) {
          caseUpdatePayload.status = "yellow_review";
        }

        await serviceClient.from("cases").update(caseUpdatePayload).eq("id", caseId);

        return jsonResponse({
          success: true,
          case_id: caseId,
          case_status: isSubmitted ? "yellow_review" : previousStatus,
          classification: "yellow",
          reason_codes: ["RESORT_REQUIRES_MANUAL_REVIEW"],
          classification_id: insertedClassification.id,
          manual_review_forced: true,
        });
      }
    }

    // --- Document readiness check ---
    const { data: allDocs, error: docsError } = await serviceClient
      .from("documents")
      .select("id, ai_status, upload_status, document_type")
      .eq("case_id", caseId)
      .eq("upload_status", "uploaded");

    if (docsError) {
      return jsonResponse({ error: "Failed to load documents", detail: docsError.message }, 500);
    }

    const totalDocs = (allDocs ?? []).length;
    const doneDocs = (allDocs ?? []).filter((d: any) => d.ai_status === "completed" || d.ai_status === "failed").length;

    console.log(`Document readiness: ${doneDocs}/${totalDocs} done for case ${caseId}`);

    if (totalDocs === 0) {
      return jsonResponse({ success: false, pending: true, reason: "no_uploaded_documents", case_id: caseId });
    }

    if (doneDocs < totalDocs) {
      return jsonResponse({
        success: false,
        pending: true,
        reason: "not_all_docs_processed",
        docs_done: doneDocs,
        docs_total: totalDocs,
        case_id: caseId,
      });
    }

    // --- Case-szintű field_match futtatása ---
    // Ez az összes timeshare_contract típusú dokumentum szövegét összefűzi
    // és egységesen hasonlítja össze a form adatokkal.
    let caseLevelMismatchResults: Array<{
      field_name: string;
      field_label: string;
      form_value: any;
      doc_value: any;
      is_mismatch: boolean;
    }> = [];
    let hasTimeshareText = false;
    try {
      const result = await runCaseLevelFieldMatch(serviceClient, caseId);
      caseLevelMismatchResults = result.mismatchResults;
      hasTimeshareText = result.hasTimeshareText;
      if (caseLevelMismatchResults.length > 0) {
        await saveCaseLevelFieldMatchResults(serviceClient, caseId, caseLevelMismatchResults);
      }
      console.log(
        `Case-level field match: hasText=${hasTimeshareText}, fields_checked=${caseLevelMismatchResults.length}, mismatches=${caseLevelMismatchResults.filter((m) => m.is_mismatch).length}`,
      );
    } catch (fieldMatchErr) {
      console.error("Case-level field match error (non-blocking):", fieldMatchErr);
    }

    // --- Load check results and restriction hits ---
    const { data: checks, error: checksError } = await serviceClient
      .from("check_results")
      .select("id, case_id, document_id, check_type, result, severity, message, details, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (checksError) {
      return jsonResponse({ error: "Failed to load check_results", detail: checksError.message }, 500);
    }

    const { data: restrictionHits, error: hitsError } = await serviceClient
      .from("case_restriction_hits")
      .select(
        "id, case_id, document_id, policy_version_id, rule_id, severity, action, matched_text, excerpt, page_number, details, created_at",
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (hitsError) {
      return jsonResponse({ error: "Failed to load case_restriction_hits", detail: hitsError.message }, 500);
    }

    const checkRows = (checks ?? []) as CheckRow[];
    const hitRows = (restrictionHits ?? []) as RestrictionHitRow[];

    // SAFETY NET: timeshare doc van, de nincs field_match eredmény ÉS nincs olvasható szöveg
    const hasTimeshareContractDoc = (allDocs ?? []).some(
      (d: any) =>
        (d.document_type ?? "").toLowerCase().includes("timeshare") ||
        (d.document_type ?? "").toLowerCase().includes("contract") ||
        (d.document_type ?? "").toLowerCase().includes("udulo"),
    );
    const hasFieldMatchResults = checkRows.some((r) => r.check_type === "field_match");
    // Safety net csak akkor aktiv, ha nincs olvasható szöveg sem
    const safetyNetTriggered = hasTimeshareContractDoc && !hasFieldMatchResults && !hasTimeshareText;
    if (safetyNetTriggered) {
      console.log(`classify-case SAFETY NET: timeshare doc found but no text extracted and no field_match results`);
    }

    // --- Classification logic ---
    const failChecks = checkRows.filter((row) => row.result === "fail");
    const highFailChecks = failChecks.filter((row) => (row.severity ?? "").toLowerCase() === "high");
    const autoRejectHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "AUTO_REJECT");
    const warningChecks = checkRows.filter((row) => row.result === "warning");
    const manualLegalHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "FLAG_MANUAL_LEGAL");
    const allowButYellowHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "ALLOW_BUT_YELLOW");
    const confirmedHits = hitRows.filter((row) => (row.severity ?? "").toUpperCase() === "CONFIRMED");
    const correctionRequiredChecks = checkRows.filter((row) => row.result === "correction_required");

    let classification: "green" | "yellow" | "red" = "green";
    let reasonSummary = "No blocking issues found.";
    let reasonCodes: string[] = [];

    if (autoRejectHits.length > 0 || highFailChecks.length > 0) {
      classification = "red";
      reasonSummary = "Auto reject condition found.";
      reasonCodes = uniq([
        ...autoRejectHits.map(() => "AUTO_REJECT_HIT"),
        ...highFailChecks.map((row) => `FAIL:${row.check_type}`),
      ]);
    } else if (
      safetyNetTriggered ||
      correctionRequiredChecks.length > 0 ||
      manualLegalHits.length > 0 ||
      allowButYellowHits.length > 0 ||
      confirmedHits.length > 0 ||
      warningChecks.length > 0
    ) {
      classification = "yellow";
      if (safetyNetTriggered) {
        reasonSummary = "Field comparison did not run. Manual review required.";
        reasonCodes = ["NO_FIELD_MATCH_RESULTS"];
      } else if (
        correctionRequiredChecks.length > 0 &&
        manualLegalHits.length === 0 &&
        allowButYellowHits.length === 0 &&
        confirmedHits.length === 0
      ) {
        reasonSummary = "Field mismatch found. Seller correction required.";
        reasonCodes = uniq(
          correctionRequiredChecks.map(
            (row) => `CORRECTION_REQUIRED:${(row.details as any)?.field_name ?? row.check_type}`,
          ),
        );
      } else {
        reasonSummary = "Manual review recommended.";
        reasonCodes = uniq([
          ...correctionRequiredChecks.map(
            (row) => `CORRECTION_REQUIRED:${(row.details as any)?.field_name ?? row.check_type}`,
          ),
          ...manualLegalHits.map(() => "FLAG_MANUAL_LEGAL"),
          ...allowButYellowHits.map(() => "ALLOW_BUT_YELLOW"),
          ...confirmedHits.map(() => "CONFIRMED_RESTRICTION"),
          ...warningChecks.map((row) => `WARNING:${row.check_type}`),
        ]);
      }
    } else {
      classification = "green";
      reasonSummary = "Checks passed and no restriction hit requires review.";
      reasonCodes = ["CHECKS_OK"];
    }

    const { data: insertedClassification, error: insertError } = await serviceClient
      .from("classifications")
      .insert({
        case_id: caseId,
        classification,
        reason_summary: reasonSummary,
        reason_codes: reasonCodes,
        created_by: "system",
        policy_version_id: policyVersionId,
      })
      .select("id")
      .single();

    if (insertError) {
      return jsonResponse({ error: "Failed to insert classification", detail: insertError.message }, 500);
    }

    const mappedStatus =
      classification === "green" ? "green_approved" : classification === "yellow" ? "yellow_review" : "red_rejected";

    const previousStatus = caseRow.status ?? null;
    const isSubmitted = !!caseRow.submitted_at;
    const statusChanged = previousStatus !== mappedStatus;
    const wasInReview = previousStatus === "yellow_review";
    const isNowGreen = mappedStatus === "green_approved";

    const shouldUpdateBusinessStatus = isSubmitted && (statusChanged || (wasInReview && isNowGreen));

    const caseUpdatePayload: Record<string, unknown> = {
      classification,
      ai_pipeline_status: "completed",
    };

    if (shouldUpdateBusinessStatus) {
      caseUpdatePayload.status = mappedStatus;
    }

    const { error: caseUpdateError } = await serviceClient.from("cases").update(caseUpdatePayload).eq("id", caseId);

    if (caseUpdateError) {
      return jsonResponse({ error: "Failed to update case classification", detail: caseUpdateError.message }, 500);
    }

    console.log(
      `classify-case: case=${caseId} classification=${classification} previous_status=${previousStatus} new_status=${shouldUpdateBusinessStatus ? mappedStatus : "(unchanged)"}`,
    );

    if (shouldUpdateBusinessStatus && isNowGreen && wasInReview) {
      console.log(`classify-case: green result after yellow_review -> triggering generate-sale-contract`);
      fetch(`${supabaseUrl}/functions/v1/generate-sale-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: serviceRoleKey },
        body: JSON.stringify({ case_id: caseId }),
      }).catch((err) => {
        console.error("generate-sale-contract fire-and-forget error:", err);
      });
    }

    return jsonResponse({
      success: true,
      case_id: caseId,
      case_status: shouldUpdateBusinessStatus ? mappedStatus : previousStatus,
      previous_case_status: previousStatus,
      classification_id: insertedClassification.id,
      classification,
      reason_summary: reasonSummary,
      reason_codes: reasonCodes,
      safety_net_triggered: safetyNetTriggered,
      has_timeshare_text: hasTimeshareText,
      case_level_fields_checked: caseLevelMismatchResults.length,
      case_level_mismatches: caseLevelMismatchResults.filter((m) => m.is_mismatch).length,
      docs_total: totalDocs,
      docs_done: doneDocs,
      stats: {
        check_count: checkRows.length,
        fail_count: failChecks.length,
        warning_count: warningChecks.length,
        correction_required_count: correctionRequiredChecks.length,
        restriction_hit_count: hitRows.length,
        auto_reject_hit_count: autoRejectHits.length,
        manual_legal_hit_count: manualLegalHits.length,
        allow_but_yellow_hit_count: allowButYellowHits.length,
      },
      applied_policy_version_id: policyVersionId,
    });
  } catch (err) {
    console.error("classify-case unhandled error:", err);
    return jsonResponse(
      {
        error: "classify-case failed",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
