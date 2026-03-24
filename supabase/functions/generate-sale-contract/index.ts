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
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "—";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Sablon: Üdülőhasználati átadási szerződés ─────────────────────────────
function buildTimeshareTransferHtml(data: ContractData): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Üdülőhasználati átadási szerződés – ${escapeHtml(data.caseNumber)}</title>
  <style>${commonCss()}</style>
</head>
<body>
  <h1>ÜDÜLŐHASZNÁLATI ÁTADÁSI SZERZŐDÉS</h1>
  <p class="subtitle">Ügyszám: ${escapeHtml(data.caseNumber)} | Kelt: ${data.today}</p>

  ${sellerSection(data)}
  ${buyerSection()}
  ${weekSection(data)}

  <h2>4. Átruházás feltételei</h2>
  <p>Eladó az üdülőhasználati jogot tehermentesen, per- és igénymentesen ruházza át a Vevőre. Eladó kijelenti, hogy az éves fenntartási díj tartozásai rendezettek.</p>
  <p>A jelen szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv rendelkezései az irányadóak.</p>
  <p>A felek a szerződést elolvasás és értelmezés után, mint akaratukkal mindenben megegyezőt, jóváhagyólag írják alá.</p>
  <p><em>A szerződés elektronikus úton jön létre. A felhasználó az elfogadás gomb megnyomásával és a szolgáltatási díj megfizetésével a szerződést kötelezőnek ismeri el.</em></p>

  ${signatureBlock(data.sellerName)}
</body>
</html>`;
}

// ── Sablon: Meghatalmazás ─────────────────────────────────────────────────
function buildPoaHtml(data: ContractData): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Meghatalmazás – ${escapeHtml(data.caseNumber)}</title>
  <style>${commonCss()}</style>
</head>
<body>
  <h1>MEGHATALMAZÁS</h1>
  <p class="subtitle">Ügyszám: ${escapeHtml(data.caseNumber)} | Kelt: ${data.today}</p>

  <h2>Meghatalmazó</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>${escapeHtml(data.sellerName)}</dd>
    <dt>Személyi ig. szám:</dt><dd>${escapeHtml(data.sellerIdNumber)}</dd>
    <dt>Lakcím:</dt><dd>${escapeHtml(data.sellerBillingAddress)}</dd>
    <dt>Születési hely, idő:</dt><dd>${escapeHtml(data.sellerBirthPlace)}, ${escapeHtml(data.sellerBirthDate)}</dd>
    <dt>Anyja neve:</dt><dd>${escapeHtml(data.sellerMotherName)}</dd>
  </dl>

  <h2>Meghatalmazott</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>Timeshare Ease Kft.</dd>
    <dt>Székhely:</dt><dd>Budapest, Példa utca 1.</dd>
  </dl>

  <h2>Meghatalmazás tárgya</h2>
  <p>A meghatalmazó felhatalmazza a meghatalmazottat, hogy nevében és javára az alábbi üdülőhasználati jog átruházásával kapcsolatos valamennyi hatósági, közigazgatási és jogi cselekményt elvégezze:</p>
  <p><strong>Üdülőhely:</strong> ${escapeHtml(data.resortName)} | <strong>Hét:</strong> ${escapeHtml(String(data.weekNumber))} | <strong>Típus:</strong> ${escapeHtml(data.unitType)}</p>

  ${signatureBlock(data.sellerName)}
</body>
</html>`;
}

// ── Sablon: Részvény adásvételi szerződés (csak Abbázia) ──────────────────
function buildShareTransferHtml(data: ContractData): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Részvény adásvételi szerződés – ${escapeHtml(data.caseNumber)}</title>
  <style>${commonCss()}</style>
