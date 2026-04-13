import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileCheck, Loader2, CheckCircle2 } from "lucide-react";
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

function applyTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  const keys = Object.keys(vars);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = vars[key] || "—";
    result = result.split("{{" + key + "}}").join(value);
  }
  return result;
}

function sanitizeHtmlForInline(html: string): string {
  return html;
}

function formatDateHu(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

export default function ServiceAgreementPanel({ caseId, caseStatus, onAccepted }: ServiceAgreementPanelProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
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
    // 1. Szerződés szövege
    const { data: ag } = await supabaseAny
      .from("service_agreements")
      .select("id, version, title, html_content")
      .eq("is_active", true)
      .maybeSingle();
    if (!ag) return;
    setAgreement(ag as Agreement);

    // 2. Case adatok
    const { data: caseRow } = await supabaseAny
      .from("cases")
      .select("seller_user_id, case_number")
      .eq("id", caseId)
      .maybeSingle();

    // 3. Seller profil adatok
    const { data: sp } = await supabaseAny
      .from("seller_profiles")
      .select("billing_name, birth_name, birth_place, birth_date, mother_name, billing_address")
      .eq("user_id", caseRow?.seller_user_id ?? "")
      .maybeSingle();

    // 4. Buyer adatok (policy_settings) — fallback a hardcoded published policy ID-ra
    const PUBLISHED_POLICY_ID = "9e7b909e-1f43-4c59-9604-ae7e82f0db67";
    const buyerVars: Record<string, string> = {};
    let policyId = PUBLISHED_POLICY_ID;

    try {
      const { data: policy } = await supabaseAny
        .from("policy_versions")
        .select("id")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (policy?.id) policyId = policy.id;
    } catch {
      // fallback to hardcoded ID
    }

    const { data: settings } = await supabaseAny
      .from("policy_settings")
      .select("setting_key, setting_value")
      .eq("policy_version_id", policyId)
      .in("setting_key", [
        "buyer_name",
        "buyer_address",
        "buyer_company_number",
        "buyer_tax_number",
        "buyer_representative",
      ]);

    for (const row of settings ?? []) {
      const val = row.setting_value;
      buyerVars[row.setting_key] = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val ?? "");
    }

    // 5. Változók összeállítása és behelyettesítés
    const vars: Record<string, string> = {
      case_number: caseRow?.case_number ?? "—",
      seller_name: sp?.billing_name ?? "—",
      seller_birth_name: sp?.birth_name ?? "—",
      seller_birth_place: sp?.birth_place ?? "—",
      seller_birth_date: formatDateHu(sp?.birth_date),
      seller_mother_name: sp?.mother_name ?? "—",
      seller_address: sp?.billing_address ?? "—",
      buyer_name: buyerVars["buyer_name"] ?? "—",
      buyer_address: buyerVars["buyer_address"] ?? "—",
      buyer_company_number: buyerVars["buyer_company_number"] ?? "—",
      buyer_tax_number: buyerVars["buyer_tax_number"] ?? "—",
      buyer_representative: buyerVars["buyer_representative"] ?? "—",
    };

    setRenderedHtml(sanitizeHtmlForInline(applyTemplate(ag.html_content ?? "", vars)));
  }, [caseId]);

  const checkExistingAcceptance = useCallback(async () => {
    const { data } = await supabaseAny.from("declaration_acceptances").select("id").eq("case_id", caseId).maybeSingle();
    if (data) setAccepted(true);
  }, [caseId]);

  useEffect(() => {
    loadAgreement();
    checkExistingAcceptance();
  }, [loadAgreement, checkExistingAcceptance]);

  const isConfirmationCorrect = typedConfirmation.trim().toUpperCase() === CONFIRMATION_WORD;
  const canSubmit = decl1 && decl2 && isConfirmationCorrect;

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

  // ── Már elfogadva ─────────────────────────────────────────────────────

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

  // ── Elfogadásra vár ───────────────────────────────────────────────────

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-4 w-4" />
          Szolgáltatási szerződés elfogadása
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Szerződés szövege */}
        {renderedHtml ? (
          <div className="max-h-96 overflow-y-auto p-4 rounded-xl border border-border bg-muted/30 text-sm w-full">
            <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">A szerződés szövege betöltés alatt...</p>
          </div>
        )}

        {/* Jogi nyilatkozat */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          A szerződés elektronikus úton jön létre. A felhasználó az elfogadás gomb megnyomásával és a szolgáltatási díj
          megfizetésével a szerződést kötelezőnek ismeri el.
        </div>

        {/* Checkboxok */}
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

        {/* Typed confirmation */}
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

        {/* Hibaüzenet */}
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-success" : "text-destructive"}`}>
            {message.text}
          </p>
        )}

        {/* Submit gomb */}
        <Button className="w-full" disabled={!canSubmit || isAccepting} onClick={handleAccept}>
          {isAccepting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Elfogadás folyamatban...
            </>
          ) : (
            "Szolgáltatási szerződés elfogadása"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
