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
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    // 2. Parse & validate body
    const body = await req.json();
    const { case_id, typed_confirmation, checkbox_checked } = body;

    if (!case_id) {
      return jsonResponse({ error: "Missing required field: case_id" }, 400);
    }
    if (checkbox_checked !== true) {
      return jsonResponse({ error: "checkbox_checked must be true" }, 400);
    }
    if (!typed_confirmation || typeof typed_confirmation !== "string" || !typed_confirmation.trim()) {
      return jsonResponse({ error: "typed_confirmation must not be empty" }, 400);
    }

    if (typed_confirmation.trim().toUpperCase() !== "ELFOGADOM") {
      return jsonResponse({ error: "typed_confirmation must be ELFOGADOM" }, 400);
    }

    // 3. Verify case exists and belongs to seller (RLS enforces ownership)
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, status, seller_user_id")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) {
      return jsonResponse({ error: "Failed to fetch case" }, 500);
    }
    if (!caseData) {
      return jsonResponse({ error: "Case not found or access denied" }, 404);
    }
    if (caseData.seller_user_id !== userId) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // 4. Load active service agreement
    const { data: agreement, error: agError } = await supabase
      .from("service_agreements")
      .select("id, version")
      .eq("is_active", true)
      .maybeSingle();

    if (agError) {
      return jsonResponse({ error: "Failed to load service agreement" }, 500);
    }
    if (!agreement) {
      return jsonResponse({ error: "No active service agreement found" }, 404);
    }

    // 5. Build acceptance hash
    const acceptedAt = new Date().toISOString();
    const hashInput = `${case_id}|${agreement.version}|${acceptedAt}|${typed_confirmation.trim()}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const acceptanceHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 6. Extract IP and User-Agent
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // 7. Insert declaration_acceptances
    const { data: acceptance, error: insertError } = await supabase
      .from("declaration_acceptances")
      .insert({
        case_id,
        service_agreement_id: agreement.id,
        user_id: userId,
        accepted_at: acceptedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        typed_confirmation: typed_confirmation.trim(),
        checkbox_checked: true,
        acceptance_hash: acceptanceHash,
        hash_algorithm: "sha256",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResponse({ error: "Failed to record acceptance", detail: insertError.message }, 500);
    }

    // 8. Update case status (only if appropriate)
    const allowedStatuses = ["contract_preparing", "contract_generated", "signed_uploaded", "verified", "submitted"];

    let newStatus = caseData.status;
    if (allowedStatuses.includes(caseData.status)) {
      const { error: updateError } = await supabase
        .from("cases")
        .update({ status: "service_agreement_accepted" })
        .eq("id", case_id);

      if (updateError) {
        console.error("Case status update error:", updateError);
      } else {
        newStatus = "service_agreement_accepted";
      }
    }

    // 9. Audit log (use service client to bypass RLS)
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await serviceClient.from("audit_logs").insert({
      action: "service_agreement_accepted",
      entity_type: "declaration_acceptances",
      entity_id: acceptance.id,
      performed_by_user_id: userId,
      source: "edge_function",
      new_data: {
        case_id,
        service_agreement_id: agreement.id,
        service_agreement_version: agreement.version,
        acceptance_hash: acceptanceHash,
      },
    });

    // 10. Return
    return jsonResponse(
      {
        success: true,
        acceptance_id: acceptance.id,
        case_status: newStatus,
        service_agreement_version: agreement.version,
      },
      200,
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
