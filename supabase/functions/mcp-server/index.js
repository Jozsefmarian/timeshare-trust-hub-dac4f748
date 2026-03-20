import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Server } from "https://esm.sh/@modelcontextprotocol/sdk/server/index.js"
import { SSEServerTransport } from "https://esm.sh/@modelcontextprotocol/sdk/server/sse.js"
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "https://esm.sh/@modelcontextprotocol/sdk/types.js"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// --- KONFIGURÁCIÓ ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// MCP Szerver inicializálása
const server = new Server(
  { name: "mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
)

// 1. Eszközök (Tools) listázása a ChatGPT számára
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tables",
        description: "Listázza az összes adatbázis táblát és azok struktúráját.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "query_table",
        description: "Adatokat kérdez le egy konkrét táblából.",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            columns: { type: "string", description: "Vesszővel elválasztott oszlopok, pl: id,name", default: "*" },
            limit: { type: "number", default: 5 }
          },
          required: ["table"]
        }
      }
    ]
  }
})

// 2. Eszközök logikája
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === "list_tables") {
      // Itt egy trükk: a Postgres belső tábláiból kérdezzük le a sémát
      const { data, error } = await supabase.rpc('get_schema_info') 
      // Ha nincs RPC-d, akkor egy egyszerűbb lekérdezés:
      if (error) {
        const { data: tableData } = await supabase.from('_table_metadata').select('*').limit(10) // példa
        return { content: [{ type: "text", text: JSON.stringify(data || "Hiba a séma lekérésekor. Próbáld manuálisan.") }] }
      }
      return { content: [{ type: "text", text: JSON.stringify(data) }] }
    }

    if (name === "query_table") {
      const { data, error } = await supabase
        .from(args.table as string)
        .select((args.columns as string) || "*")
        .limit((args.limit as number) || 5)
      
      if (error) throw error
      return { content: [{ type: "text", text: JSON.stringify(data) }] }
    }

    return { content: [{ type: "text", text: "Ismeretlen eszköz" }], isError: true }
  } catch (err: any) {
    return { content: [{ type: "text", text: `Hiba: ${err.message}` }], isError: true }
  }
})

// --- HTTP SZERVER KEZELÉS (SSE) ---
let transport: SSEServerTransport | null = null

serve(async (req) => {
  const url = new URL(req.url)

  // CORS kezelése (hogy a ChatGPT elérje)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } })
  }

  // 1. SSE kapcsolat indítása (Ez történik, amikor a ChatGPT csatlakozik)
  if (req.method === "GET" && url.pathname.endsWith("/sse")) {
    transport = new SSEServerTransport("/messages", res => {
        // Válasz küldése
    })
    
    const response = await transport.handleStart(req)
    response.headers.set("Access-Control-Allow-Origin", "*")
    return response
  }

  // 2. Üzenetek fogadása
  if (req.method === "POST" && url.pathname.endsWith("/messages")) {
    if (!transport) return new Response("Nincs aktív SSE kapcsolat", { status: 400 })
    
    await transport.handleMessage(req)
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } })
  }

  return new Response("Supabase MCP Bridge - Használd az /sse végpontot", { status: 404 })
})

