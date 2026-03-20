import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase kliens inicializálása
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Admin jog kell a séma lekérdezéshez
);

const server = new Server(
  { name: "supabase-manager", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 1. Elérhető funkciók (Tools) definiálása
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tables",
        description: "Listázza az összes táblát a nyilvános (public) sémában.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_table_schema",
        description: "Lekéri egy adott tábla oszlopait és azok típusait.",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string", description: "A tábla neve" }
          },
          required: ["table"]
        }
      },
      {
        name: "query_data",
        description: "Adatokat kérdez le egy táblából (SELECT).",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            select: { type: "string", description: "Oszlopok, pl: 'id, name'" },
            limit: { type: "number", default: 10 }
          },
          required: ["table"]
        }
      }
    ]
  };
});

// 2. A funkciók logikájának kezelése
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_tables") {
      // PostgreSQL metaadatok lekérése
      const { data, error } = await supabase.rpc('get_tables_info'); // Lásd lentebb!
      // Vagy egyszerűbb verzió:
      const { data: tables, error: err } = await supabase.from('_tables_list').select('*'); // Ha van ilyen nézeted
      return { content: [{ type: "text", text: JSON.stringify(data || tables) }] };
    }

    if (name === "get_table_schema") {
      const { data, error } = await supabase.from(args.table).select().limit(0);
      return { content: [{ type: "text", text: `A(z) ${args.table} tábla elérhető. Hiba: ${error?.message || 'nincs'}` }] };
    }

    if (name === "query_data") {
      const { data, error } = await supabase.from(args.table).select(args.select || '*').limit(args.limit || 10);
      return { content: [{ type: "text", text: JSON.stringify(data || error) }] };
    }
  } catch (error) {
    return { content: [{ type: "text", text: `Hiba történt: ${error.message}` }], isError: true };
  }
});

// Szerver indítása Stdio transport-on (ezen keresztül beszél a ChatGPT Desktop-pal)
const transport = new StdioServerTransport();
await server.connect(transport);