</head>
<body>
  <h1>RÉSZVÉNY ADÁSVÉTELI SZERZŐDÉS</h1>
  <p class="subtitle">Ügyszám: ${escapeHtml(data.caseNumber)} | Kelt: ${data.today}</p>

  ${sellerSection(data)}
  ${buyerSection()}

  <h2>3. Részvény adatok</h2>
  <dl class="info-grid">
    <dt>Részvénysorozat:</dt><dd>${escapeHtml(data.shareSeries)}</dd>
    <dt>Részvény darabszám:</dt><dd>${escapeHtml(String(data.shareCount ?? "—"))}</dd>
    <dt>Névérték:</dt><dd>${escapeHtml(String(data.nominalValue ?? "—"))} HUF</dd>
    <dt>ISIN:</dt><dd>${escapeHtml(data.isin)}</dd>
    <dt>Értékpapírszámla:</dt><dd>${escapeHtml(data.securitiesAccountId)}</dd>
    <dt>Értékpapírszámla-vezető:</dt><dd>${escapeHtml(data.securitiesAccountProvider)}</dd>
  </dl>

  <p>Eladó az összes fenti részvényt tehermentesen, per- és igénymentesen ruházza át a Vevőre a jelen szerződés aláírásával.</p>

  ${signatureBlock(data.sellerName)}
</body>
</html>`;
}

// ── Sablon: Értékpapír transzfer nyilatkozat (csak Abbázia) ───────────────
function buildSecuritiesTransferHtml(data: ContractData): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Értékpapír transzfer nyilatkozat – ${escapeHtml(data.caseNumber)}</title>
  <style>${commonCss()}</style>
</head>
<body>
  <h1>ÉRTÉKPAPÍR TRANSZFER NYILATKOZAT</h1>
  <p class="subtitle">Ügyszám: ${escapeHtml(data.caseNumber)} | Kelt: ${data.today}</p>

  <h2>Átadó adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>${escapeHtml(data.sellerName)}</dd>
    <dt>Személyi ig. szám:</dt><dd>${escapeHtml(data.sellerIdNumber)}</dd>
    <dt>Értékpapírszámla:</dt><dd>${escapeHtml(data.securitiesAccountId)}</dd>
    <dt>Értékpapírszámla-vezető:</dt><dd>${escapeHtml(data.securitiesAccountProvider)}</dd>
  </dl>

  <h2>Átvevő adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>Timeshare Ease Kft.</dd>
    <dt>Székhely:</dt><dd>Budapest, Példa utca 1.</dd>
  </dl>

  <h2>Átruházott értékpapírok</h2>
  <dl class="info-grid">
    <dt>ISIN:</dt><dd>${escapeHtml(data.isin)}</dd>
    <dt>Darabszám:</dt><dd>${escapeHtml(String(data.shareCount ?? "—"))}</dd>
    <dt>Névérték:</dt><dd>${escapeHtml(String(data.nominalValue ?? "—"))} HUF</dd>
  </dl>

  <p>Alulírott Átadó kijelentem, hogy a fenti értékpapírokat szabadon és tehermentesen adom át az Átvevőnek.</p>

  ${signatureBlock(data.sellerName)}
</body>
</html>`;
}

// ── Közös segédfüggvények ─────────────────────────────────────────────────

interface ContractData {
  caseNumber: string;
  today: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  sellerIdNumber: string;
  sellerTaxId: string;
  sellerBillingName: string;
  sellerBillingAddress: string;
  sellerBirthDate: string;
  sellerBirthPlace: string;
  sellerMotherName: string;
  resortName: string;
  weekNumber: number | null;
  unitType: string;
  seasonLabel: string;
  rightsStartYear: number | null;
  rightsEndYear: number | null;
  isFixedWeek: boolean;
  // Abbázia-specifikus
  shareSeries: string;
  shareCount: number | null;
  nominalValue: number | null;
  isin: string;
  securitiesAccountId: string;
  securitiesAccountProvider: string;
}

function commonCss(): string {
  return `
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 24px; }
    dl.info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 2px 12px; margin: 8px 0; }
    dt { font-weight: 600; font-size: 13px; }
    dd { margin: 0 0 6px; font-size: 13px; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .sig-line { width: 240px; text-align: center; }
    .sig-line hr { border: none; border-top: 1px solid #222; margin-bottom: 4px; }
    .sig-line p { font-size: 12px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
    th { background: #f5f5f5; }
  `;
}

