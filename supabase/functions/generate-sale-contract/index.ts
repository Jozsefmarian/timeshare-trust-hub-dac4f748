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

function formatDateHu(dateStr: string | null | undefined): string {
  if (!dateStr) return "u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "u2014";
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function convertHtmlToPdf(html: string, pdfShiftKey: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${pdfShiftKey}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: true,
        margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("PDFShift error:", response.status, err);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.error("PDFShift conversion error:", err);
    return null;
  }
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "u2014";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureFullHtml(html: string): string {
  const trimmed = html.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    return html;
  }
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 20px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    p, li { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td, th { padding: 4px 8px; border: 1px solid #ddd; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

function applyTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return result;
}

function fallbackHtml(contractType: string, vars: Record<string, string>): string {
  const titles: Record<string, string> = {
    timeshare_transfer: "u00dcDu00dcLu0150HASZNu00c1LATI u00c1TADu00c1SI SZERZu0150Du00c9S",
    power_of_attorney: "MEGHATALMAZÁS",
    share_transfer: "Ru00c9SZVu00c9NY ADu00c1SVu00c9TELI SZERZu0150Du00c9S",
    securities_transfer: "u00c9RTu00c9KPAPu00cdR TRANSZFER NYILATKOZAT",
  };
  const title = titles[contractType] ?? contractType.toUpperCase();
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${title} u2013 ${escapeHtml(vars.case_number)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 24px; }
    dl.info-grid { display: grid; grid-template-columns: 220px 1fr; gap: 2px 12px; margin: 8px 0; }
    dt { font-weight: 600; font-size: 13px; }
    dd { margin: 0 0 6px; font-size: 13px; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .sig-line { width: 240px; text-align: center; }
    .sig-line hr { border: none; border-top: 1px solid #222; margin-bottom: 4px; }
    .sig-line p { font-size: 12px; margin: 2px 0; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="warning">u26a0ufe0f Figyelem: ehhez a szerzu0151du00e9stu00edpushoz (${escapeHtml(contractType)}) mu00e9g nincs aktu00edv sablon feltu00f6ltve az admin felu00fcleten. Ez egy automatikusan generu00e1lt alapdokumentum.</div>
  <h1>${title}</h1>
  <p class="subtitle">u00dcgyszu00e1m: ${escapeHtml(vars.case_number)} | Kelt: ${escapeHtml(vars.generation_date)}</p>

  <h2>1. Eladu00f3 adatai</h2>
  <dl class="info-grid">
    <dt>Nu00e9v:</dt><dd>${escapeHtml(vars.seller_name)}</dd>
    <dt>Szu00fcletu00e9si nu00e9v:</dt><dd>${escapeHtml(vars.seller_birth_name)}</dd>
    <dt>Lakcu00edm:</dt><dd>${escapeHtml(vars.seller_address)}</dd>
    <dt>Szemu00e9lyi ig. szu00e1m:</dt><dd>${escapeHtml(vars.seller_id_number)}</dd>
    <dt>Adu00f3azonosu00edtu00f3:</dt><dd>${escapeHtml(vars.seller_tax_id)}</dd>
    <dt>Szu00fcletu00e9si hely, idu0151:</dt><dd>${escapeHtml(vars.seller_birth_place)}, ${escapeHtml(vars.seller_birth_date)}</dd>
    <dt>Anyja neve:</dt><dd>${escapeHtml(vars.seller_mother_name)}</dd>
  </dl>

  <h2>2. Vevu0151 adatai</h2>
  <dl class="info-grid">
    <dt>Nu00e9v:</dt><dd>${escapeHtml(vars.buyer_name)}</dd>
    <dt>Szu00e9khely:</dt><dd>${escapeHtml(vars.buyer_address)}</dd>
    <dt>Cu00e9gjegyzu00e9kszu00e1m:</dt><dd>${escapeHtml(vars.buyer_company_number)}</dd>
    <dt>Adu00f3szu00e1m:</dt><dd>${escapeHtml(vars.buyer_tax_number)}</dd>
    <dt>Ku00e9pviselu0151:</dt><dd>${escapeHtml(vars.buyer_representative)}</dd>
  </dl>

  <h2>3. u00dcdulu00e9si jog adatai</h2>
  <dl class="info-grid">
    <dt>u00dcdulu0151hely:</dt><dd>${escapeHtml(vars.resort_name)}</dd>
    <dt>Hu00e9t szu00e1ma:</dt><dd>${escapeHtml(vars.week_number)}. hu00e9t</dd>
    <dt>Apartman tu00edpus:</dt><dd>${escapeHtml(vars.unit_type)}</dd>
    <dt>Apartman/egysu00e9g szu00e1ma:</dt><dd>${escapeHtml(vars.unit_number)}</dd>
    <dt>Férőhely (max. fő):</dt><dd>${escapeHtml(vars.capacity)} fő</dd>
    <dt>Szezon:</dt><dd>${escapeHtml(vars.season_label)}</dd>
    <dt>Jogosultsu00e1g idu0151szaka:</dt><dd>${escapeHtml(vars.rights_start_year)} u2013 ${escapeHtml(vars.rights_end_year)}</dd>
    <dt>Eredeti szerz. sorzu00e1ma:</dt><dd>${escapeHtml(vars.original_contract_number)}</dd>
    <dt>Tu00e1rgyu00e9vi fenntartu00e1si du00edj:</dt><dd>${escapeHtml(vars.annual_fee)} HUF</dd>
  </dl>

  <div class="signature-block">
    <div class="sig-line">
      <hr />
      <p>Eladu00f3 alu00e1u00edru00e1sa</p>
      <p>${escapeHtml(vars.seller_name)}</p>
    </div>
    <div class="sig-line">
      <hr />
      <p>Vevu0151 alu00e1u00edru00e1sa</p>
      <p>${escapeHtml(vars.buyer_name)}</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", claimsData.user.id).single();
    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden u2013 admin only" }, 403, req);
    }

    const body = await req.json();
    const { case_id } = body;
    if (!case_id) {
      return jsonResponse({ error: "Missing case_id" }, 400, req);
    }

    const { data: caseData, error: caseErr } = await serviceClient.from("cases").select("*").eq("id", case_id).single();
    if (caseErr || !caseData) {
      return jsonResponse({ error: "Case not found" }, 404, req);
    }

    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", caseData.seller_user_id)
      .single();

    const { data: sellerDetails } = await serviceClient
      .from("seller_profiles")
      .select("id_number, tax_id, billing_name, billing_address, birth_date, birth_place, birth_name, mother_name")
      .eq("user_id", caseData.seller_user_id)
      .maybeSingle();

    const { data: weekOffer } = await serviceClient
      .from("week_offers")
      .select("*")
      .eq("case_id", case_id)
      .maybeSingle();

    const { data: abbaziaShares } = await serviceClient
      .from("abbazia_shares")
      .select("*")
      .eq("case_id", case_id)
      .maybeSingle();

    // Resort nu00e9v normalizu00e1lu00e1s
    let resortName = weekOffer?.resort_name_raw ?? "u2014";
    if (weekOffer?.resort_id) {
      const { data: resort } = await serviceClient
        .from("resorts")
        .select("name")
        .eq("id", weekOffer.resort_id)
        .maybeSingle();
      if (resort?.name) resortName = resort.name;
    }

    // Policy settings (cu00e9ges adatok)
    const { data: policyRows } = await serviceClient
      .from("policy_settings")
      .select("setting_key, setting_value")
      .eq("policy_version_id", caseData.policy_version_id_applied ?? "")
      .in("setting_key", ["buyer_name", "buyer_address", "buyer_company_number", "buyer_tax_number", "buyer_representative", "contact_email"]);

    let policySettings: Record<string, string> = {};
    if (!policyRows || policyRows.length === 0) {
      const { data: publishedPolicy } = await serviceClient
        .from("policy_versions")
        .select("id")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (publishedPolicy) {
        const { data: fallbackRows } = await serviceClient
          .from("policy_settings")
          .select("setting_key, setting_value")
          .eq("policy_version_id", publishedPolicy.id)
          .in("setting_key", ["buyer_name", "buyer_address", "buyer_company_number", "buyer_tax_number", "buyer_representative", "contact_email"]);

        for (const row of fallbackRows ?? []) {
          const val = row.setting_value;
          policySettings[row.setting_key] = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val ?? "");
        }
      }
    } else {
      for (const row of policyRows) {
        const val = row.setting_value;
        policySettings[row.setting_key] = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val ?? "");
      }
    }

    const isAbbazia = !!(weekOffer?.share_related && abbaziaShares);

    const vars: Record<string, string> = {
      // Cu00e9ges adatok (vevu0151)
      buyer_name: policySettings["buyer_name"] ?? "u2014",
      buyer_address: policySettings["buyer_address"] ?? "u2014",
      buyer_company_number: policySettings["buyer_company_number"] ?? "u2014",
      buyer_tax_number: policySettings["buyer_tax_number"] ?? "u2014",
      buyer_representative: policySettings["buyer_representative"] ?? "u2014",
      contact_email: policySettings["contact_email"] ?? "u2014",

      // Eladu00f3 adatok
      seller_name: sellerDetails?.billing_name ?? sellerProfile?.full_name ?? "u2014",
      seller_address: sellerDetails?.billing_address ?? "u2014",
      seller_birth_date: formatDateHu(sellerDetails?.birth_date),
      seller_birth_place: sellerDetails?.birth_place ?? "u2014",
      seller_birth_name: (sellerDetails as any)?.birth_name ?? "u2014",
      seller_mother_name: sellerDetails?.mother_name ?? "u2014",
      seller_id_number: sellerDetails?.id_number ?? "u2014",
      seller_tax_id: sellerDetails?.tax_id ?? "u2014",

      // u00dcdulu00e9si jog adatok
      resort_name: resortName,
      week_number: String(weekOffer?.week_number ?? "u2014"),
      unit_type: weekOffer?.unit_type ?? "u2014",
      unit_number: (weekOffer as any)?.unit_number ?? "u2014",
      capacity: weekOffer?.capacity != null ? String(weekOffer.capacity) : "—",
      season_label: weekOffer?.season_label ?? "u2014",
      rights_start_year: String(weekOffer?.rights_start_year ?? "u2014"),
      rights_end_year: String(weekOffer?.rights_end_year ?? "u2014"),
      original_contract_number: (weekOffer as any)?.original_contract_number ?? "u2014",
      annual_fee: weekOffer?.annual_fee ? String(weekOffer.annual_fee) : "u2014",

      // Abbu00e1zia-specifikus
      share_count: String(abbaziaShares?.share_count ?? "u2014"),
      share_series: abbaziaShares?.share_series ?? "u2014",
      nominal_value: abbaziaShares?.nominal_value ? String(abbaziaShares.nominal_value) : "u2014",
      isin: abbaziaShares?.isin ?? "u2014",
      securities_account_provider: abbaziaShares?.securities_account_provider ?? "u2014",
      securities_account_id: abbaziaShares?.securities_account_id ?? "u2014",
      issuer_name: (abbaziaShares as any)?.issuer_name ?? "u2014",
      client_number: (abbaziaShares as any)?.client_number ?? "u2014",

      // Meta
      case_number: caseData.case_number,
      generation_date: formatDateHu(new Date().toISOString()),
    };

    const contractTypes = ["timeshare_transfer", "power_of_attorney"];
    if (isAbbazia) {
      contractTypes.push("share_transfer", "securities_transfer");
    }

    const { data: templates, error: templatesError } = await serviceClient
      .from("contract_templates" as any)
      .select("contract_type, html_content, title, version")
      .in("contract_type", contractTypes)
      .eq("is_active", true);

    if (templatesError) {
      console.error("Failed to load contract templates:", templatesError.message);
    } else {
      console.log(`Loaded ${templates?.length ?? 0} active templates`);
    }

    const templateMap: Record<string, string> = {};
    for (const t of templates ?? []) {
      templateMap[t.contract_type] = t.html_content;
    }

    const bucket = "generated-contracts";
    const now = new Date().toISOString();
    const generatedContracts: Array<{ type: string; path: string }> = [];
    const pdfShiftKey = Deno.env.get("PDFSHIFT_API_KEY") ?? "";

    for (const contractType of contractTypes) {
      const rawTemplate = templateMap[contractType];
      const html = rawTemplate ? applyTemplate(rawTemplate, vars) : fallbackHtml(contractType, vars);
      const fullHtml = ensureFullHtml(html);

      const pdfBytes = pdfShiftKey ? await convertHtmlToPdf(fullHtml, pdfShiftKey) : null;
      const usePdf = pdfBytes !== null;
      const fileName = `${contractType}-${caseData.case_number}.${usePdf ? "pdf" : "html"}`;
      const storagePath = `cases/${case_id}/contracts/generated/${fileName}`;
      const contentType = usePdf ? "application/pdf" : "text/html; charset=utf-8";
      const fileContent = usePdf ? pdfBytes : new Blob([html], { type: contentType });

      console.log(`${contractType}: ${usePdf ? "PDF generu00e1lva" : "HTML fallback (PDFShift nem elu00e9rhetu0151)"}`);

      const { error: uploadErr } = await serviceClient.storage.from(bucket).upload(storagePath, fileContent, {
        contentType,
        upsert: true,
      });

      if (uploadErr) {
        console.error(`Storage upload error for ${contractType}:`, uploadErr);
        return jsonResponse({ error: `Failed to upload ${contractType}`, detail: uploadErr.message }, 500);
      }

      const { data: existing } = await serviceClient
        .from("contracts")
        .select("id")
        .eq("case_id", case_id)
        .eq("contract_type", contractType)
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
        await serviceClient.from("contracts").insert({
          case_id,
          contract_type: contractType,
          status: "generated",
          generated_storage_bucket: bucket,
          generated_storage_path: storagePath,
          generated_file_name: fileName,
          generated_at: now,
        });
      }

      generatedContracts.push({ type: contractType, path: storagePath });
    }

    await serviceClient
      .from("cases")
      .update({ status: "contract_generated", updated_at: new Date().toISOString() })
      .eq("id", case_id);

    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "contracts_generated",
      performed_by_user_id: claimsData.user.id,
      source: "edge_function",
      new_data: {
        is_abbazia: isAbbazia,
        contract_count: contractTypes.length,
        contracts: generatedContracts,
        used_db_templates: Object.keys(templateMap),
      },
    });

    return jsonResponse({
      success: true,
      is_abbazia: isAbbazia,
      contract_count: contractTypes.length,
      contracts: generatedContracts,
    });
  } catch (err) {
    console.error("generate-sale-contract unhandled error:", err);
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

