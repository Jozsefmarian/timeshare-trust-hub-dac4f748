import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://timeshare-trust-hub.lovable.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com");
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Missing environment variables" }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { case_id } = body;
    if (!case_id || typeof case_id !== "string") {
      return jsonResponse({ error: "Missing required field: case_id" }, 400);
    }

    const { data: caseRow, error: caseError } = await authClient
      .from("cases")
      .select("id, status, seller_user_id, ai_pipeline_status, recheck_count")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) return jsonResponse({ error: "Failed to load case", detail: caseError.message }, 500);
    if (!caseRow) return jsonResponse({ error: "Case not found or access denied" }, 404);
    if (caseRow.seller_user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);

    const currentRecheckCount = (caseRow as any).recheck_count ?? 0;
    const MAX_RECHECK = 3;

    // Ha a recheck limit mar teljesult, adjuk vissza a recheck_limit_reached valaszt.
    // A frontend CorrectionPanel kezeli ezt - ManualReviewPanel-t mutat.
    if (currentRecheckCount > MAX_RECHECK) {
      return jsonResponse({
        success: false,
        recheck_limit_reached: true,
        case_id,
        recheck_count: currentRecheckCount,
        max_recheck: MAX_RECHECK,
      });
    }

    // Engedelyezett statuszok: azok ahol a seller meg a javitasi agon van
    // VAGY ahol a recheck mar lefutott es az ugy elore ment (pl. contract_generated),
    // de a seller oldal meg nem frissult - ilyenkor a recheck_already_done valaszt adjuk.
    const sellerCorrectionStatuses = ["docs_uploaded", "submitted", "yellow_review"];
    const alreadyForwardStatuses = [
      "green_approved",
      "contract_generated",
      "awaiting_signed_contract",
      "signed_contract_uploaded",
      "service_agreement_accepted",
      "payment_pending",
      "paid",
      "closed",
    ];

    if (alreadyForwardStatuses.includes(caseRow.status)) {
      // Az ugy mar elore ment - a seller oldal nem frissult meg.
      // Visszaadjuk az aktualis statuszt, hogy a frontend frissiteni tudjon.
      return jsonResponse({
        success: false,
        recheck_already_done: true,
        case_id,
        current_status: caseRow.status,
        message: "Az ugy mar sikeresen feldolgozva, a szerzodes elkeszult.",
      });
    }

    if (!sellerCorrectionStatuses.includes(caseRow.status)) {
      return jsonResponse(
        { error: "Recheck not allowed from current status", detail: `Current status: ${caseRow.status}` },
        409,
      );
    }

    // Regi AI eredmenyek torlese
    const { error: checkDeleteError } = await serviceClient.from("check_results").delete().eq("case_id", case_id);
    if (checkDeleteError) {
      return jsonResponse({ error: "Failed to invalidate old check results", detail: checkDeleteError.message }, 500);
    }

    const { error: hitsDeleteError } = await serviceClient
      .from("case_restriction_hits")
      .delete()
      .eq("case_id", case_id);
    if (hitsDeleteError) {
      return jsonResponse({ error: "Failed to invalidate old restriction hits", detail: hitsDeleteError.message }, 500);
    }

    const { error: classDeleteError } = await serviceClient.from("classifications").delete().eq("case_id", case_id);
    if (classDeleteError) {
      return jsonResponse({ error: "Failed to invalidate old classifications", detail: classDeleteError.message }, 500);
    }

    const newRecheckCount = currentRecheckCount + 1;

    const { error: caseResetError } = await serviceClient
      .from("cases")
      .update({
        ai_pipeline_status: "queued",
        classification: null,
        recheck_count: newRecheckCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", case_id);

    if (caseResetError) {
      return jsonResponse({ error: "Failed to reset case AI status", detail: caseResetError.message }, 500);
    }

    const { data: docs, error: docsError } = await serviceClient
      .from("documents")
      .select("id")
      .eq("case_id", case_id)
      .eq("upload_status", "uploaded");

    if (docsError) return jsonResponse({ error: "Failed to load documents", detail: docsError.message }, 500);
    if (!docs || docs.length === 0) return jsonResponse({ error: "No uploaded documents found for recheck" }, 400);

    await serviceClient
      .from("documents")
      .update({ ai_status: "queued", ocr_status: "pending", parse_status: "pending", validation_status: "pending" })
      .eq("case_id", case_id)
      .eq("upload_status", "uploaded");

    const { data: publishedPolicy } = await serviceClient
      .from("policy_versions")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const jobResults: Array<{ doc_id: string; job_id: string; status: string }> = [];

    for (const doc of docs) {
      const { data: newJob, error: jobError } = await serviceClient
        .from("ai_validation_jobs")
        .insert({
          case_id,
          document_id: doc.id,
          policy_version_id: publishedPolicy?.id ?? null,
          job_type: "process_document",
          status: "queued",
          input_payload: { trigger: "recheck_case", document_id: doc.id, case_id, recheck_count: newRecheckCount },
        })
        .select("id")
        .single();

      if (jobError || !newJob) {
        console.error("Failed to create AI job for doc:", doc.id, jobError);
        jobResults.push({ doc_id: doc.id, job_id: "", status: "job_creation_failed" });
        continue;
      }

      await serviceClient.from("documents").update({ last_ai_job_id: newJob.id }).eq("id", doc.id);

      fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: serviceRoleKey },
        body: JSON.stringify({ job_id: newJob.id }),
      }).catch((err) => {
        console.error("process-document fire-and-forget error for job:", newJob.id, err);
      });

      jobResults.push({ doc_id: doc.id, job_id: newJob.id, status: "queued" });
    }

    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "recheck_requested",
      performed_by_user_id: user.id,
      source: "edge_function",
      new_data: { document_count: docs.length, job_results: jobResults, recheck_count: newRecheckCount },
    });

    const reachedLimit = newRecheckCount >= MAX_RECHECK;

    if (reachedLimit) {
      await serviceClient.from("audit_logs").insert({
        entity_type: "cases",
        entity_id: case_id,
        action: "recheck_limit_reached",
        performed_by_user_id: user.id,
        source: "edge_function",
        new_data: { recheck_count: newRecheckCount, max_recheck: MAX_RECHECK, note: "status_set_by_classify_case" },
      });
    }

    return jsonResponse({
      success: true,
      case_id,
      document_count: docs.length,
      jobs: jobResults,
      recheck_count: newRecheckCount,
      recheck_limit_reached: reachedLimit,
    });
  } catch (err) {
    console.error("recheck-case unhandled error:", err);
    return jsonResponse(
      { error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});
