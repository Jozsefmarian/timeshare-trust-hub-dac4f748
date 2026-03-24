import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe not configured" }, 500, req);
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
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    // 2. Body validálás
    const body = await req.json();
    const { case_id } = body;

    if (!case_id || typeof case_id !== "string") {
      return jsonResponse({ error: "Missing required field: case_id" }, 400, req);
    }

    // 3. Case betöltése és jogosultság ellenőrzés
    const { data: caseRow, error: caseError } = await authClient
      .from("cases")
      .select("id, case_number, status, seller_user_id")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError || !caseRow) {
      return jsonResponse({ error: "Case not found or access denied" }, 404, req);
    }

    if (caseRow.seller_user_id !== user.id) {
      return jsonResponse({ error: "Forbidden" }, 403, req);
    }

    if (caseRow.status !== "service_agreement_accepted") {
      return jsonResponse(
        {
          error: "Payment can only be initiated after service agreement acceptance",
          detail: `Current status: ${caseRow.status}`,
        },
        409,
        req,
      );
    }

    // 4. Seller adatok betöltése
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // 5. Stripe checkout session létrehozása
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    // Visszairányítási URL-ek
    const origin = req.headers.get("Origin") ?? "https://timeshareease.hu";
    const successUrl = `${origin}/seller/cases/${case_id}?payment=success`;
    const cancelUrl = `${origin}/seller/cases/${case_id}?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: sellerProfile?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: `TimeshareEase szolgáltatási díj – ${caseRow.case_number}`,
              description: "Üdülési jog átruházási szolgáltatás díja",
            },
            unit_amount: 9900000, // 99 000 HUF (fillérek: 99000 * 100)
          },
          quantity: 1,
        },
      ],
      metadata: {
        case_id,
        case_number: caseRow.case_number,
        seller_user_id: user.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 6. Payments rekord létrehozása
    const { error: paymentInsertError } = await serviceClient.from("payments").insert({
      case_id,
      payment_type: "service_fee",
      stripe_checkout_session_id: session.id,
      amount: 99000,
      currency: "HUF",
      status: "pending",
    });

    if (paymentInsertError) {
      console.error("Failed to insert payment record:", paymentInsertError);
    }

    // 7. Case státusz frissítése
    await serviceClient.from("cases").update({ status: "payment_pending" }).eq("id", case_id);

    // 8. Audit log
    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "stripe_checkout_created",
      performed_by_user_id: user.id,
      source: "edge_function",
      new_data: {
        stripe_session_id: session.id,
        amount: 99000,
        currency: "HUF",
      },
    });

    return jsonResponse(
      {
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      },
      200,
      req,
    );
  } catch (err) {
    console.error("create-stripe-checkout unhandled error:", err);
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
