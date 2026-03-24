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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    // 2. Admin ellenőrzés
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden – admin only" }, 403, req);
    }

    // 3. Body validálás
    const body = await req.json();
    const { case_id, classification, reason } = body;

    if (!case_id || typeof case_id !== "string") {
      return jsonResponse({ error: "Missing required field: case_id" }, 400, req);
    }

    if (!["green", "yellow", "red"].includes(classification)) {
      return jsonResponse(
        {
          error: "Invalid classification. Must be: green | yellow | red",
        },
        400,
        req,
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return jsonResponse(
        {
          error: "Missing required field: reason (indoklás kötelező)",
        },
        400,
        req,
      );
    }

    // 4. Case betöltése
    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, case_number, status, classification")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) {
      return jsonResponse({ error: "Failed to load case", detail: caseError.message }, 500, req);
    }

    if (!caseRow) {
      return jsonResponse({ error: "Case not found" }, 404, req);
    }

    // 5. Aktív policy verzió
    const { data: activePolicy } = await serviceClient
      .from("policy_versions")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Új classification rekord mentése
    const { data: newClassification, error: classInsertError } = await serviceClient
      .from("classifications")
      .insert({
        case_id,
        classification,
        reason_summary: reason.trim(),
        reason_codes: ["ADMIN_OVERRIDE"],
        created_by: "admin",
        policy_version_id: activePolicy?.id ?? null,
      })
      .select("id")
      .single();

    if (classInsertError) {
      return jsonResponse(
        {
          error: "Failed to insert classification",
          detail: classInsertError.message,
        },
        500,
        req,
      );
    }

    // 7. Case státusz és classification frissítése
    const statusMap: Record<string, string> = {
      green: "green_approved",
      yellow: "yellow_review",
      red: "red_rejected",
    };

    const newStatus = statusMap[classification];

    const { error: caseUpdateError } = await serviceClient
      .from("cases")
      .update({
        classification,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", case_id);

    if (caseUpdateError) {
      return jsonResponse(
        {
          error: "Failed to update case",
          detail: caseUpdateError.message,
        },
        500,
        req,
      );
    }

    // 8. Audit log — kötelező admin override esetén
    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "admin_override",
      performed_by_user_id: user.id,
      source: "admin",
      old_data: {
        classification: caseRow.classification,
        status: caseRow.status,
      },
      new_data: {
        classification,
        status: newStatus,
        reason: reason.trim(),
        classification_id: newClassification.id,
      },
    });

    return jsonResponse(
      {
        success: true,
        case_id,
        case_number: caseRow.case_number,
        previous_classification: caseRow.classification,
        new_classification: classification,
        previous_status: caseRow.status,
        new_status: newStatus,
        classification_id: newClassification.id,
      },
      200,
      req,
    );
  } catch (err) {
    console.error("admin-manual-classification unhandled error:", err);
    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      500,
      req,
    );
  }
});
