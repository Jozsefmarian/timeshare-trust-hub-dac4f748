import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------

type CaseRow = {
  id: string;
  case_number: string;
  status: string;
  classification: string | null;
  created_at: string;
  seller_name: string | null;
  resort_name: string | null;
  week_number: number | null;
  recheck_count?: number;
  is_fix_required?: boolean;
};

// ---------- Constants ----------

const statusOptions = [
  "draft",
  "submitted",
  "documents_uploaded",
  "ai_check",
  "under_review",
  "contract_pending",
  "payment_pending",
  "closed",
];

const statusLabels: Record<string, string> = {
  draft: "Piszkozat",
  submitted: "Beküldve",
  documents_uploaded: "Dokumentumok feltöltve",
  ai_check: "AI ellenőrzés",
  under_review: "Ellenőrzés alatt",
  contract_pending: "Szerződés készül",
  payment_pending: "Fizetésre vár",
  closed: "Lezárva",
};

const classificationLabels: Record<string, string> = {
  green: "Zöld",
  yellow: "Sárga",
  red: "Piros",
};

// ---------- Helpers ----------

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "submitted":
    case "documents_uploaded":
      return "bg-muted text-muted-foreground";
    case "ai_check":
    case "under_review":
      return "bg-primary/10 text-primary";
    case "contract_pending":
      return "bg-primary/10 text-primary";
    case "payment_pending":
      return "bg-warning/10 text-warning";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getClassificationBadgeClasses(c: string | null) {
  switch (c) {
    case "green":
      return "bg-success/10 text-success";
    case "yellow":
      return "bg-warning/10 text-warning";
    case "red":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ---------- Component ----------

export default function AdminCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load cases with seller profile name via seller_user_id -> profiles
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(
          `
          id,
          case_number,
          status,
          classification,
          created_at,
          seller_user_id,
          profiles!cases_seller_user_id_fkey ( full_name )
        `,
        )
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;

      if (!casesData || casesData.length === 0) {
        setCases([]);
        return;
      }

      // Load week_offers for resort + week info
      const caseIds = casesData.map((c) => c.id);
      const { data: offersData } = await supabase
        .from("week_offers")
        .select("case_id, resort_name_raw, week_number")
        .in("case_id", caseIds);

      const offerMap = new Map<string, { resort_name_raw: string | null; week_number: number | null }>();
      offersData?.forEach((o) => {
        if (!offerMap.has(o.case_id)) {
          offerMap.set(o.case_id, { resort_name_raw: o.resort_name_raw, week_number: o.week_number });
        }
      });

      const rows: CaseRow[] = casesData.map((c) => {
        const offer = offerMap.get(c.id);
        const profile = c.profiles as unknown as { full_name: string | null } | null;
        return {
          id: c.id,
          case_number: c.case_number,
          status: c.status,
          classification: c.classification,
          created_at: c.created_at,
          seller_name: profile?.full_name ?? null,
          resort_name: offer?.resort_name_raw ?? null,
          week_number: offer?.week_number ?? null,
        };
      });

      setCases(rows);
    } catch (err: any) {
      console.error("Failed to load cases", err);
      setError(err.message || "Nem sikerült betölteni az ügyeket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // ---------- Filtering ----------

  const filtered = cases.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesNumber = c.case_number.toLowerCase().includes(q);
      const matchesName = c.seller_name?.toLowerCase().includes(q);
      if (!matchesNumber && !matchesName) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (classificationFilter !== "all" && c.classification !== classificationFilter) return false;
    return true;
  });

  const hasFilters = search || statusFilter !== "all" || classificationFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setClassificationFilter("all");
  };

  // ---------- Render ----------

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ügyek kezelése</h1>
          <p className="text-muted-foreground">Az összes beérkezett ügy áttekintése és kezelése.</p>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés ügy számra vagy névre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Státusz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes státusz</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue placeholder="Minősítés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes minősítés</SelectItem>
                  <SelectItem value="green">Zöld</SelectItem>
                  <SelectItem value="yellow">Sárga</SelectItem>
                  <SelectItem value="red">Piros</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive shadow-sm">
            <CardContent className="pt-6 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadCases} className="ml-auto">
                Újrapróbálás
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Ügyek listája</span>
              {!loading && <span className="text-sm font-normal text-muted-foreground">{filtered.length} ügy</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ügy száma</TableHead>
                  <TableHead>Eladó</TableHead>
                  <TableHead>Üdülőhely</TableHead>
                  <TableHead className="text-center">Hét</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Minősítés</TableHead>
                  <TableHead>Beküldés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      {cases.length === 0
                        ? "Még nincsenek ügyek a rendszerben."
                        : "Nincs találat a megadott szűrőkkel."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/cases/${c.id}`)}>
                      <TableCell className="font-medium text-primary">
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/cases/${c.id}`);
                          }}
                        >
                          {c.case_number}
                        </button>
                      </TableCell>
                      <TableCell>{c.seller_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.resort_name ?? "—"}</TableCell>
                      <TableCell className="text-center">{c.week_number ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClasses(c.status)}>
                          {statusLabels[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.classification ? (
                          <Badge variant="outline" className={getClassificationBadgeClasses(c.classification)}>
                            {classificationLabels[c.classification] ?? c.classification}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("hu-HU")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
