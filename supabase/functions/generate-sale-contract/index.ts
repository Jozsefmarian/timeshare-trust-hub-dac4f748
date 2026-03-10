import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDateHu(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

function buildContractHtml(
  caseData: Record<string, unknown>,
  sellerProfile: Record<string, unknown>,
  sellerDetails: Record<string, unknown> | null,
  weekOffers: Record<string, unknown>[],
  resorts: Record<string, unknown>[],
): string {
  const caseNumber = caseData.case_number as string;
  const sellerName = (sellerProfile.full_name as string) || (sellerProfile.email as string) || "—";
  const sellerEmail = (sellerProfile.email as string) || "—";
  const sellerPhone = (sellerProfile.phone as string) || "—";
  const sellerIdNumber = (sellerDetails?.id_number as string) || "—";
  const sellerTaxId = (sellerDetails?.tax_id as string) || "—";
  const sellerBillingName = (sellerDetails?.billing_name as string) || sellerName;
  const sellerBillingAddress = (sellerDetails?.billing_address as string) || "—";
  const today = formatDateHu(new Date().toISOString());

  const weekRows = weekOffers.map((wo) => {
    const resort = resorts.find((r) => (r as any).id === wo.resort_id);
    const resortName = (resort?.name as string) || (wo.resort_name_raw as string) || "—";
    return `
      <tr>
        <td>${resortName}</td>
        <td>${wo.week_number ?? "—"}</td>
        <td>${wo.season_label ?? "—"}</td>
        <td>${wo.unit_type ?? "—"}</td>
        <td>${wo.rights_start_year ?? "—"} – ${wo.rights_end_year ?? "—"}</td>
        <td>${wo.is_fixed_week ? "Fix" : "Lebegő"}</td>
      </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Adásvételi szerződés – ${caseNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
    th { background: #f5f5f5; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
    .info-grid dt { font-weight: 600; font-size: 13px; }
    .info-grid dd { margin: 0 0 8px; font-size: 13px; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-line { width: 250px; text-align: center; }
    .signature-line hr { border: none; border-top: 1px solid #222; margin-bottom: 4px; }
    .signature-line p { font-size: 12px; margin: 0; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <h1>ADÁSVÉTELI SZERZŐDÉS</h1>
  <p style="text-align:center;font-size:13px;color:#666;">Ügyszám: ${caseNumber}</p>

  <h2>1. Eladó adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>${sellerName}</dd>
    <dt>Email:</dt><dd>${sellerEmail}</dd>
    <dt>Telefon:</dt><dd>${sellerPhone}</dd>
    <dt>Személyi ig. szám:</dt><dd>${sellerIdNumber}</dd>
    <dt>Adóazonosító:</dt><dd>${sellerTaxId}</dd>
    <dt>Számlázási név:</dt><dd>${sellerBillingName}</dd>
    <dt>Számlázási cím:</dt><dd>${sellerBillingAddress}</dd>
  </dl>

  <h2>2. Vevő / Társaság adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>Timeshare Ease Kft.</dd>
    <dt>Székhely:</dt><dd>Budapest, Példa utca 1.</dd>
    <dt>Cégjegyzékszám:</dt><dd>01-09-000000</dd>
    <dt>Adószám:</dt><dd>00000000-0-00</dd>
  </dl>

  <h2>3. Üdülési jog adatai</h2>
  ${weekOffers.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Üdülőhely</th>
        <th>Hét</th>
        <th>Szezon</th>
        <th>Szobatípus</th>
        <th>Jogosultság időszaka</th>
        <th>Típus</th>
      </tr>
    </thead>
    <tbody>
      ${weekRows}
    </tbody>
  </table>` : "<p>Nincs rögzített üdülési jog adat.</p>"}

  <h2>4. Nyilatkozatok</h2>
  <p>Eladó kijelenti, hogy az üdülési jog az ő kizárólagos tulajdonát képezi, az per-, teher- és igénymentes, harmadik személynek azon joga nem áll fenn.</p>
  <p>Eladó kijelenti, hogy az éves fenntartási díj tartozásai rendezettek.</p>
  <p>Vevő kijelenti, hogy az üdülési jogot a jelen szerződésben foglalt feltételekkel megvásárolja.</p>

  <h2>5. Záró rendelkezések</h2>
  <p>A jelen szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv rendelkezései az irányadóak.</p>
  <p>A felek a szerződést elolvasás és értelmezés után, mint akaratukkal mindenben megegyezőt, jóváhagyólag írják alá.</p>

  <p style="margin-top: 32px;"><strong>Kelt:</strong> ${today}</p>

  <div class="signature-block">
    <div class="signature-line">
      <hr />
      <p>Eladó aláírása</p>
      <p>${sellerName}</p>
    </div>
    <div class="signature-line">
      <hr />
      <p>Vevő aláírása</p>
      <p>Timeshare Ease Kft.</p>
    </div>
  </div>

  <p class="footer">Generálva: ${today} | Ügyszám: ${caseNumber}</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for storage + writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth client to verify user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Check admin
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden – admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { case_id } = body;

    if (!case_id) {
      return new Response(JSON.stringify({ error: "Missing case_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load case
    const { data: caseData, error: caseErr } = await serviceClient
      .from("cases")
      .select("*")
      .eq("id", case_id)
      .single();

    if (caseErr || !caseData) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load seller profile
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", caseData.seller_user_id)
      .single();

    // 3. Load seller details
    const { data: sellerDetails } = await serviceClient
      .from("seller_profiles")
      .select("id_number, tax_id, billing_name, billing_address")
      .eq("user_id", caseData.seller_user_id)
      .maybeSingle();

    // 4. Load week offers
    const { data: weekOffers } = await serviceClient
      .from("week_offers")
      .select("*")
      .eq("case_id", case_id);

    // 5. Load resorts for name resolution
    const resortIds = (weekOffers || []).map((wo: any) => wo.resort_id).filter(Boolean);
    let resorts: any[] = [];
    if (resortIds.length > 0) {
      const { data } = await serviceClient
        .from("resorts")
        .select("id, name")
        .in("id", resortIds);
      resorts = data || [];
    }

    // 6. Build HTML
    const html = buildContractHtml(
      caseData as any,
      sellerProfile as any || {},
      sellerDetails as any,
      (weekOffers || []) as any[],
      resorts,
    );

    // 7. Upload to storage
    const fileName = `sale-contract-${caseData.case_number}.html`;
    const storagePath = `cases/${case_id}/contracts/generated/${fileName}`;
    const bucket = "generated-contracts";

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    const { error: uploadErr } = await serviceClient.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload contract file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Upsert contracts row
    const now = new Date().toISOString();

    // Check if contract already exists
    const { data: existing } = await serviceClient
      .from("contracts")
      .select("id")
      .eq("case_id", case_id)
      .eq("contract_type", "sale_contract")
      .maybeSingle();

    if (existing) {
      await serviceClient
        .from("contracts")
        .update({
          status: "generated",
          generated_storage_bucket: bucket,
          generated_storage_path: storagePath,
          generated_file_name: fileName,
          generated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await serviceClient
        .from("contracts")
        .insert({
          case_id,
          contract_type: "sale_contract",
          status: "generated",
          generated_storage_bucket: bucket,
          generated_storage_path: storagePath,
          generated_file_name: fileName,
          generated_at: now,
        });
    }

    // 9. Update case status
    await serviceClient
      .from("cases")
      .update({ status: "contract_preparing" })
      .eq("id", case_id);

    return new Response(
      JSON.stringify({ success: true, file_name: fileName, storage_path: storagePath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
