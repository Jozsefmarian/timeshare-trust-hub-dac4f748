import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://timeshareease.hu",
  "https://www.timeshareease.hu",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
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

type WeekAsset = {
  id: string;
  week_number: number | null;
  rights_end_year: number | null;
  rights_start_year: number | null;
  status: string;
  usage_frequency: string | null;
  usage_parity: string | null;
};

/**
 * Eldönti, hogy egy adott évben kell-e generálni inventory-t
 * az asset usage_frequency és usage_parity beállítása alapján.
 */
function shouldGenerateForYear(
  asset: WeekAsset,
  year: number,
): boolean {
  // Ha nincs usage_frequency, annual-nak vesszük
  const frequency = asset.usage_frequency ?? "annual";

  if (frequency === "annual") return true;

  if (frequency === "biennial") {
    const parity = asset.usage_parity;
    if (!parity) return true; // ha nincs megadva, minden évben generál
    if (parity === "even") return year % 2 === 0;
    if (parity === "odd") return year % 2 !== 0;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  try {
    // 1. Auth — csak admin vagy service role hívhatja
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const isServiceRole =
      authHeader === `Bearer ${serviceRoleKey}` ||
      req.headers.get("apikey") === serviceRoleKey;

    if (!isServiceRole) {
      // User token → admin ellenőrzés
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, req);
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const serviceClient = createClient(supabaseUrl, serviceRoleKey);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await authClient.auth.getUser(token);
      if (userError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, req);
      }

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        return jsonResponse({ error: "Forbidden – admin only" }, 403, req);
      }
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Body — opcionális paraméterek
    let targetYear: number;
    let generateNextYear: boolean;

    try {
      const body = await req.json();
      targetYear = body?.year ?? new Date().getFullYear();
      generateNextYear = body?.generate_next_year ?? false;
    } catch {
      targetYear = new Date().getFullYear();
      generateNextYear = false;
    }

    const yearsToGenerate = generateNextYear
      ? [targetYear, targetYear + 1]
      : [targetYear];

    // 3. Összes aktív week_asset betöltése
    const { data: assets, error: assetsError } = await serviceClient
      .from("week_assets")
      .select("id, week_number, rights_end_year, rights_start_year, status, usage_frequency, usage_parity")
      .eq("status", "active");

    if (assetsError) {
      return jsonResponse({
        error: "Failed to load week_assets",
        detail: assetsError.message,
      }, 500, req);
    }

    const weekAssets = (assets ?? []) as WeekAsset[];

    // 4. Statisztikák
    const stats = {
      assets_processed: 0,
      assets_archived: 0,
      inventory_created: 0,
      inventory_skipped: 0,
      errors: 0,
    };

    // 5. Végigmegyünk minden asseten
    for (const asset of weekAssets) {
      stats.assets_processed++;

      // Ha nincs hét száma, kihagyjuk
      if (!asset.week_number) {
        console.warn(`Asset ${asset.id} has no week_number, skipping`);
        continue;
      }

      for (const year of yearsToGenerate) {
        // Lejárt asset → archiválás, nem generálunk tovább
        if (asset.rights_end_year && year > asset.rights_end_year) {
          // Csak egyszer archiváljuk (az első év iterációjánál)
          if (year === yearsToGenerate[0]) {
            const { error: archiveError } = await serviceClient
              .from("week_assets")
              .update({ status: "archived" })
              .eq("id", asset.id);

            if (archiveError) {
              console.error(`Failed to archive asset ${asset.id}:`, archiveError);
              stats.errors++;
            } else {
              stats.assets_archived++;
            }
          }
          continue;
        }

        // Jogosultság még nem kezdődött el
        if (asset.rights_start_year && year < asset.rights_start_year) {
          continue;
        }

        // Biennial logika — kihagyjuk ha nem kell generálni
        if (!shouldGenerateForYear(asset, year)) {
          stats.inventory_skipped++;
          continue;
        }

        // Ellenőrizzük, hogy már létezik-e rekord
        const { data: existing, error: existingError } = await serviceClient
          .from("yearly_inventory")
          .select("id")
          .eq("week_asset_id", asset.id)
          .eq("inventory_year", year)
          .eq("week_number", asset.week_number)
          .maybeSingle();

        if (existingError) {
          console.error(`Failed to check existing inventory for asset ${asset.id}, year ${year}:`, existingError);
          stats.errors++;
          continue;
        }

        if (existing) {
          // Már létezik, kihagyjuk
          stats.inventory_skipped++;
          continue;
        }

        // Új yearly_inventory rekord létrehozása
        const { error: insertError } = await serviceClient
          .from("yearly_inventory")
          .insert({
            week_asset_id: asset.id,
            inventory_year: year,
            week_number: asset.week_number,
            availability_status: "available",
            release_status: "closed", // admin nyitja meg publikáláshoz
            generated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Failed to insert inventory for asset ${asset.id}, year ${year}:`, insertError);
          stats.errors++;
        } else {
          stats.inventory_created++;
        }
      }
    }

    // 6. Audit log
    await serviceClient.from("audit_logs").insert({
      entity_type: "yearly_inventory",
      entity_id: null,
      action: "inventory_generated",
      performed_by_user_id: null,
      source: "edge_function",
      new_data: {
        target_year: targetYear,
        years_generated: yearsToGenerate,
        stats,
      },
    });

    return jsonResponse({
      success: true,
      target_year: targetYear,
      years_generated: yearsToGenerate,
      stats,
    }, 200, req);

  } catch (err) {
    console.error("generate-yearly-inventory unhandled error:", err);
    return jsonResponse({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, 500, req);
  }
});
