import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, RefreshCw, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  status_change: "Státuszváltás",
  policy_publish: "Policy közzétéve",
  doc_uploaded: "Dokumentum feltöltve",
  admin_override: "Admin felülbírálat",
  payment_received: "Fizetés beérkezett",
  contracts_generated: "Szerződések generálva",
  submit_case: "Ügy beküldve",
  case_closed: "Ügy lezárva",
  policy_published: "Szabályzat közzétéve",
};

const SOURCE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  system: "bg-muted text-muted-foreground",
  trigger: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  edge_function: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

type AuditRow = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  performed_by_user_id: string | null;
  source: string | null;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityIdSearch, setEntityIdSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-audit-logs", page, entityTypeFilter, actionFilter, entityIdSearch],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("id, entity_type, entity_id, action, performed_by_user_id, source, old_data, new_data, created_at, profiles!audit_logs_performed_by_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (entityTypeFilter !== "all") {
        query = query.eq("entity_type", entityTypeFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (entityIdSearch.trim()) {
        query = query.ilike("entity_id", `${entityIdSearch.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AuditRow[];
    },
  });

  const rows = data ?? [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "UUID másolva", description: text });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Auditnapló</h1>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full sm:w-48">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Entitás típus</label>
                <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes</SelectItem>
                    <SelectItem value="case">case</SelectItem>
                    <SelectItem value="asset">asset</SelectItem>
                    <SelectItem value="policy">policy</SelectItem>
                    <SelectItem value="document">document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Esemény</label>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes</SelectItem>
                    <SelectItem value="status_change">Státuszváltás</SelectItem>
                    <SelectItem value="policy_publish">Policy közzétéve</SelectItem>
                    <SelectItem value="doc_uploaded">Dokumentum feltöltve</SelectItem>
                    <SelectItem value="admin_override">Admin felülbírálat</SelectItem>
                    <SelectItem value="payment_received">Fizetés beérkezett</SelectItem>
                    <SelectItem value="contracts_generated">Szerződések generálva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-64">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Entitás ID keresés</label>
                <Input
                  placeholder="UUID kezdete..."
                  value={entityIdSearch}
                  onChange={(e) => { setEntityIdSearch(e.target.value); setPage(0); }}
                />
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="shrink-0">
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Frissítés
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-lg font-medium">Még nincsenek naplóbejegyzések.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Időpont</TableHead>
                    <TableHead>Esemény</TableHead>
                    <TableHead>Entitás</TableHead>
                    <TableHead>Ki végezte</TableHead>
                    <TableHead>Forrás</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <>
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(row.created_at), "yyyy. MMM d. HH:mm", { locale: hu })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ACTION_LABELS[row.action] ?? row.action}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-xs mr-1">{row.entity_type}</span>
                          {row.entity_id && (
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(row.entity_id!); }}
                              className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors"
                              title="UUID másolása"
                            >
                              {row.entity_id.slice(0, 8)}…
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.profiles?.full_name ?? "Rendszer"}
                        </TableCell>
                        <TableCell>
                          {row.source && (
                            <Badge variant="outline" className={`text-xs ${SOURCE_COLORS[row.source] ?? ""}`}>
                              {row.source}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRow === row.id && (
                        <TableRow key={`${row.id}-detail`}>
                          <TableCell colSpan={5} className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">old_data</p>
                                <pre className="text-xs font-mono bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                                  {row.old_data ? JSON.stringify(row.old_data, null, 2) : "null"}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">new_data</p>
                                <pre className="text-xs font-mono bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                                  {row.new_data ? JSON.stringify(row.new_data, null, 2) : "null"}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Előző oldal
            </Button>
            <span className="text-sm text-muted-foreground">{page + 1}. oldal</span>
            <Button variant="outline" disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
              Következő oldal <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
