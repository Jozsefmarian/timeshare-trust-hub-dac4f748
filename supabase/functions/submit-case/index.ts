import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type SubmitClassification = "green" | "yellow" | "red";

function mapClassificationToStatus(classification: SubmitClassification) {
  if (classification === "green") return "green_approved";
  if (classification === "yellow") return "yellow_review";
  return "red_rejected";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: "Missing env variables" }, 500);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const caseId = body?.case_id ?? null;
    if (!caseId || typeof caseId !== "string") return jsonResponse({ error: "Missing required field: case_id" }, 400);

    // 1) Case betöltése
    const { data: caseRow, error: caseError } = await authClient
      .from("cases")
      .select("id, case_number, seller_user_id, status, submitted_at, classification, ai_pipeline_status, seller_profile_id")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) return jsonResponse({ error: "Failed to load case", detail: caseError.message }, 500);
    if (!caseRow) return jsonResponse({ error: "Case not found or access denied" }, 404);
    if (caseRow.seller_user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);
    if (caseRow.submitted_at) return jsonResponse({ error: "Case already submitted", case_id: caseRow.id, submitted_at: caseRow.submitted_at, status: caseRow.status }, 409);

    const allowedSourceStatuses = ["draft", "submitted", "docs_uploaded"];
    if (!allowedSourceStatuses.includes(caseRow.status)) return jsonResponse({ error: "Case cannot be submitted from current status", detail: `Current status: ${caseRow.status}` }, 409);
    if (!caseRow.seller_profile_id) return jsonResponse({ error: "Missing seller profile" }, 400);

    // 2) Week offer
    const { data: weekOffer, error: weekOfferError } = await authClient.from("week_offers").select("id").eq("case_id", caseId).limit(1).maybeSingle();
    if (weekOfferError) return jsonResponse({ error: "Failed to load week offer", detail: weekOfferError.message }, 500);
    if (!weekOffer) return jsonResponse({ error: "Missing week offer" }, 400);

    // 3) Feltöltött dokumentumok
    const { data: uploadedDocs, error: docsError } = await authClient.from("documents").select("id, document_type, upload_status").eq("case_id", caseId).eq("upload_status", "uploaded");
    if (docsError) return jsonResponse({ error: "Failed to load documents", detail: docsError.message }, 500);
    if (!uploadedDocs || uploadedDocs.length === 0) return jsonResponse({ error: "Missing uploaded documents" }, 400);

    // 4) AI pipeline kész?
    if (caseRow.ai_pipeline_status !== "completed") return jsonResponse({ error: "AI pipeline not completed", detail: `Current ai_pipeline_status: ${caseRow.ai_pipeline_status ?? "null"}` }, 409);

    const classification = caseRow.classification as SubmitClassification | null;
    if (!classification || !["green", "yellow", "red"].includes(classification)) return jsonResponse({ error: "Missing classification" }, 409);

    const targetStatus = mapClassificationToStatus(classification);
    const submittedAt = new Date().toISOString();

    // 5) Submit update
    const { data: updatedCase, error: updateError } = await serviceClient
      .from("cases")
      .update({ submitted_at: submittedAt, status: targetStatus })
      .eq("id", caseId)
      .select("id, case_number, status, submitted_at, classification, ai_pipeline_status")
      .single();

    if (updateError) return jsonResponse({ error: "Failed to submit case", detail: updateError.message }, 500);

    // 6) Audit log — await nélkul, hiba esetén csak logol
    serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: caseId,
      action: "submit_case",
      performed_by_user_id: user.id,
      source: "edge_function",
      old_data: { status: caseRow.status, submitted_at: caseRow.submitted_at, classification: caseRow.classification },
      new_data: { status: targetStatus, submitted_at: submittedAt, classification },
    }).then(({ error: auditError }: { error: any }) => {
      if (auditError) console.error("submit-case audit log insert failed:", auditError);
    });

    // 7) Zöld esetén: automatikus szerződésgeneralás (fire-and-forget)
    if (classification === "green") {
      console.log(`Green classification: auto-triggering generate-sale-contract for case ${caseId}`);
      fetch(`${supabaseUrl}/functions/v1/generate-sale-contract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ case_id: caseId }),
      }).then(async (r: Response) => {
        if (!r.ok) {
          const errText = await r.text().catch(() => "?");
          console.error(`generate-sale-contract auto-call failed (${r.status}): ${errText}`);
        } else {
          console.log(`generate-sale-contract auto-call succeeded for case ${caseId}`);
        }
      }).catch((err: Error) => {
        console.error("generate-sale-contract auto-call error:", err.message);
      });
    }

    return jsonResponse({
      success: true,
      case_id: updatedCase.id,
      case_number: updatedCase.case_number,
      classification,
      previous_status: caseRow.status,
      new_status: updatedCase.status,
      submitted_at: updatedCase.submitted_at,
      uploaded_document_count: uploadedDocs.length,
    });

  } catch (err) {
    console.error("submit-case unhandled error:", err);
    return jsonResponse({ error: "submit-case failed", detail: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

