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

    // -------------------------------------------------------------------
    // Wait for all uploaded documents to finish processing before deciding.
    // -------------------------------------------------------------------
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
      return jsonResponse({
        success: false,
        pending: true,
        reason: "no_uploaded_documents",
        case_id: caseId,
      });
    }

    if (doneDocs < totalDocs) {
      console.log(`classify-case: returning pending (${doneDocs}/${totalDocs} docs done)`);
      return jsonResponse({
        success: false,
        pending: true,
        reason: "not_all_docs_processed",
        docs_done: doneDocs,
        docs_total: totalDocs,
        case_id: caseId,
      });
    }

    // -------------------------------------------------------------------
    // All docs processed. Load check results and restriction hits.
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    // SAFETY NET: If there is a timeshare_contract document but no
    // field_match or document_check check results exist for it, the field
    // comparison did not run (e.g. process-document failed silently).
    // In that case we force yellow so an admin can review manually.
    // -------------------------------------------------------------------
    const hasTimeshareContractDoc = (allDocs ?? []).some(
      (d: any) =>
        (d.document_type ?? "").toLowerCase().includes("timeshare") ||
        (d.document_type ?? "").toLowerCase().includes("contract") ||
        (d.document_type ?? "").toLowerCase().includes("udulo"),
    );
    const hasFieldMatchOrDocCheckResults = checkRows.some(
      (r) => r.check_type === "field_match" || r.check_type === "document_check",
    );
    const safetyNetTriggered = hasTimeshareContractDoc && !hasFieldMatchOrDocCheckResults;
    if (safetyNetTriggered) {
      console.log(
        `classify-case SAFETY NET: timeshare_contract doc found but no field_match/document_check results — forcing yellow`,
      );
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

    // Trigger contract generation after yellow_review → green (recheck success)
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