function sellerSection(data: ContractData): string {
  return `
  <h2>1. Eladó adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>${escapeHtml(data.sellerName)}</dd>
    <dt>Számlázási név:</dt><dd>${escapeHtml(data.sellerBillingName)}</dd>
    <dt>Lakcím:</dt><dd>${escapeHtml(data.sellerBillingAddress)}</dd>
    <dt>Email:</dt><dd>${escapeHtml(data.sellerEmail)}</dd>
    <dt>Telefon:</dt><dd>${escapeHtml(data.sellerPhone)}</dd>
    <dt>Személyi ig. szám:</dt><dd>${escapeHtml(data.sellerIdNumber)}</dd>
    <dt>Adóazonosító:</dt><dd>${escapeHtml(data.sellerTaxId)}</dd>
    <dt>Születési hely, idő:</dt><dd>${escapeHtml(data.sellerBirthPlace)}, ${escapeHtml(data.sellerBirthDate)}</dd>
    <dt>Anyja neve:</dt><dd>${escapeHtml(data.sellerMotherName)}</dd>
  </dl>`;
}

function buyerSection(): string {
  return `
  <h2>2. Vevő adatai</h2>
  <dl class="info-grid">
    <dt>Név:</dt><dd>Timeshare Ease Kft.</dd>
    <dt>Székhely:</dt><dd>Budapest, Példa utca 1.</dd>
    <dt>Cégjegyzékszám:</dt><dd>01-09-000000</dd>
    <dt>Adószám:</dt><dd>00000000-0-00</dd>
  </dl>`;
}

function weekSection(data: ContractData): string {
  return `
  <h2>3. Üdülési jog adatai</h2>
  <dl class="info-grid">
    <dt>Üdülőhely:</dt><dd>${escapeHtml(data.resortName)}</dd>
    <dt>Hét száma:</dt><dd>${data.weekNumber ?? "—"}. hét</dd>
    <dt>Apartman típus:</dt><dd>${escapeHtml(data.unitType)}</dd>
    <dt>Szezon:</dt><dd>${escapeHtml(data.seasonLabel)}</dd>
    <dt>Jogosultság időszaka:</dt><dd>${data.rightsStartYear ?? "—"} – ${data.rightsEndYear ?? "—"}</dd>
    <dt>Hét típusa:</dt><dd>${data.isFixedWeek ? "Fix hét" : "Lebegő hét"}</dd>
  </dl>`;
}

function signatureBlock(sellerName: string): string {
  return `
  <div class="signature-block">
    <div class="sig-line">
      <hr />
      <p>Eladó aláírása</p>
      <p>${escapeHtml(sellerName)}</p>
    </div>
    <div class="sig-line">
      <hr />
      <p>Vevő aláírása</p>
      <p>Timeshare Ease Kft.</p>
    </div>
  </div>`;
}

