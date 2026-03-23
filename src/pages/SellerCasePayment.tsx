import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny: any = supabase;

export default function SellerCasePayment() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get("payment");

  const [caseStatus, setCaseStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return;
      try {
        const { data } = await supabaseAny.from("cases").select("status").eq("id", caseId).maybeSingle();
        if (data) setCaseStatus(data.status);
      } catch (err: any) {
        setError("Az ügy betöltése nem sikerült.");
      } finally {
        setIsLoading(false);
      }
    };
    loadCase();
  }, [caseId]);

  const handleStartPayment = async () => {
    if (!caseId) return;
    setIsStarting(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("create-stripe-checkout", {
        body: { case_id: caseId },
      });

      if (invokeError) throw invokeError;
      if (!data?.checkout_url) throw new Error("Nem érkezett visszaátirányítási URL.");

      // Átirányítás Stripe checkout oldalra
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err?.message || "A fizetés indítása nem sikerült.");
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate(`/seller/cases/${caseId}`)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Vissza az ügyhez
        </button>

        {/* Sikeres fizetés */}
        {paymentResult === "success" && (
          <Card className="border-success/30 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Fizetés sikeres!</h2>
                  <p className="text-muted-foreground mt-1">
                    A szolgáltatási díj beérkezett. Az ügy lezárása folyamatban van.
                  </p>
                </div>
                <Button onClick={() => navigate(`/seller/cases/${caseId}`)}>Vissza az ügyhez</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Megszakított fizetés */}
        {paymentResult === "cancelled" && (
          <Card className="border-warning/30 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <XCircle className="h-12 w-12 text-warning" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Fizetés megszakítva</h2>
                  <p className="text-muted-foreground mt-1">A fizetési folyamat megszakadt. Bármikor újraindíthatja.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Már fizetve */}
        {(caseStatus === "paid" || caseStatus === "closed") && (
          <Card className="border-success/30 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
                <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
                <div>
                  <p className="font-medium text-foreground">A fizetés már megtörtént.</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Az ügy lezárása megtörtént, az üdülési jog nyilvántartásba véve.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fizetésre vár */}
        {caseStatus === "service_agreement_accepted" || caseStatus === "payment_pending" ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Szolgáltatási díj befizetése
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Szolgáltatás</span>
                  <span className="font-medium">Üdülési jog átruházás</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Összeg</span>
                  <span className="font-bold text-foreground">99 000 HUF</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fizetési mód</span>
                  <span className="font-medium">Bankkártya (Stripe)</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                A fizetés biztonságos Stripe felületen keresztül történik. A gombra kattintva a Stripe fizetési oldalára
                kerül.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full" disabled={isStarting} onClick={handleStartPayment}>
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Átirányítás...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Fizetés indítása
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SellerLayout>
  );
}
