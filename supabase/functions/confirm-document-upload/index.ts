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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 2. Input
    const body = await req.json();
    const { document_id } = body;

    if (!document_id) {
      return new Response(JSON.stringify({ error: "Missing required field: document_id" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 3. Clients
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 4. Load document through auth client (seller can only confirm own doc)
    const { data: doc, error: docError } = await authClient
      .from("documents")
      .select(
        `
        id,
        case_id,
        seller_user_id,
        document_type,
        storage_bucket,
        storage_path,
        upload_status
      `,
      )
      .eq("id", document_id)
      .maybeSingle();

    if (docError) {
      return new Response(JSON.stringify({ error: "Failed to fetch document", detail: docError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found or access denied" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: caseRow, error: caseLoadError } = await serviceClient
      .from("cases")
      .select("id, status")
      .eq("id", doc.case_id)
      .maybeSingle();

    if (caseLoadError) {
      return new Response(JSON.stringify({ error: "Failed to load case", detail: caseLoadError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!caseRow) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 5. Must still be initiated
    if (doc.upload_status !== "initiated") {
      return new Response(
        JSON.stringify({
          error: `Document upload_status is '${doc.upload_status}', expected 'initiated'`,
        }),
        {
          status: 409,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // 6. Check storage file exists
    const pathParts = doc.storage_path.split("/");
    const fileName = pathParts.pop()!;
    const folderPath = pathParts.join("/");

    const { data: files, error: listError } = await serviceClient.storage
      .from(doc.storage_bucket)
      .list(folderPath, { search: fileName, limit: 10 });

    if (listError) {
      console.error("Storage list error:", listError);
      return new Response(JSON.stringify({ error: "Failed to verify file in storage" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const fileExists = (files ?? []).some((f) => f.name === fileName);
    if (!fileExists) {
      return new Response(JSON.stringify({ error: "File not found in storage at the expected path" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 7. Load current published policy version
    const { data: publishedPolicy, error: policyError } = await serviceClient
      .from("policy_versions")
      .select("id, status")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (policyError) {
      console.error("Failed to load published policy:", policyError);
      return new Response(JSON.stringify({ error: "Failed to load published policy" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 8. Confirm upload on document
    const now = new Date().toISOString();

    const { data: updatedDocument, error: updateError } = await serviceClient
      .from("documents")
      .update({
        upload_status: "uploaded",
        uploaded_at: now,
        ai_status: "queued",
        ocr_status: "pending",
        parse_status: "pending",
        validation_status: "pending",
      })
      .eq("id", document_id)
      .select(
        `
        id,
        case_id,
        document_type,
        storage_bucket,
        storage_path,
        original_file_name,
        upload_status,
        uploaded_at,
        mime_type,
        file_size_bytes,
        ai_status,
        validation_status
      `,
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
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // 9. Create AI validation job
    const { data: createdJob, error: jobError } = await serviceClient
      .from("ai_validation_jobs")
      .insert({
        case_id: doc.case_id,
        document_id: doc.id,
        policy_version_id: publishedPolicy?.id ?? null,
        job_type: "process_document",
        status: "queued",
        input_payload: {
          trigger: "confirm_document_upload",
          document_id: doc.id,
          case_id: doc.case_id,
          document_type: doc.document_type,
        },
      })
      .select("id, status, job_type, case_id, document_id")
      .single();

    if (jobError) {
      console.error("Job create error:", jobError);
      return new Response(
        JSON.stringify({
          error: "Document upload confirmed, but AI job creation failed",
          detail: jobError.message,
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // 10. Link job back to document
    const { error: docJobLinkError } = await serviceClient
      .from("documents")
      .update({
        last_ai_job_id: createdJob.id,
      })
      .eq("id", doc.id);

    if (docJobLinkError) {
      console.error("Failed to set documents.last_ai_job_id:", docJobLinkError);
    }

    // 11. Update case AI pipeline status.
    // Only move business status to docs_uploaded from early intake states.
    const previousStatus = caseRow.status ?? null;
    const canMoveToDocsUploaded = previousStatus === "draft" || previousStatus === "submitted";

    const caseUpdatePayload: Record<string, unknown> = {
      ai_pipeline_status: "queued",
    };

    if (canMoveToDocsUploaded) {
      caseUpdatePayload.status = "docs_uploaded";
    }

    const { error: caseUpdateError } = await serviceClient
      .from("cases")
      .update(caseUpdatePayload)
      .eq("id", doc.case_id);

    if (caseUpdateError) {
      console.error("Failed to update case status / ai_pipeline_status:", caseUpdateError);
    }

    // 12. Fire-and-forget trigger of process-document
    // If this fails, seller upload must still succeed.
    try {
      const invokeResponse = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          job_id: createdJob.id,
        }),
      });

      if (!invokeResponse.ok) {
        const invokeText = await invokeResponse.text();
        console.error("process-document invoke failed:", invokeResponse.status, invokeText);
      }
    } catch (invokeErr) {
      console.error("process-document invoke error (non-blocking):", invokeErr);
    }

    // 13. Return success
    return new Response(
      JSON.stringify({
        ...updatedDocument,
        ai_job: createdJob,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
