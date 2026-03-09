import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowLeft,
  SendHorizonal,
  Upload,
  FileSearch,
  XCircle,
  CheckCircle,
  FileText,
  PenLine,
  FileCheck,
  CreditCard,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type CaseRow = {
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
};

const timelineSteps = [
  { key: "draft", label: "Piszkozat", icon: Circle, description: "Az ügy létrejött, de még nincs beküldve." },
  { key: "submitted", label: "Beküldve", icon: SendHorizonal, description: "Az ügy sikeresen beküldve." },
  { key: "docs_uploaded", label: "Dokumentumok feltöltve", icon: Upload, description: "A szükséges dokumentumok feltöltése megtörtént." },
  { key: "ai_processing", label: "AI feldolgozás", icon: FileSearch, description: "Az ügy automatikus feldolgozás alatt áll." },
  { key: "yellow_review", label: "Sárga ellenőrzés", icon: AlertTriangle, description: "Kézi ellenőrzés szükséges." },
  { key: "red_rejected", label: "Elutasítva", icon: XCircle, description: "Az ügy elutasításra került." },
  { key: "green_approved", label: "Jóváhagyva", icon: CheckCircle, description: "Az ügy jóváhagyásra került." },
  { key: "contract_generated", label: "Szerződés generálva", icon: FileText, description: "Az adásvételi szerződés elkészült." },
  { key: "awaiting_signed_contract", label: "Aláírt szerződésre vár", icon: PenLine, description: "Az aláírt szerződés feltöltése szükséges." },
  { key: "signed_contract_uploaded", label: "Aláírt szerződés feltöltve", icon: Upload, description: "Az aláírt szerződés beérkezett." },
  { key: "service_agreement_accepted", label: "Szolgáltatási szerződés elfogadva", icon: FileCheck, description: "A szolgáltatási szerződés elfogadása megtörtént." },
  { key: "payment_pending", label: "Fizetés függőben", icon: CreditCard, description: "A fizetés még nem érkezett meg." },
  { key: "paid", label: "Fizetve", icon: CreditCard, description: "A fizetés megérkezett." },
  { key: "closed", label: "Lezárva", icon: Lock, description: "Az ügy sikeresen lezárult." },
];

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  draft: { label: "Piszkozat", className: "bg-muted text-muted-foreground" },
  submitted: { label: "Beküldve", className: "bg-primary/15 text-primary border-primary/30" },
  docs_uploaded: { label: "Dokumentumok feltöltve", className: "bg-secondary/15 text-secondary border-secondary/30" },
  ai_processing: { label: "AI feldolgozás", className: "bg-secondary/15 text-secondary border-secondary/30" },
  yellow_review: { label: "Ellenőrzés alatt", className: "bg-warning/15 text-warning border-warning/30" },
  red_rejected: { label: "Elutasítva", className: "bg-destructive/15 text-destructive border-destructive/30" },
  green_approved: { label: "Jóváhagyva", className: "bg-success/15 text-success border-success/30" },
  contract_generated: { label: "Szerződés generálva", className: "bg-secondary/15 text-secondary border-secondary/30" },
  awaiting_signed_contract: { label: "Aláírásra vár", className: "bg-warning/15 text-warning border-warning/30" },
  signed_contract_uploaded: { label: "Aláírt szerződés feltöltve", className: "bg-secondary/15 text-secondary border-secondary/30" },
  service_agreement_accepted: { label: "Szolgáltatási szerződés elfogadva", className: "bg-secondary/15 text-secondary border-secondary/30" },
  payment_pending: { label: "Fizetés függőben", className: "bg-warning/15 text-warning border-warning/30" },
  paid: { label: "Fizetve", className: "bg-success/15 text-success border-success/30" },
  closed: { label: "Lezárt ügy", className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Megszakítva", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

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

export default function CaseDetail() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) {
        setLoadError("Hiányzó ügyazonosító.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        const { data, error } = await (supabase as any)
          .from("cases")
          .select(
            "id, case_number, status, status_group, current_step, priority, source, created_at, updated_at, submitted_at, closed_at"
          )
          .eq("id", caseId)
          .maybeSingle();

        if (error) throw error;

        setCaseData((data as CaseRow | null) ?? null);
      } catch (error: any) {
        setLoadError(error?.message || "Az ügy betöltése nem sikerült.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCase();
  }, [caseId]);

  const currentStatus = useMemo(() => {
    if (!caseData?.status) return statusBadgeMap.draft;
    return statusBadgeMap[caseData.status] || {
      label: caseData.status,
      className: "bg-muted text-muted-foreground",
    };
  }, [caseData]);

  const currentStepIndex = useMemo(() => {
    if (!caseData?.status) return 0;
    const idx = timelineSteps.findIndex((step) => step.key === caseData.status);
    return idx >= 0 ? idx : 0;
  }, [caseData]);

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Vissza a vezérlőpultra
          </Link>
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">Ügy betöltése...</p>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  if (loadError) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Vissza a vezérlőpultra
          </Link>
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">Hiba történt</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  if (!caseData) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Vissza a vezérlőpultra
          </Link>
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">Az ügy nem található</p>
              <p className="text-sm text-muted-foreground">
                Lehet, hogy nincs hozzáférésed ehhez az ügyhöz, vagy az ügy nem létezik.
              </p>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        <Link to="/seller" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Vissza a vezérlőpultra
        </Link>

        {/* Header Card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Ügy száma</p>
                <h1 className="text-2xl font-bold text-foreground">{caseData.case_number}</h1>
              </div>
              <Badge className={cn("text-xs font-semibold px-3 py-1", currentStatus.className)}>
                {currentStatus.label}
              </Badge>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Létrehozva</p>
                <p className="font-medium text-foreground">{formatDate(caseData.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Frissítve</p>
                <p className="font-medium text-foreground">{formatDate(caseData.updated_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jelenlegi lépés</p>
                <p className="font-medium text-foreground">{caseData.current_step || "Nincs megadva"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Státusz csoport</p>
                <p className="font-medium text-foreground">{caseData.status_group || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prioritás</p>
                <p className="font-medium text-foreground">{caseData.priority || "normál"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Forrás</p>
                <p className="font-medium text-foreground">{caseData.source || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Beküldve</p>
                <p className="font-medium text-foreground">{formatDate(caseData.submitted_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lezárva</p>
                <p className="font-medium text-foreground">{formatDate(caseData.closed_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ügy állapota</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {timelineSteps.map((step, i) => {
                    const completed = i < currentStepIndex;
                    const current = i === currentStepIndex;
                    const Icon = step.icon;
                    const isLast = i === timelineSteps.length - 1;

                    return (
                      <div key={step.key} className="flex gap-4 relative">
                        {!isLast && (
                          <div className={cn(
                            "absolute left-[17px] top-[36px] w-0.5 h-[calc(100%-12px)]",
                            completed ? "bg-success" : current ? "bg-primary" : "bg-border"
                          )} />
                        )}

                        <div className={cn(
                          "relative z-10 flex items-center justify-center h-9 w-9 rounded-full shrink-0 border-2 transition-colors",
                          completed ? "bg-success border-success text-success-foreground"
                            : current ? "bg-primary border-primary text-primary-foreground"
                            : "bg-muted border-border text-muted-foreground"
                        )}>
                          {completed ? <CheckCircle2 className="h-4 w-4" /> : current ? <Icon className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </div>

                        <div className={cn("pb-8", isLast && "pb-0")}>
                          <p className={cn(
                            "text-sm font-medium leading-tight",
                            completed ? "text-success" : current ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </p>
                          <p className={cn(
                            "text-xs mt-0.5",
                            completed || current ? "text-muted-foreground" : "text-muted-foreground/60"
                          )}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Next action */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Következő teendő
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Az ügy aktuális állapota: {currentStatus.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Jelenlegi lépés: {caseData.current_step || "Nincs megadva"}
                </p>
                {caseData.status === "red_rejected" && (
                  <p className="text-sm text-destructive mt-2">
                    Ez az ügy elutasított státuszban van. Az admin ellenőrzés eredményét kell áttekinteni.
                  </p>
                )}
                {caseData.status === "cancelled" && (
                  <p className="text-sm text-destructive mt-2">
                    Ez az ügy megszakított státuszban van.
                  </p>
                )}
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/seller">Vissza a vezérlőpultra</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Case details */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ügyadatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ügy azonosító</span>
                    <span className="font-medium text-foreground">{caseData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ügy száma</span>
                    <span className="font-medium text-foreground">{caseData.case_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Státusz</span>
                    <span className="font-medium text-foreground">{caseData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Státusz csoport</span>
                    <span className="font-medium text-foreground">{caseData.status_group || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prioritás</span>
                    <span className="font-medium text-foreground">{caseData.priority || "normál"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forrás</span>
                    <span className="font-medium text-foreground">{caseData.source || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
