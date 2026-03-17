import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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
    return new Response(null, { headers: corsHeaders });
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

    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      return jsonResponse({ error: "Failed to load case", detail: caseError.message }, 500);
    }

    if (!caseRow) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

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

    const failChecks = checkRows.filter((row) => row.result === "fail");
    const warningChecks = checkRows.filter((row) => row.result === "warning");
    const highFailChecks = failChecks.filter((row) => (row.severity ?? "").toLowerCase() === "high");

    const autoRejectHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "AUTO_REJECT");
    const manualLegalHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "FLAG_MANUAL_LEGAL");
    const allowButYellowHits = hitRows.filter((row) => (row.action ?? "").toUpperCase() === "ALLOW_BUT_YELLOW");
    const confirmedHits = hitRows.filter((row) => (row.severity ?? "").toUpperCase() === "CONFIRMED");

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
      manualLegalHits.length > 0 ||
      allowButYellowHits.length > 0 ||
      confirmedHits.length > 0 ||
      warningChecks.length > 0
    ) {
      classification = "yellow";
      reasonSummary = "Manual review recommended.";
      reasonCodes = uniq([
        ...manualLegalHits.map(() => "FLAG_MANUAL_LEGAL"),
        ...allowButYellowHits.map(() => "ALLOW_BUT_YELLOW"),
        ...confirmedHits.map(() => "CONFIRMED_RESTRICTION"),
        ...warningChecks.map((row) => `WARNING:${row.check_type}`),
      ]);
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

    const { error: caseUpdateError } = await serviceClient
      .const mappedCaseStatus =
  classification === "green"
    ? "green_approved"
    : classification === "yellow"
      ? "yellow_review"
      : "red_rejected";

const { error: caseUpdateError } = await serviceClient
  .from("cases")
  .update({
    classification,
    ai_pipeline_status: "completed",
    status: mappedCaseStatus,
  })
  .eq("id", caseId);

    if (caseUpdateError) {
      return jsonResponse({ error: "Failed to update case classification", detail: caseUpdateError.message }, 500);
    }

    return jsonResponse({
      success: true,
      case_id: caseId,
      case_status: mappedCaseStatus,
      classification_id: insertedClassification.id,
      classification,
      reason_summary: reasonSummary,
      reason_codes: reasonCodes,
      stats: {
        check_count: checkRows.length,
        fail_count: failChecks.length,
        warning_count: warningChecks.length,
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
