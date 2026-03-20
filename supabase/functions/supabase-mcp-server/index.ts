import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.18.0/server/mcp.js";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.18.0/server/streamableHttp.js";
import { z } from "npm:zod@3.25.76";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers":
        "content-type, authorization, x-client-info, apikey, mcp-session-id",
    },
  });
}

function text(message: string, status = 200) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers":
        "content-type, authorization, x-client-info, apikey, mcp-session-id",
    },
  });
}

function createMcpServer() {
  const server = new McpServer({
    name: "supabase-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "test_connection",
    {
      title: "Supabase kapcsolat teszt",
      description: "Ellenőrzi, hogy az MCP szerver eléri-e a Supabase adatbázist.",
      inputSchema: {},
    },
    async () => {
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (error) {
        return {
          content: [{ type: "text", text: `Kapcsolati hiba: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: "Supabase kapcsolat rendben." }],
      };
    }
  );

  server.registerTool(
    "list_tables",
    {
      title: "Táblák listázása",
      description: "Lekéri a public sémában lévő táblák listáját.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await supabase.rpc("mcp_list_tables");

      if (error) {
        return {
          content: [{ type: "text", text: `Hiba: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_table_schema",
    {
      title: "Tábla séma lekérése",
      description: "Lekéri egy tábla oszlopait és adattípusait.",
      inputSchema: {
        table: z.string().min(1),
      },
    },
    async ({ table }) => {
      const { data, error } = await supabase.rpc("mcp_get_table_schema", {
        p_table_name: table,
      });

      if (error) {
        return {
          content: [{ type: "text", text: `Hiba: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      };
    }
  );

  server.registerTool(
    "query_data",
    {
      title: "Adatlekérdezés",
      description: "Adatokat kér le egy engedélyezett táblából.",
      inputSchema: {
        table: z.string().min(1),
        select: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ table, select, limit }) => {
      // FONTOS: ide csak azokat a táblákat tedd, amiket tényleg engedni akarsz
      const ALLOWED_TABLES = [
  "profiles",
  "seller_profiles",
  "contracts",
  "resorts",
  "week_assets",
  "week_offers",
  "yearly_inventory",
  "bookings",
  "payments",
  "documents"
];

      if (!ALLOWED_TABLES.includes(table)) {
        return {
          content: [{ type: "text", text: `Ez a tábla nem engedélyezett: ${table}` }],
          isError: true,
        };
      }

      const { data, error } = await supabase
        .from(table)
        .select(select && select.trim() ? select : "*")
        .limit(limit ?? 10);

      if (error) {
        return {
          content: [{ type: "text", text: `Hiba: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      };
    }
  );

  return server;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers":
            "content-type, authorization, x-client-info, apikey, mcp-session-id",
        },
      });
    }

    if (req.method === "GET" && (url.pathname.endsWith("/") || url.pathname.endsWith("/health"))) {
      return json({
        ok: true,
        service: "supabase-mcp-server",
        transport: "streamable-http-json",
      });
    }

    // A ChatGPT-hez ezt az URL-t add meg: .../functions/v1/<function-name>/mcp
    if (req.method === "POST" && url.pathname.endsWith("/mcp")) {
      const server = createMcpServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true,      // nincs SSE
      });

      await server.connect(transport);

      // A legtöbb példában ez a hívás viszi végig a request/response ciklust
      const response = await transport.handleRequest(req);

      response.headers.set("access-control-allow-origin", "*");
      response.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
      response.headers.set(
        "access-control-allow-headers",
        "content-type, authorization, x-client-info, apikey, mcp-session-id"
      );

      return response;
    }

    return text("Not found", 404);
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
