import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, XCircle, Loader2, ArrowLeft, FileText } from "lucide-react";
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
  const [agreement, setAgreement] = useState<{ id: string; version: string; title: string; html_content: string } | null>(null);
  const [existingAcceptance, setExistingAcceptance] = useState<{ id: string } | null>(null);
  const [checkbox1, setCheckbox1] = useState(false);
  const [checkbox2, setCheckbox2] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptanceDone, setAcceptanceDone] = useState(false);

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return;
      try {
        const { data } = await supabaseAny.from("cases").select("status").eq("id", caseId).maybeSingle();
        if (data) setCaseStatus(data.status);

        const { data: ag } = await supabaseAny
          .from("service_agreements")
          .select("id, version, title, html_content")
          .eq("is_active", true)
          .maybeSingle();
        setAgreement(ag ?? null);

        const { data: acc } = await supabaseAny
          .from("declaration_acceptances")
          .select("id")
          .eq("case_id", caseId)
          .maybeSingle();
        setExistingAcceptance(acc ?? null);
      } catch (err: any) {
        setError("Az ügy betöltése nem sikerült.");
      } finally {
        setIsLoading(false);
      }
    };
    loadCase();
  }, [caseId]);

  const handleAccept = async () => {
    if (!caseId || !agreement) return;
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("accept-service-agreement", {
        body: {
          case_id: caseId,
          typed_confirmation: typedConfirmation.trim(),
          checkbox_checked: true,
        },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error("Az elfogadás nem sikerült.");
      setAcceptanceDone(true);
      setCaseStatus("service_agreement_accepted");
    } catch (err: any) {
      setAcceptError(err?.message || "Az elfogadás nem sikerült.");
    } finally {
      setIsAccepting(false);
    }
  };

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

        {/* Szolgáltatási szerződés — elfogadva banner */}
        {(existingAcceptance || acceptanceDone) && caseStatus !== "paid" && caseStatus !== "closed" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Szolgáltatási szerződés elfogadva
          </div>
        )}

        {/* Szolgáltatási szerződés — elfogadás */}
        {caseStatus === "signed_contract_uploaded" && !existingAcceptance && !acceptanceDone && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Szolgáltatási szerződés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="max-h-80 overflow-y-auto border rounded-lg p-4 bg-muted/30 text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: agreement?.html_content ?? "<p>A szerződés szövege betöltés alatt...</p>" }}
              />
              <p className="text-xs text-muted-foreground">
                Kérjük, olvassa el a teljes szerződést a folytatás előtt.
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkbox1}
                    onChange={(e) => setCheckbox1(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">A szerződés teljes szövegét elolvastam és megértettem.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkbox2}
                    onChange={(e) => setCheckbox2(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Elfogadom a szerződést és vállalom a szolgáltatási díj megfizetését.</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">A megerősítéshez írja be: ELFOGADOM</label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  placeholder="ELFOGADOM"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {acceptError && <p className="text-sm text-destructive">{acceptError}</p>}

              <Button
                className="w-full"
                disabled={
                  !checkbox1 ||
                  !checkbox2 ||
                  typedConfirmation.trim().toUpperCase() !== "ELFOGADOM" ||
                  isAccepting
                }
                onClick={handleAccept}
              >
                {isAccepting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Elfogadás folyamatban...</>
                ) : (
                  "Szerződés elfogadása és továbblépés"
                )}
              </Button>
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
