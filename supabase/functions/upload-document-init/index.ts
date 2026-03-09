import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 200);
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
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // 2. Parse & validate input
    const body = await req.json();
    const { case_id, document_type_id, file_name, mime_type, file_size_bytes } =
      body;

    if (!case_id || !document_type_id || !file_name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: case_id, document_type_id, file_name",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Verify user owns the case (RLS will also enforce this, but explicit check gives better error)
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, seller_user_id")
      .eq("id", case_id)
      .maybeSingle();

    if (caseError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify case ownership" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!caseRow) {
      return new Response(
        JSON.stringify({ error: "Case not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Validate document type exists and is active
    const { data: docType, error: docTypeError } = await supabase
      .from("document_types")
      .select("id, code")
      .eq("id", document_type_id)
      .eq("is_active", true)
      .maybeSingle();

    if (docTypeError || !docType) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive document type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Generate safe storage path
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file_name);
    const storagePath = `cases/${case_id}/documents/${docType.code}/${timestamp}-${sanitized}`;
    const storageBucket = "case-documents";

    // 6. Insert documents row using new columns as source of truth
    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({
        case_id,
        seller_user_id: userId,
        document_type_id,
        // Legacy column still required (NOT NULL) — use the type code
        document_type: docType.code,
        original_file_name: file_name,
        // Legacy columns — keep in sync
        file_name: file_name,
        file_path: storagePath,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        mime_type: mime_type || null,
        file_size_bytes: file_size_bytes || null,
        file_size: file_size_bytes || null,
        upload_status: "initiated",
        review_status: "pending",
        ai_status: "pending",
        uploaded_by_user_id: userId,
      })
      .select(
        "id, storage_bucket, storage_path, original_file_name, upload_status"
      )
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to create document record",
          detail: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Return
    return new Response(
      JSON.stringify({
        document_id: doc.id,
        storage_bucket: doc.storage_bucket,
        storage_path: doc.storage_path,
        original_file_name: doc.original_file_name,
        upload_status: doc.upload_status,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
