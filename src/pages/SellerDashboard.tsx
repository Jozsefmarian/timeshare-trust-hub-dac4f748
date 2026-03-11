import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FolderOpen, FileCheck, Clock, Send, PlusCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CaseRow {
  id: string;
  case_number: string;
  status: string;
  status_group: string | null;
  current_step: string | null;
  priority: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
}

function statusColor(status: string) {
  if (["completed", "signed", "closed"].includes(status)) return "bg-success";
  if (status === "cancelled") return "bg-destructive";
  if (status === "draft") return "bg-muted-foreground";
  return "bg-warning";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Piszkozat",
    submitted: "Beküldve",
    in_review: "Felülvizsgálat alatt",
    approved: "Jóváhagyva",
    completed: "Lezárva",
    signed: "Aláírva",
    cancelled: "Törölve",
    closed: "Lezárva",
  };
  return map[status] ?? status;
}

export default function SellerDashboard() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("Nincs bejelentkezett felhasználó.");
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await (supabase as any)
          .from("cases")
          .select(
            "id, case_number, status, status_group, current_step, priority, source, created_at, updated_at, submitted_at, closed_at",
          )
          .eq("seller_user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        setCases((data as CaseRow[]) ?? []);
      } catch (err: any) {
        console.error("SellerDashboard fetch error:", err);
        setError(err?.message || "Nem sikerült betölteni az ügyeket.");
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const totalCases = cases.length;
  const activeCases = cases.filter(
    (c) => c.closed_at === null && c.status !== "closed" && c.status !== "completed",
  ).length;
  const submittedCases = cases.filter((c) => c.submitted_at !== null).length;
  const closedCases = cases.filter(
    (c) => c.closed_at !== null || c.status === "closed" || c.status === "completed",
  ).length;

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eladói vezérlőpult</h1>
          <p className="text-muted-foreground">Üdvözöljük újra. Itt láthatja üdülési jog ügyeinek áttekintését.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title="Összes ügy"
              value={String(totalCases)}
              icon={<FolderOpen className="h-4 w-4" />}
              variant="accent"
            />
            <DashboardCard
              title="Aktív ügyek"
              value={String(activeCases)}
              icon={<Clock className="h-4 w-4" />}
              variant="warning"
            />
            <DashboardCard
              title="Beküldött ügyek"
              value={String(submittedCases)}
              icon={<Send className="h-4 w-4" />}
              variant="default"
            />
            <DashboardCard
              title="Lezárt ügyek"
              value={String(closedCases)}
              icon={<FileCheck className="h-4 w-4" />}
              variant="success"
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hiba</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ügyek</CardTitle>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">Még nincs egyetlen ügye sem.</p>
                    <Button asChild>
                      <Link to="/seller/new-case">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Új ügy indítása
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        to={`/seller/cases/${c.id}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground text-sm">{c.case_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {statusLabel(c.status)}
                            {c.current_step ? ` · ${c.current_step}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(c.created_at).toLocaleDateString("hu-HU")}
                          </p>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(c.status)}`} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Legutóbbi tevékenység</CardTitle>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Még nincs tevékenység.</p>
                ) : (
                  <div className="space-y-4">
                    {cases.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-start gap-3">
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-secondary shrink-0" />
                        <div>
                          <p className="text-sm text-foreground">
                            {c.case_number} — {statusLabel(c.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.updated_at).toLocaleDateString("hu-HU")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
