import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const authClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  {
    global: { headers: { Authorization: authHeader } },
  }
);

    const token = authHeader.replace("Bearer ", "");

const {
  data: { user },
  error: userError,
} = await authClient.auth.getUser(token);

if (userError || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

    // 2. Parse input
    const body = await req.json();
    const { document_id } = body;

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: document_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Fetch document — RLS ensures seller can only see own documents
    const { data: doc, error: docError } = await authClient
      .from("documents")
      .select("id, case_id, seller_user_id, storage_bucket, storage_path, upload_status")
      .eq("id", document_id)
      .maybeSingle();

    if (docError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch document" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!doc) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Verify the document is in 'initiated' state
    if (doc.upload_status !== "initiated") {
      return new Response(
        JSON.stringify({
          error: `Document upload_status is '${doc.upload_status}', expected 'initiated'`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Verify the file actually exists in storage
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract folder path and filename from storage_path
    const pathParts = doc.storage_path.split("/");
    const fileName = pathParts.pop()!;
    const folderPath = pathParts.join("/");

    const { data: files, error: listError } = await serviceClient.storage
      .from(doc.storage_bucket)
      .list(folderPath, { search: fileName, limit: 1 });

    if (listError) {
      console.error("Storage list error:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to verify file in storage" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fileExists = files && files.some((f) => f.name === fileName);

    if (!fileExists) {
      return new Response(
        JSON.stringify({
          error: "File not found in storage at the expected path",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Update document status
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await serviceClient
  .from("documents")
  .update({
    upload_status: "uploaded",
    uploaded_at: now,
  })
      .eq("id", document_id)
      .select(
        "id, case_id, storage_bucket, storage_path, original_file_name, upload_status, uploaded_at, mime_type, file_size_bytes"
      )
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to confirm document upload",
          detail: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Start AI validation pipeline (fire-and-forget via service client)
    try {
      await startDocumentValidation(serviceClient, document_id, doc.case_id);
    } catch (valErr) {
      // Log but don't fail the confirm endpoint
      console.error("AI validation error (non-blocking):", valErr);
    }

    // 8. Return
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

// ---------- AI Validation Pipeline (placeholder) ----------

async function startDocumentValidation(
  serviceClient: ReturnType<typeof createClient>,
  documentId: string,
  caseId: string
) {
  // 1. Set document ai_status to processing
  await serviceClient
    .from("documents")
    .update({ ai_status: "processing" })
    .eq("id", documentId);

  // 2. Create validation result row
  const { data: valRow, error: insertErr } = await serviceClient
    .from("ai_validation_results")
    .insert({
      document_id: documentId,
      case_id: caseId,
      validation_status: "processing",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Failed to create ai_validation_results row:", insertErr);
    throw insertErr;
  }

  // 3. Simulate validation (placeholder – will be replaced by real AI call)
  const fieldMatchScore = Math.round(70 + Math.random() * 30); // 70-100

  // 4. Update validation result
  await serviceClient
    .from("ai_validation_results")
    .update({
      validation_status: "completed",
      field_match_score: fieldMatchScore,
      keyword_flags: {},
      notes: "AI validation placeholder",
    })
    .eq("id", valRow.id);

  // 5. Update document ai_status
  await serviceClient
    .from("documents")
    .update({ ai_status: "completed" })
    .eq("id", documentId);
}
