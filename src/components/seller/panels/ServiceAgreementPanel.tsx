import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny: any = supabase;

interface ServiceAgreementPanelProps {
  caseId: string;
  caseStatus: string;
  onAccepted: () => void;
}

interface Agreement {
  id: string;
  version: string;
  title: string | null;
  html_content: string | null;
}

export default function ServiceAgreementPanel({ caseId, caseStatus, onAccepted }: ServiceAgreementPanelProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(caseStatus === "service_agreement_accepted" || isAfterStatus(caseStatus, "service_agreement_accepted"));
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAgreement = useCallback(async () => {
    const { data } = await supabaseAny
      .from("service_agreements")
      .select("id, version, title, html_content")
      .eq("is_active", true)
      .maybeSingle();
    if (data) setAgreement(data as Agreement);
  }, []);

  // Check if already accepted
  const checkExistingAcceptance = useCallback(async () => {
    const { data } = await supabaseAny
      .from("declaration_acceptances")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();
    if (data) setAccepted(true);
  }, [caseId]);

  useEffect(() => {
    loadAgreement();
    checkExistingAcceptance();
  }, [loadAgreement, checkExistingAcceptance]);

  const handleAccept = async () => {
    if (!agreement) return;
    setMessage(null);

    try {
      setIsAccepting(true);

      const { data, error } = await supabase.functions.invoke("accept-service-agreement", {
        body: {
          case_id: caseId,
          service_agreement_id: agreement.id,
          checkbox_checked: true,
          typed_confirmation: "Elfogadom",
        },
      });

      if (error) throw error;

      setAccepted(true);
      setMessage({ type: "success", text: "Szolgáltatási szerződés sikeresen elfogadva." });
      onAccepted();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Az elfogadás nem sikerült." });
    } finally {
      setIsAccepting(false);
    }
  };

  const allChecked = decl1 && decl2;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Szolgáltatási szerződés elfogadása
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {agreement?.html_content && (
          <div className="max-h-64 overflow-y-auto p-4 rounded-xl border border-border bg-muted/30 text-sm">
            <div dangerouslySetInnerHTML={{ __html: agreement.html_content }} />
          </div>
        )}

        {!accepted ? (
          <>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <Checkbox checked={decl1} onCheckedChange={(v) => setDecl1(!!v)} className="mt-0.5" />
                <span className="text-sm text-foreground">
                  Elolvastam és megértettem a szolgáltatási szerződés feltételeit.
                </span>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <Checkbox checked={decl2} onCheckedChange={(v) => setDecl2(!!v)} className="mt-0.5" />
                <span className="text-sm text-foreground">
                  Elfogadom a szolgáltatási szerződés feltételeit és kötelezettségeit.
                </span>
              </label>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-success" : "text-destructive"}`}>
                {message.text}
              </p>
            )}

            <Button className="w-full" disabled={!allChecked || isAccepting} onClick={handleAccept}>
              {isAccepting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Elfogadás...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Elfogadás és letöltés</>
              )}
            </Button>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-success/5 border border-success/20">
            <p className="text-sm text-success font-medium">
              A szolgáltatási szerződés sikeresen elfogadva.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to check if current status is past a given status
function isAfterStatus(current: string, target: string): boolean {
  const order = [
    "draft", "submitted", "ai_processing", "green_approved",
    "contract_generated", "awaiting_signed_contract", "signed_contract_uploaded",
    "service_agreement_accepted", "payment_pending", "paid", "closed",
  ];
  return order.indexOf(current) > order.indexOf(target);
}