// ── Fő handler ────────────────────────────────────────────────────────────

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
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin ellenőrzés
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", claimsData.user.id).single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden – admin only" }, 403);
    }

    const body = await req.json();
    const { case_id } = body;

    if (!case_id) {
      return jsonResponse({ error: "Missing case_id" }, 400);
    }

    // ── Adatok betöltése ──────────────────────────────────────────────────

    const { data: caseData, error: caseErr } = await serviceClient.from("cases").select("*").eq("id", case_id).single();

    if (caseErr || !caseData) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", caseData.seller_user_id)
      .single();

    const { data: sellerDetails } = await serviceClient
      .from("seller_profiles")
      .select("id_number, tax_id, billing_name, billing_address, birth_date, birth_place, mother_name")
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

    let resortName = weekOffer?.resort_name_raw ?? "—";
    if (weekOffer?.resort_id) {
      const { data: resort } = await serviceClient
        .from("resorts")
        .select("name")
        .eq("id", weekOffer.resort_id)
        .maybeSingle();
      if (resort?.name) resortName = resort.name;
    }

    // Abbázia-e?
    const isAbbazia = !!(weekOffer?.share_related && abbaziaShares);

    // ── ContractData összeállítása ────────────────────────────────────────

    const contractData: ContractData = {
      caseNumber: caseData.case_number,
      today: formatDateHu(new Date().toISOString()),
      sellerName: sellerProfile?.full_name ?? sellerDetails?.billing_name ?? "—",
      sellerEmail: sellerProfile?.email ?? "—",
      sellerPhone: sellerProfile?.phone ?? "—",
      sellerIdNumber: sellerDetails?.id_number ?? "—",
      sellerTaxId: sellerDetails?.tax_id ?? "—",
      sellerBillingName: sellerDetails?.billing_name ?? sellerProfile?.full_name ?? "—",
      sellerBillingAddress: sellerDetails?.billing_address ?? "—",
      sellerBirthDate: formatDateHu(sellerDetails?.birth_date),
      sellerBirthPlace: sellerDetails?.birth_place ?? "—",
      sellerMotherName: sellerDetails?.mother_name ?? "—",
      resortName,
      weekNumber: weekOffer?.week_number ?? null,
      unitType: weekOffer?.unit_type ?? "—",
      seasonLabel: weekOffer?.season_label ?? "—",
      rightsStartYear: weekOffer?.rights_start_year ?? null,
      rightsEndYear: weekOffer?.rights_end_year ?? null,
      isFixedWeek: weekOffer?.is_fixed_week ?? false,
      shareSeries: abbaziaShares?.share_series ?? "—",
      shareCount: abbaziaShares?.share_count ?? null,
      nominalValue: abbaziaShares?.nominal_value ?? null,
      isin: abbaziaShares?.isin ?? "—",
      securitiesAccountId: abbaziaShares?.securities_account_id ?? "—",
      securitiesAccountProvider: abbaziaShares?.securities_account_provider ?? "—",
    };

    // ── Szerződések listája ───────────────────────────────────────────────
    // Nem-Abbázia: 2 db, Abbázia: 4 db

    const contractsToGenerate: Array<{ type: string; html: string; fileName: string }> = [
      {
        type: "timeshare_transfer",
        html: buildTimeshareTransferHtml(contractData),
        fileName: `timeshare-transfer-${caseData.case_number}.html`,
      },
      {
        type: "power_of_attorney",
        html: buildPoaHtml(contractData),
        fileName: `power-of-attorney-${caseData.case_number}.html`,
      },
    ];

    if (isAbbazia) {
      contractsToGenerate.push(
        {
          type: "share_transfer",
          html: buildShareTransferHtml(contractData),
          fileName: `share-transfer-${caseData.case_number}.html`,
        },
        {
          type: "securities_transfer",
          html: buildSecuritiesTransferHtml(contractData),
          fileName: `securities-transfer-${caseData.case_number}.html`,
        },
      );
    }

    // ── Feltöltés és contracts rekordok mentése ───────────────────────────

    const bucket = "generated-contracts";
    const now = new Date().toISOString();
    const generatedContracts: Array<{ type: string; path: string }> = [];

    for (const contract of contractsToGenerate) {
      const storagePath = `cases/${case_id}/contracts/generated/${contract.fileName}`;

      const blob = new Blob([contract.html], { type: "text/html; charset=utf-8" });
      const { error: uploadErr } = await serviceClient.storage.from(bucket).upload(storagePath, blob, {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });

      if (uploadErr) {
        console.error(`Storage upload error for ${contract.type}:`, uploadErr);
        return jsonResponse(
          {
            error: `Failed to upload ${contract.type}`,
            detail: uploadErr.message,
          },
          500,
        );
      }

      // Contracts rekord upsert
      const { data: existing } = await serviceClient
        .from("contracts")
        .select("id")
        .eq("case_id", case_id)
        .eq("contract_type", contract.type)
        .maybeSingle();

      if (existing) {
        await serviceClient
          .from("contracts")
          .update({
            status: "generated",
            generated_storage_bucket: bucket,
            generated_storage_path: storagePath,
            generated_file_name: contract.fileName,
            generated_at: now,
          })
          .eq("id", existing.id);
      } else {
        await serviceClient.from("contracts").insert({
          case_id,
          contract_type: contract.type,
          status: "generated",
          generated_storage_bucket: bucket,
          generated_storage_path: storagePath,
          generated_file_name: contract.fileName,
          generated_at: now,
        });
      }

      generatedContracts.push({ type: contract.type, path: storagePath });
    }

    // ── Case státusz frissítése ───────────────────────────────────────────
    // contract_generated → seller letölthet és aláírhat

    await serviceClient.from("cases").update({ status: "contract_generated" }).eq("id", case_id);

    // ── Audit log ─────────────────────────────────────────────────────────

    await serviceClient.from("audit_logs").insert({
      entity_type: "cases",
      entity_id: case_id,
      action: "contracts_generated",
      performed_by_user_id: claimsData.user.id,
      source: "edge_function",
      new_data: {
        is_abbazia: isAbbazia,
        contract_count: contractsToGenerate.length,
        contracts: generatedContracts,
      },
    });

    return jsonResponse({
      success: true,
      is_abbazia: isAbbazia,
      contract_count: contractsToGenerate.length,
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
    );
  }
});
