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

    // Engedélyezett státuszok: service_agreement_accepted VAGY payment_pending
    const allowedStatuses = ["service_agreement_accepted", "payment_pending"];
    if (!allowedStatuses.includes(caseRow.status)) {
      return jsonResponse(
        {
          error: "Payment can only be initiated after service agreement acceptance",
          detail: `Current status: ${caseRow.status}`,
        },
        409,
        req,
      );
    }

    if (caseRow.status === "payment_pending") {
      const { data: existingAcceptance } = await serviceClient
        .from("declaration_acceptances")
        .select("id")
        .eq("case_id", case_id)
        .maybeSingle();

      if (!existingAcceptance) {
        return jsonResponse(
          {
            error: "Payment can only be initiated after service agreement acceptance",
            detail: "No service agreement acceptance found",
          },
          409,
          req,
        );
      }
      console.log(`Case ${case_id} is payment_pending but has acceptance record — allowing new Stripe session`);
    }

    // 4. Seller adatok betöltése
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // 5. Abbázia / részvény meghatározása az összeg kiszámításához
    // Logika: ha share_related = true ÉS van abbazia_shares rekord → 2 Ft beszámítás → 49 998 Ft
    // Egyébként: 1 Ft beszámítás → 49 999 Ft
    let isAbbazia = false;
    try {
      const { data: weekOffer } = await serviceClient
        .from("week_offers")
        .select("share_related")
        .eq("case_id", case_id)
        .maybeSingle();

      if (weekOffer?.share_related === true) {
        const { data: abbaziaShares } = await serviceClient
          .from("abbazia_shares")
          .select("id")
          .eq("case_id", case_id)
          .maybeSingle();
        isAbbazia = !!abbaziaShares;
      }
    } catch (err) {
      console.error("Abbazia check error (non-blocking):", err);
      // Ha hiba van, defaultolunk a nem-Abbáziás összegre
    }

    // Összeg meghatározása:
    // Teljes szolgáltatási díj: 50 000 Ft
    // Beszámítás (adásvételi szerz. alapján Zaleo fizet az eladónak):
    //   - Nem Abbáziás: 1 Ft → bankkártyán: 49 999 Ft
    //   - Abbáziás (részvénnyel): 2 Ft (üdülőhasználati + részvény) → bankkártyán: 49 998 Ft
    const TOTAL_SERVICE_FEE = 50000; // 50 000 Ft teljes díj
    const setoff = isAbbazia ? 2 : 1; // beszámítás összege forintban
    const amountHuf = TOTAL_SERVICE_FEE - setoff; // bankkártyán fizetendő: 49 999 vagy 49 998
    const stripeUnitAmount = amountHuf * 100; // Stripe fillér formátum

    console.log(`Payment amount: ${amountHuf} HUF (isAbbazia=${isAbbazia}, setoff=${setoff} Ft)`);

    // 6. Stripe checkout session létrehozása
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    const origin = req.headers.get("Origin") ?? "https://timeshareease.hu";
    const successUrl = `${origin}/seller/cases/${case_id}/payment?payment=success`;
    const cancelUrl = `${origin}/seller/cases/${case_id}/payment?payment=cancelled`;

    const productDescription = isAbbazia
      ? "Üdülési jog átruházási szolgáltatás díja (részvénnyel)"
      : "Üdülési jog átruházási szolgáltatás díja";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: sellerProfile?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: `TimeshareEase szolgáltatási díj – ${caseRow.case_number}`,
              description: productDescription,
            },
            unit_amount: stripeUnitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        case_id,
        case_number: caseRow.case_number,
        seller_user_id: user.id,
        is_abbazia: String(isAbbazia),
        setoff_amount: String(setoff),
        total_service_fee: String(TOTAL_SERVICE_FEE),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 7. Payments rekord létrehozása (upsert)
    const { error: paymentInsertError } = await serviceClient.from("payments").upsert(
      {
        case_id,
        payment_type: "service_fee",
        stripe_checkout_session_id: session.id,
        amount: amountHuf,
        currency: "HUF",
        status: "pending",
      },
      { onConflict: "case_id" },
    );

    if (paymentInsertError) {
      console.error("Failed to upsert payment record:", paymentInsertError);
    }

    // 8. Case státusz frissítése payment_pending-re
    await serviceClient
      .from("cases")
      .update({ status: "payment_pending", updated_at: new Date().toISOString() })
      .eq("id", case_id);

    // 9. Audit log
    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "stripe_checkout_created",
      performed_by_user_id: user.id,
      source: "edge_function",
      new_data: {
        stripe_session_id: session.id,
        amount: amountHuf,
        total_service_fee: TOTAL_SERVICE_FEE,
        setoff_amount: setoff,
        is_abbazia: isAbbazia,
        currency: "HUF",
        previous_status: caseRow.status,
      },
    });

    return jsonResponse(
      {
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        amount: amountHuf,
        is_abbazia: isAbbazia,
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
