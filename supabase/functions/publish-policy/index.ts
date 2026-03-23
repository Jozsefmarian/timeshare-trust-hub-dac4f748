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

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401, req);
    }

    // 2. Admin ellenőrzés
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden – admin only" }, 403, req);
    }

    // 3. Body validálás
    const body = await req.json();
    const { policy_version_id } = body;

    if (!policy_version_id || typeof policy_version_id !== "string") {
      return jsonResponse({ error: "Missing required field: policy_version_id" }, 400, req);
    }

    // 4. Publikálandó policy betöltése
    const { data: targetPolicy, error: targetError } = await serviceClient
      .from("policy_versions")
      .select("id, name, version, status")
      .eq("id", policy_version_id)
      .maybeSingle();

    if (targetError) {
      return jsonResponse({ error: "Failed to load policy", detail: targetError.message }, 500, req);
    }

    if (!targetPolicy) {
      return jsonResponse({ error: "Policy not found" }, 404, req);
    }

    if (targetPolicy.status !== "draft") {
      return jsonResponse({
        error: "Only draft policies can be published",
        detail: `Current status: ${targetPolicy.status}`,
      }, 409, req);
    }

    const publishedAt = new Date().toISOString();

    // 5. Jelenlegi published policy → archived
    const { data: currentPublished } = await serviceClient
      .from("policy_versions")
      .select("id, name, version")
      .eq("status", "published")
      .maybeSingle();

    if (currentPublished) {
      const { error: archiveError } = await serviceClient
        .from("policy_versions")
        .update({
          status: "archived",
          updated_at: publishedAt,
        })
        .eq("id", currentPublished.id);

      if (archiveError) {
        return jsonResponse({
          error: "Failed to archive current policy",
          detail: archiveError.message,
        }, 500, req);
      }

      // Audit log az archiváláshoz
      await serviceClient.from("audit_logs").insert({
        entity_type: "policy_versions",
        entity_id: currentPublished.id,
        action: "policy_archived",
        performed_by_user_id: user.id,
        source: "admin",
        old_data: { status: "published" },
        new_data: { status: "archived" },
      });
    }

    // 6. Új policy → published
    const { error: publishError } = await serviceClient
      .from("policy_versions")
      .update({
        status: "published",
        published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq("id", policy_version_id);

    if (publishError) {
      return jsonResponse({
        error: "Failed to publish policy",
        detail: publishError.message,
      }, 500, req);
    }

    // 7. Audit log a publikáláshoz
    await serviceClient.from("audit_logs").insert({
      entity_type: "policy_versions",
      entity_id: policy_version_id,
      action: "policy_published",
      performed_by_user_id: user.id,
      source: "admin",
      old_data: { status: "draft" },
      new_data: {
        status: "published",
        published_at: publishedAt,
      },
    });

    return jsonResponse({
      success: true,
      published_policy: {
        id: policy_version_id,
        name: targetPolicy.name,
        version: targetPolicy.version,
        published_at: publishedAt,
      },
      archived_policy: currentPublished
        ? { id: currentPublished.id, name: currentPublished.name, version: currentPublished.version }
        : null,
    }, 200, req);

  } catch (err) {
    console.error("publish-policy unhandled error:", err);
    return jsonResponse({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : "Unknown error",
    }, 500, req);
  }
});
