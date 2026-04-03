import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Native Web Crypto HMAC-SHA256 Stripe signature verification
// (stripe.webhooks.constructEvent crashes Deno with Deno.core.runMicrotasks() is not supported)
async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts: Record<string, string[]> = {};
  for (const part of signatureHeader.split(",")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);
    if (!parts[key]) parts[key] = [];
    parts[key].push(value);
  }

  const timestamp = parts["t"]?.[0];
  const v1Signatures = parts["v1"] ?? [];

  if (!timestamp || v1Signatures.length === 0) {
    console.error("Missing timestamp or v1 signatures in Stripe-Signature header");
    return false;
  }

  // Timestamp tolerance: 5 minutes
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > tolerance) {
    console.error("Stripe webhook timestamp too old:", timestamp, "now:", now);
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hmacBuffer = await crypto.subtle.sign("HMAC", keyMaterial, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(hmacBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return v1Signatures.some((sig) => sig === expectedSig);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeWebhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return jsonResponse({ error: "Stripe webhook not configured" }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return jsonResponse({ error: "Missing stripe-signature header" }, 400);
    }

    const body = await req.text();

    const isValid = await verifyStripeSignature(body, signature, stripeWebhookSecret);
    if (!isValid) {
      console.error("Stripe signature verification failed");
      return jsonResponse({ error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(body);
    console.log("Stripe event type:", event.type);

    if (event.type !== "payment_intent.succeeded" && event.type !== "checkout.session.completed") {
      return jsonResponse({ received: true, handled: false, event_type: event.type });
    }

    let caseId: string | null = null;
    let stripeSessionId: string | null = null;
    let stripePaymentIntentId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      caseId = session.metadata?.case_id ?? null;
      stripeSessionId = session.id;
      stripePaymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      stripePaymentIntentId = pi.id;
      // payment_intent.succeeded esetén a case_id-t a payments táblából keressük
      const { data: paymentRow } = await serviceClient
        .from("payments")
        .select("case_id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle();
      caseId = paymentRow?.case_id ?? null;
    }

    if (!caseId) {
      console.error("No case_id found for event", event.type);
      return jsonResponse({ error: "No case_id resolved" }, 400);
    }

    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      console.error("Case not found:", caseId);
      return jsonResponse({ error: "Case not found" }, 404);
    }

    if (caseRow.status === "paid" || caseRow.status === "closed") {
      console.log("Already processed:", caseId);
      return jsonResponse({ received: true, handled: false, reason: "Already processed" });
    }

    const paidAt = new Date().toISOString();

    // Payment rekord frissítése (ha van session ID alapján)
    if (stripeSessionId) {
      const { error: paymentUpdateError } = await serviceClient
        .from("payments")
        .update({
          status: "paid",
          paid_at: paidAt,
          stripe_payment_intent_id: stripePaymentIntentId,
          raw_payload: event.data.object,
        })
        .eq("stripe_checkout_session_id", stripeSessionId);

      if (paymentUpdateError) {
        console.error("Failed to update payment record:", paymentUpdateError);
      }
    }

    // Case → paid
    const { error: caseUpdateError } = await serviceClient
      .from("cases")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", caseId);

    if (caseUpdateError) {
      console.error("Failed to update case to paid:", caseUpdateError);
      return jsonResponse({ error: "Failed to update case" }, 500);
    }

    // Audit log
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

    // close-case-and-create-asset meghívása
    try {
      const closeResponse = await fetch(`${supabaseUrl}/functions/v1/close-case-and-create-asset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ case_id: caseId }),
      });

      if (!closeResponse.ok) {
        const text = await closeResponse.text();
        console.error("close-case-and-create-asset failed:", text);
      } else {
        console.log("Case closed and asset created for:", caseId);
      }
    } catch (closeErr) {
      console.error("close-case-and-create-asset invoke error:", closeErr);
    }

    return jsonResponse({ received: true, handled: true, case_id: caseId });
  } catch (err) {
    console.error("stripe-webhook unhandled error:", err);
    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
