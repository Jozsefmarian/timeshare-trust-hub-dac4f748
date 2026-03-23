import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isInternalRequest(req: Request, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization");
  const apikey = req.headers.get("apikey");
  return (
    authHeader === `Bearer ${serviceRoleKey}` ||
    apikey === serviceRoleKey
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Csak belső hívás engedélyezett (stripe-webhook hívja)
    if (!isInternalRequest(req, serviceRoleKey)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { case_id } = body;

    if (!case_id || typeof case_id !== "string") {
      return jsonResponse({ error: "Missing required field: case_id" }, 400);
    }

    // 1. Case betöltése
    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, case_number, status, seller_user_id")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError || !caseRow) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

    if (caseRow.status !== "paid") {
      return jsonResponse({
        error: "Case must be in paid status",
        detail: `Current status: ${caseRow.status}`,
      }, 409);
    }

    // 2. Week offer betöltése
    const { data: weekOffer, error: weekError } = await serviceClient
      .from("week_offers")
      .select("*")
      .eq("case_id", case_id)
      .maybeSingle();

    if (weekError || !weekOffer) {
      return jsonResponse({ error: "Week offer not found" }, 404);
    }

    // 3. Week asset létrehozása
    const { data: newAsset, error: assetError } = await serviceClient
      .from("week_assets")
      .insert({
        source_case_id: case_id,
        resort_id: weekOffer.resort_id ?? null,
        week_number: weekOffer.week_number ?? null,
        season_label: weekOffer.season_label ?? null,
        unit_type: weekOffer.unit_type ?? null,
        is_fixed_week: weekOffer.is_fixed_week ?? false,
        share_related: weekOffer.share_related ?? false,
        share_count: weekOffer.share_count ?? null,
        rights_start_year: weekOffer.rights_start_year ?? null,
        rights_end_year: weekOffer.rights_end_year ?? null,
        acquisition_date: new Date().toISOString().split("T")[0],
        status: "active",
      })
      .select("id")
      .single();

    if (assetError) {
      console.error("Failed to create week_asset:", assetError);
      return jsonResponse({
        error: "Failed to create week asset",
        detail: assetError.message,
      }, 500);
    }

    // 4. Case lezárása
    const { error: closeError } = await serviceClient
      .from("cases")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", case_id);

    if (closeError) {
      return jsonResponse({
        error: "Failed to close case",
        detail: closeError.message,
      }, 500);
    }

    // 5. Audit log
    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "case_closed",
      performed_by_user_id: null,
      source: "edge_function",
      new_data: {
        week_asset_id: newAsset.id,
        closed_at: new Date().toISOString(),
      },
    });

    return jsonResponse({
      success: true,
      case_id,
      week_asset_id: newAsset.id,
      status: "closed",
    });

  } catch (err) {
    console.error("close-case-and-create-asset unhandled error:", err);
    return jsonResponse({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, 500);
  }
});
