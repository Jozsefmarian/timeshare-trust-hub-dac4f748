import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, PlusCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const supabaseAny: any = supabase;

interface CaseRow {
  id: string;
  case_number: string;
  status: string;
  created_at: string;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Piszkozat",
    submitted: "Beküldve",
    docs_uploaded: "Dokumentumok feltöltve",
    ai_processing: "AI feldolgozás",
    yellow_review: "Kézi ellenőrzés szükséges",
    red_rejected: "Elutasítva",
    green_approved: "Jóváhagyva",
    contract_generated: "Szerződés generálva",
    awaiting_signed_contract: "Aláírásra vár",
    signed_contract_uploaded: "Aláírt szerződés feltöltve",
    service_agreement_accepted: "Szolgáltatási szerződés elfogadva",
    payment_pending: "Fizetés függőben",
    paid: "Fizetve",
    closed: "Lezárva",
    cancelled: "Törölve",
  };

  return map[status] ?? status;
}

function statusColor(status: string) {
  if (["green_approved", "paid", "closed"].includes(status)) return "bg-success";
  if (["red_rejected", "cancelled"].includes(status)) return "bg-destructive";
  if (["yellow_review", "payment_pending", "awaiting_signed_contract"].includes(status)) return "bg-warning";
  if (status === "draft") return "bg-muted-foreground";
  return "bg-primary";
}

export default function SellerCases() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const {
          data: { session },
        } = await supabaseAny.auth.getSession();
        if (!session) {
          setError("Nincs bejelentkezett felhasználó.");
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabaseAny
          .from("cases")
          .select("id, case_number, status, created_at")
          .eq("seller_user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (queryError) throw queryError;
        setCases((data ?? []) as CaseRow[]);
      } catch (err: any) {
        console.error("SellerCases fetch error:", err);
        setError("Hiba történt az ügyek betöltésekor.");
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  if (loading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <p className="text-muted-foreground">Ügyek betöltése...</p>
          </div>
        </div>
      </SellerLayout>
    );
  }

  if (error) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ügyeim</h1>
          <Button asChild>
            <Link to="/seller/new-case">
              <PlusCircle className="h-4 w-4 mr-2" />
              Új ügy indítása
            </Link>
          </Button>
        </div>

        {/* Cases List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Ügyek listája</CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Még nincs indított ügyed.</p>
                <Button asChild>
                  <Link to="/seller/new-case">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Új ügy indítása
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(c.status)}`} />
                      <div>
                        <p className="font-medium text-foreground">{c.case_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {statusLabel(c.status)} • {new Date(c.created_at).toLocaleString("hu-HU")}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/seller/cases/${c.id}`)}>
                      Részletek
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
