import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !stripeWebhookSecret) {
    return jsonResponse({ error: "Stripe not configured" }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });

  try {
    // 1. Stripe webhook signature ellenőrzés
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return jsonResponse({ error: "Missing stripe-signature header" }, 400);
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return jsonResponse({ error: "Invalid signature" }, 400);
    }

    // 2. Csak a payment_intent.succeeded eseményt kezeljük
    if (event.type !== "payment_intent.succeeded" &&
        event.type !== "checkout.session.completed") {
      return jsonResponse({ received: true, handled: false });
    }

    let caseId: string | null = null;
    let stripeSessionId: string | null = null;
    let stripePaymentIntentId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      caseId = session.metadata?.case_id ?? null;
      stripeSessionId = session.id;
      stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
    }

    if (!caseId) {
      console.error("No case_id in Stripe metadata");
      return jsonResponse({ error: "No case_id in metadata" }, 400);
    }

    // 3. Case betöltése
    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      console.error("Case not found:", caseId);
      return jsonResponse({ error: "Case not found" }, 404);
    }

    // Idempotency: ha már paid vagy closed, nem csinálunk semmit
    if (caseRow.status === "paid" || caseRow.status === "closed") {
      return jsonResponse({ received: true, handled: false, reason: "Already processed" });
    }

    // 4. Payment rekord frissítése
    const paidAt = new Date().toISOString();

    const { error: paymentUpdateError } = await serviceClient
      .from("payments")
      .update({
        status: "paid",
        paid_at: paidAt,
        stripe_payment_intent_id: stripePaymentIntentId,
        raw_payload: event.data.object as Record<string, unknown>,
      })
      .eq("stripe_checkout_session_id", stripeSessionId);

    if (paymentUpdateError) {
      console.error("Failed to update payment:", paymentUpdateError);
    }

    // 5. Case → paid
    const { error: caseUpdateError } = await serviceClient
      .from("cases")
      .update({ status: "paid" })
      .eq("id", caseId);

    if (caseUpdateError) {
      console.error("Failed to update case to paid:", caseUpdateError);
      return jsonResponse({ error: "Failed to update case" }, 500);
    }

    // 6. Audit log
    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: caseId,
      action: "payment_received",
      performed_by_user_id: null,
      source: "stripe_webhook",
      new_data: {
        stripe_session_id: stripeSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        paid_at: paidAt,
      },
    });

    // 7. close-case-and-create-asset meghívása
    try {
      const closeResponse = await fetch(
        `${supabaseUrl}/functions/v1/close-case-and-create-asset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({ case_id: caseId }),
        }
      );

      if (!closeResponse.ok) {
        const text = await closeResponse.text();
        console.error("close-case-and-create-asset failed:", text);
      }
    } catch (closeErr) {
      console.error("close-case-and-create-asset invoke error:", closeErr);
    }

    return jsonResponse({ received: true, handled: true, case_id: caseId });

  } catch (err) {
    console.error("stripe-webhook unhandled error:", err);
    return jsonResponse({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, 500);
  }
});
