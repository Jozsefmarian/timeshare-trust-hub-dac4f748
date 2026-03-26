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

// ── Resend email küldés ────────────────────────────────────────────────────────

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  resendApiKey: string;
  fromName?: string;
}): Promise<void> {
  const { to, subject, html, resendApiKey, fromName = "TSR Megoldások" } = params;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <kapcsolat@tsrmegoldasok.hu>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    // Nem dobjuk el a fő folyamatot ha az email sikertelen
  }
}

// ── Email sablonok ────────────────────────────────────────────────────────────

function buildGreenEmailHtml(params: {
  sellerName: string;
  caseNumber: string;
  magicLink: string;
  contactEmail: string;
}): string {
  const { sellerName, caseNumber, magicLink, contactEmail } = params;
  return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6;">
  <h2 style="color: #1a7a4a;">✅ Az ügy dokumentumai rendben vannak</h2>
  <p>Kedves ${sellerName}!</p>
  <p>Örömmel értesítjük, hogy a <strong>${caseNumber}</strong> számú ügyének dokumentumait átvizsgáltuk és minden rendben van.</p>
  <p>Az adásvételi szerződések elkészültek. A szerződések megtekintéséhez, aláírásához és visszatöltéséhez kérjük, kattintson az alábbi gombra:</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${magicLink}" 
       style="background-color: #1a7a4a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Szerződések megtekintése →
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">Ha a gomb nem működik, másolja be ezt a linket a böngészőbe:<br>
    <a href="${magicLink}" style="color: #1a7a4a;">${magicLink}</a>
  </p>
  <p style="font-size: 13px; color: #666;">A link 24 óráig érvényes. Ha kérdése van, írjon nekünk: 
    <a href="mailto:${contactEmail}" style="color: #1a7a4a;">${contactEmail}</a>
  </p>
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #999;">TSR Megoldások — Zaleo Consulting Kft.</p>
</body>
</html>`;
}

function buildRedEmailHtml(params: {
  sellerName: string;
  caseNumber: string;
  reason: string;
  contactEmail: string;
}): string {
  const { sellerName, caseNumber, reason, contactEmail } = params;
  return `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6;">
  <h2 style="color: #c0392b;">❌ Tájékoztatás az ügy elbírálásáról</h2>
  <p>Kedves ${sellerName}!</p>
  <p>Sajnálattal értesítjük, hogy a <strong>${caseNumber}</strong> számú ügyét az elvégzett vizsgálat alapján nem tudjuk elfogadni.</p>
  <div style="background: #fdf2f2; border: 1px solid #f5c6cb; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px;"><strong>Indoklás:</strong><br>${reason}</p>
  </div>
  <p>Ha kérdése van, vagy további tájékoztatást szeretne, kérjük, vegye fel velünk a kapcsolatot:</p>
  <p>
    📧 <a href="mailto:${contactEmail}" style="color: #c0392b;">${contactEmail}</a>
  </p>
  <p>Köszönjük megértését.</p>
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #999;">TSR Megoldások — Zaleo Consulting Kft.</p>
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
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://timeshareease.hu";

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
      return jsonResponse({ error: "Invalid classification. Must be: green | yellow | red" }, 400, req);
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return jsonResponse({ error: "Missing required field: reason (indoklás kötelező)" }, 400, req);
    }

    // 4. Case betöltése
    const { data: caseRow, error: caseError } = await serviceClient
      .from("cases")
      .select("id, case_number, status, classification, seller_user_id")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) {
      return jsonResponse({ error: "Failed to load case", detail: caseError.message }, 500, req);
    }

    if (!caseRow) {
      return jsonResponse({ error: "Case not found" }, 404, req);
    }

    // 5. Seller adatok betöltése (emailhez)
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", caseRow.seller_user_id)
      .maybeSingle();

    // 6. Policy settings betöltése (contact_email)
    const { data: publishedPolicy } = await serviceClient
      .from("policy_versions")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let contactEmail = "kapcsolat@tsrmegoldasok.hu";
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

    // 7. Új classification rekord mentése
    const { data: newClassification, error: classInsertError } = await serviceClient
      .from("classifications")
      .insert({
        case_id,
        classification,
        reason_summary: reason.trim(),
        reason_codes: ["ADMIN_OVERRIDE"],
        created_by: "admin",
        policy_version_id: publishedPolicy?.id ?? null,
      })
      .select("id")
      .single();

    if (classInsertError) {
      return jsonResponse({ error: "Failed to insert classification", detail: classInsertError.message }, 500, req);
    }

    // 8. Case státusz és classification frissítése
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
      return jsonResponse({ error: "Failed to update case", detail: caseUpdateError.message }, 500, req);
    }

    // 9. Audit log
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

    // 10. Zöld: szerződésgenerálás + email magic linkkel
    if (classification === "green") {
      // Szerződésgenerálás automatikusan
      try {
        await serviceClient.functions.invoke("generate-sale-contract", {
          body: { case_id },
        });
      } catch (genErr) {
        console.error("generate-sale-contract auto-invoke error:", genErr);
        // Nem blokkoló hiba — a fő folyamat folytatódik
      }

      // Magic link generálás (Supabase Auth)
      if (sellerProfile?.email && resendApiKey) {
        try {
          const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
            type: "magiclink",
            email: sellerProfile.email,
            options: {
              redirectTo: `${siteUrl}/seller/cases/${case_id}/contracts`,
            },
          });

          const magicLink = linkData?.properties?.action_link ?? `${siteUrl}/auth`;

          if (linkError) {
            console.error("Magic link generation error:", linkError);
          }

          await sendEmail({
            to: sellerProfile.email,
            subject: `✅ Szerződések elkészültek – ${caseRow.case_number}`,
            html: buildGreenEmailHtml({
              sellerName: sellerProfile.full_name ?? "Tisztelt Ügyfelünk",
              caseNumber: caseRow.case_number,
              magicLink,
              contactEmail,
            }),
            resendApiKey,
          });
        } catch (emailErr) {
          console.error("Green email send error:", emailErr);
        }
      }
    }

    // 11. Piros: értesítő email az elutasításról
    if (classification === "red") {
      if (sellerProfile?.email && resendApiKey) {
        try {
          await sendEmail({
            to: sellerProfile.email,
            subject: `Tájékoztatás az ügy elbírálásáról – ${caseRow.case_number}`,
            html: buildRedEmailHtml({
              sellerName: sellerProfile.full_name ?? "Tisztelt Ügyfelünk",
              caseNumber: caseRow.case_number,
              reason: reason.trim(),
              contactEmail,
            }),
            resendApiKey,
          });
        } catch (emailErr) {
          console.error("Red email send error:", emailErr);
        }
      }
    }

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
