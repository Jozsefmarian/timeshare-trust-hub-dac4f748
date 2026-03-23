import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, BookOpen, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny: any = supabase;

type PolicyStatus = "draft" | "published" | "archived";

interface Policy {
  id: string;
  name: string;
  version: string;
  status: PolicyStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const statusConfig: Record<PolicyStatus, { label: string; className: string }> = {
  draft: { label: "Piszkozat", className: "border-amber-500/50 text-amber-600 bg-amber-500/10" },
  published: { label: "Publikált", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50" },
  archived: { label: "Archivált", className: "bg-muted text-muted-foreground" },
};

const filterTabs: { label: string; value: PolicyStatus | "all" }[] = [
  { label: "Összes", value: "all" },
  { label: "Piszkozat", value: "draft" },
  { label: "Publikált", value: "published" },
  { label: "Archivált", value: "archived" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdminPolicies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PolicyStatus | "all">("all");
  const [search, setSearch] = useState("");

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabaseAny
        .from("policy_versions")
        .select("id, name, version, status, created_at, updated_at, published_at")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setPolicies((data ?? []) as Policy[]);
    } catch (err: any) {
      setError(err?.message || "Nem sikerült betölteni a szabályrendszereket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleNewPolicy = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { data, error: insertError } = await supabaseAny
        .from("policy_versions")
        .insert({
          name: "Új szabályrendszer",
          version: "1.0",
          status: "draft",
          created_by_user_id: userId ?? null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      navigate(`/admin/policies/${data.id}`);
    } catch (err: any) {
      setError(err?.message || "Nem sikerült létrehozni az új szabályrendszert.");
    }
  };

  const filtered = policies.filter((p) => {
    if (activeFilter !== "all" && p.status !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.version.includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Szabályrendszerek</h1>
            <p className="text-muted-foreground text-sm mt-1">Ügyminősítési szabályrendszerek kezelése</p>
          </div>
          <Button onClick={handleNewPolicy}>
            <Plus className="h-4 w-4 mr-2" />
            Új szabályrendszer
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={loadPolicies}>
              Újrapróbálás
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex gap-1 flex-wrap">
                {filterTabs.map((tab) => (
                  <Button
                    key={tab.value}
                    variant={activeFilter === tab.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Verzió</TableHead>
                  <TableHead>Állapot</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead>Publikálva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {policies.length === 0 ? "Még nincs szabályrendszer. Hozzon létre egyet." : "Nincs találat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((policy) => {
                    const sc = statusConfig[policy.status] ?? statusConfig.draft;
                    return (
                      <TableRow
                        key={policy.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/policies/${policy.id}`)}
                      >
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell>v{policy.version}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.className}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(policy.created_at)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(policy.published_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
