import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileCheck, Loader2, Download, CheckCircle2 } from "lucide-react";
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

const CONFIRMATION_WORD = "ELFOGADOM";

function formatDateHu(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

function applyTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value || "—");
  }
  return result;
}

export default function ServiceAgreementPanel({ caseId, caseStatus, onAccepted }: ServiceAgreementPanelProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(
    caseStatus === "service_agreement_accepted" || isAfterStatus(caseStatus, "service_agreement_accepted"),
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadAgreement = useCallback(async () => {
    const { data } = await supabaseAny
      .from("service_agreements")
      .select("id, version, title, html_content")
      .eq("is_active", true)
      .maybeSingle();
    if (data) setAgreement(data as Agreement);
  }, []);

  const loadTemplateVars = useCallback(async () => {
    // Get seller_user_id from case
    const { data: caseData } = await supabaseAny
      .from("cases")
      .select("seller_user_id")
      .eq("id", caseId)
      .maybeSingle();
    if (!caseData) return;

    // Get seller profile
    const { data: sellerProfile } = await supabaseAny
      .from("seller_profiles")
      .select("billing_name, birth_name, birth_place, birth_date, mother_name, billing_address")
      .eq("user_id", caseData.seller_user_id)
      .maybeSingle();

    // Get published policy version
    const { data: policy } = await supabaseAny
      .from("policy_versions")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let buyerVars: Record<string, string> = {};
    if (policy) {
      const { data: settings } = await supabaseAny
        .from("policy_settings")
        .select("setting_key, setting_value")
        .eq("policy_version_id", policy.id)
        .in("setting_key", ["buyer_name", "buyer_address", "buyer_company_number", "buyer_tax_number"]);

      if (settings) {
        for (const s of settings) {
          const val = typeof s.setting_value === "string" ? s.setting_value : JSON.stringify(s.setting_value);
          buyerVars[s.setting_key] = val;
        }
      }
    }

    setTemplateVars({
      seller_name: sellerProfile?.billing_name || "",
      seller_birth_name: sellerProfile?.birth_name || "",
      seller_birth_place: sellerProfile?.birth_place || "",
      seller_birth_date: formatDateHu(sellerProfile?.birth_date || null),
      seller_mother_name: sellerProfile?.mother_name || "",
      seller_address: sellerProfile?.billing_address || "",
      ...buyerVars,
    });
  }, [caseId]);

  const checkExistingAcceptance = useCallback(async () => {
    const { data } = await supabaseAny.from("declaration_acceptances").select("id").eq("case_id", caseId).maybeSingle();
    if (data) setAccepted(true);
  }, [caseId]);

  useEffect(() => {
    loadAgreement();
    loadTemplateVars();
    checkExistingAcceptance();
  }, [loadAgreement, loadTemplateVars, checkExistingAcceptance]);

  const isConfirmationCorrect = typedConfirmation.trim().toUpperCase() === CONFIRMATION_WORD;

  const canSubmit = decl1 && decl2 && isConfirmationCorrect;

  const processedHtml = agreement?.html_content
    ? applyTemplate(agreement.html_content, templateVars)
    : null;

  const handleAccept = async () => {
    if (!agreement || !canSubmit) return;
    setMessage(null);

    try {
      setIsAccepting(true);

      const { data, error } = await supabase.functions.invoke("accept-service-agreement", {
        body: {
          case_id: caseId,
          service_agreement_id: agreement.id,
          checkbox_checked: true,
          typed_confirmation: typedConfirmation.trim(),
        },
      });

      if (error) throw error;

      setAccepted(true);
      setMessage({
        type: "success",
        text: "Szolgáltatási szerződés sikeresen elfogadva. Visszaigazoló emailt küldtünk.",
      });
      onAccepted();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Az elfogadás nem sikerült.",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (accepted) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Szolgáltatási szerződés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm text-success font-medium">A szolgáltatási szerződés sikeresen elfogadva.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visszaigazoló emailt küldtünk az elfogadás részleteivel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Szolgáltatási szerződés elfogadása
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {processedHtml ? (
          <div className="max-h-96 overflow-y-auto p-4 rounded-xl border border-border bg-muted/30 text-sm w-full">
            <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">A szerződés szövege betöltés alatt...</p>
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          A szerződés elektronikus úton jön létre. A felhasználó az elfogadás gomb megnyomásával és a szolgáltatási díj
          megfizetésével a szerződést kötelezőnek ismeri el.
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
            <Checkbox checked={decl1} onCheckedChange={(v) => setDecl1(!!v)} className="mt-0.5" />
            <span className="text-sm text-foreground">A szerződés teljes szövegét elolvastam és elfogadom.</span>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
            <Checkbox checked={decl2} onCheckedChange={(v) => setDecl2(!!v)} className="mt-0.5" />
            <span className="text-sm text-foreground">
              Az elfogadást megerősítem és vállalom a szolgáltatási díj megfizetését.
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="typed-confirmation" className="text-sm">
            A megerősítéshez írja be: <span className="font-bold text-foreground">{CONFIRMATION_WORD}</span>
          </Label>
          <Input
            id="typed-confirmation"
            placeholder={CONFIRMATION_WORD}
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            disabled={isAccepting}
            className={
              typedConfirmation.length > 0
                ? isConfirmationCorrect
                  ? "border-success focus-visible:ring-success"
                  : "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {typedConfirmation.length > 0 && !isConfirmationCorrect && (
            <p className="text-xs text-destructive">Kérjük pontosan írja be: {CONFIRMATION_WORD}</p>
          )}
        </div>

        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-success" : "text-destructive"}`}>
            {message.text}
          </p>
        )}

        <Button className="w-full" disabled={!canSubmit || isAccepting} onClick={handleAccept}>
          {isAccepting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Elfogadás folyamatban...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Szolgáltatási szerződés elfogadása
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function isAfterStatus(current: string, target: string): boolean {
  const order = [
    "draft",
    "submitted",
    "ai_processing",
    "green_approved",
    "contract_generated",
    "awaiting_signed_contract",
    "signed_contract_uploaded",
    "service_agreement_accepted",
    "payment_pending",
    "paid",
    "closed",
  ];
  return order.indexOf(current) > order.indexOf(target);
}
