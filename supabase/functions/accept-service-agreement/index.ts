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

function formatDateHu(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Budapest",
  });
}

// ── Resend email küldés ───────────────────────────────────────────────────────
// MEGJEGYZÉS: Az email küldés jelenleg ki van kapcsolva, mert a tsrmegoldasok.hu
// domain nincs verifikálva a Resend-en. Élesítés előtt:
// 1. Verifikáld a domaint a Resend dashboardon (resend.com/domains)
// 2. Állítsd vissza a from mezőt: "TSR Megoldások <kapcsolat@tsrmegoldasok.hu>"
// 3. Távolítsd el az EMAIL_ENABLED = false feltételt
async function sendEmail(params: { to: string; subject: string; html: string; resendApiKey: string }): Promise<void> {
  // IDEIGLENES: email küldés ki van kapcsolva fejlesztés alatt (domain nem verifikált)
  const EMAIL_ENABLED = false;
  if (!EMAIL_ENABLED) {
    console.log("Email küldés kikapcsolva fejlesztési módban. Célcím lenne:", params.to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TSR Megoldások <kapcsolat@tsrmegoldasok.hu>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    // Nem blokkoló — a fő folyamat folytatódik
  }
}

// ── Visszaigazoló email sablon ────────────────────────────────────────────────

function buildConfirmationEmailHtml(params: {
  sellerName: string;
  caseNumber: string;
  acceptedAt: string;
  ipAddress: string | null;
  acceptanceHash: string;
  agreementVersion: string;
  contactEmail: string;
}): string {
  const { sellerName, caseNumber, acceptedAt, ipAddress, acceptanceHash, agreementVersion, contactEmail } = params;

  return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6;">
  <h2 style="color: #1a4a7a;">📄 Szolgáltatási szerződés elfogadásának visszaigazolása</h2>
  <p>Kedves ${sellerName}!</p>
  <p>Visszaigazoljuk, hogy a <strong>${caseNumber}</strong> számú ügyéhez tartozó szolgáltatási szerződést sikeresen elfogadta.</p>

  <div style="background: #f0f4f8; border: 1px solid #d0dce8; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #444;">Elfogadás részletei (jogi bizonyíték)</p>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #666; width: 160px;">Elfogadás időpontja:</td>
        <td style="padding: 4px 0;"><strong>${formatDateHu(acceptedAt)}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #666;">IP cím:</td>
        <td style="padding: 4px 0;"><strong>${ipAddress ?? "—"}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #666;">Szerződés verziója:</td>
        <td style="padding: 4px 0;"><strong>${agreementVersion}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #666; vertical-align: top;">Elfogadási hash:</td>
        <td style="padding: 4px 0; word-break: break-all; font-family: monospace; font-size: 11px;">${acceptanceHash}</td>
      </tr>
    </table>
  </div>

  <p style="font-size: 13px; color: #555;">
    A szerződés elektronikus úton jött létre. Az elfogadás gomb megnyomásával és a szolgáltatási díj 
    megfizetésével a szerződés kötelező érvényűvé válik. Ez az email jogi bizonyítékként szolgál 
    az elfogadás tényéről.
  </p>

  <p style="font-size: 13px; color: #555;">
    Következő lépés: a szolgáltatási díj megfizetése, amelyről a platformon tud intézkedni.
  </p>

  <p style="font-size: 13px; color: #555;">
    Ha kérdése van, írjon nekünk: 
    <a href="mailto:${contactEmail}" style="color: #1a4a7a;">${contactEmail}</a>
  </p>

  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #999;">TSR Megoldások — Zaleo Consulting Kft. | 8864 Tótszerdahely, Kossuth Lajos u. 154.</p>
</body>
</html>`;
}

// ── Fő handler ────────────────────────────────────────────────────────────────

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    const userId = userData.user.id;

    // 2. Body validálás
    const body = await req.json();
    const { case_id, typed_confirmation, checkbox_checked } = body;

    if (!case_id) {
      return jsonResponse({ error: "Missing required field: case_id" }, 400, req);
    }
    if (checkbox_checked !== true) {
      return jsonResponse({ error: "checkbox_checked must be true" }, 400, req);
    }
    if (!typed_confirmation || typeof typed_confirmation !== "string" || !typed_confirmation.trim()) {
      return jsonResponse({ error: "typed_confirmation must not be empty" }, 400, req);
    }
    if (typed_confirmation.trim().toUpperCase() !== "ELFOGADOM") {
      return jsonResponse({ error: "typed_confirmation must be ELFOGADOM" }, 400, req);
    }

    // 3. Case ellenőrzés
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, status, seller_user_id, case_number")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) {
      return jsonResponse({ error: "Failed to fetch case" }, 500, req);
    }
    if (!caseData) {
      return jsonResponse({ error: "Case not found or access denied" }, 404, req);
    }
    if (caseData.seller_user_id !== userId) {
      return jsonResponse({ error: "Forbidden" }, 403, req);
    }

    // 4. Seller adatok — a profiles.email a helyes forrás
    //    (a seller_profiles.notes csak contact infót tartalmaz szöveges formában,
    //     a tényleges auth email a profiles táblán van)
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    // A seller email a profiles.email mezőből jön
    const sellerEmail = sellerProfile?.email ?? null;
    const sellerName = sellerProfile?.full_name ?? "Tisztelt Ügyfelünk";

    // 5. Aktív szolgáltatási szerződés
    const { data: agreement, error: agError } = await supabase
      .from("service_agreements")
      .select("id, version")
      .eq("is_active", true)
      .maybeSingle();

    if (agError) {
      return jsonResponse({ error: "Failed to load service agreement" }, 500, req);
    }
    if (!agreement) {
      return jsonResponse({ error: "No active service agreement found" }, 404, req);
    }

    // 6. Már elfogadta-e? Ha igen, sikert adunk vissza (idempotens)
    const { data: existingAcceptance } = await serviceClient
      .from("declaration_acceptances")
      .select("id")
      .eq("case_id", case_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingAcceptance) {
      console.log("Már van elfogadás rekord, idempotens visszatérés:", existingAcceptance.id);
      // Case státusz biztosan service_agreement_accepted
      await serviceClient
        .from("cases")
        .update({ status: "service_agreement_accepted", updated_at: new Date().toISOString() })
        .eq("id", case_id);
      return jsonResponse(
        {
          success: true,
          acceptance_id: existingAcceptance.id,
          case_status: "service_agreement_accepted",
          already_accepted: true,
        },
        200,
        req,
      );
    }

    // 7. Contact email a policy_settings-ből
    let contactEmail = "kapcsolat@tsrmegoldasok.hu";
    const { data: publishedPolicy } = await serviceClient
      .from("policy_versions")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (publishedPolicy) {
      const { data: contactSetting } = await serviceClient
        .from("policy_settings")
        .select("setting_value")
        .eq("policy_version_id", publishedPolicy.id)
        .eq("setting_key", "contact_email")
        .maybeSingle();

      if (contactSetting?.setting_value) {
        const val = contactSetting.setting_value;
        contactEmail = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
      }
    }

    // 8. Acceptance hash generálás
    const acceptedAt = new Date().toISOString();
    const hashInput = `${case_id}|${agreement.version}|${acceptedAt}|${typed_confirmation.trim()}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const acceptanceHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 9. IP és User-Agent
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // 10. declaration_acceptances INSERT
    const { data: acceptance, error: insertError } = await serviceClient
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
      return jsonResponse({ error: "Failed to record acceptance", detail: insertError.message }, 500, req);
    }

    // 11. Case státusz frissítése → service_agreement_accepted
    const allowedStatuses = [
      "contract_preparing",
      "contract_generated",
      "signed_uploaded",
      "signed_contract_uploaded",
      "verified",
      "submitted",
    ];

    let newStatus = caseData.status;
    if (allowedStatuses.includes(caseData.status)) {
      const { error: updateError } = await serviceClient
        .from("cases")
        .update({ status: "service_agreement_accepted", updated_at: new Date().toISOString() })
        .eq("id", case_id);

      if (updateError) {
        console.error("Case status update error:", updateError);
      } else {
        newStatus = "service_agreement_accepted";
      }
    }

    // 12. confirmation_sent_at frissítése + audit log
    const confirmationSentAt = new Date().toISOString();

    await serviceClient
      .from("declaration_acceptances")
      .update({ confirmation_sent_at: confirmationSentAt })
      .eq("id", acceptance.id);

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
        ip_address: ipAddress,
        seller_email: sellerEmail,
      },
    });

    // 13. Visszaigazoló email küldése (Resend)
    // FONTOS: Az email küldés jelenleg ki van kapcsolva, mert a tsrmegoldasok.hu domain
    // nincs verifikálva a Resend-en. A sendEmail() függvényen belül van az EMAIL_ENABLED flag.
    // Élesítés előtt: domain verifikálás Resend-en, majd EMAIL_ENABLED = true.
    if (sellerEmail && resendApiKey) {
      try {
        await sendEmail({
          to: sellerEmail,
          subject: `📄 Szolgáltatási szerződés visszaigazolása – ${caseData.case_number}`,
          html: buildConfirmationEmailHtml({
            sellerName,
            caseNumber: caseData.case_number,
            acceptedAt,
            ipAddress,
            acceptanceHash,
            agreementVersion: agreement.version,
            contactEmail,
          }),
          resendApiKey,
        });
      } catch (emailErr) {
        console.error("Confirmation email send error:", emailErr);
        // Nem blokkoló hiba — az elfogadás sikeres, email küldés opcionális
      }
    }

    return jsonResponse(
      {
        success: true,
        acceptance_id: acceptance.id,
        case_status: newStatus,
        service_agreement_version: agreement.version,
      },
      200,
      req,
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse({ error: "Internal server error", detail: err instanceof Error ? err.message : "Unknown" }, 500, req);
  }
});

