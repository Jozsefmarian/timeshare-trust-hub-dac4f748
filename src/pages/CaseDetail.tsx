import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadCaseDocument } from "@/lib/documentUpload";

// ---------- Local types ----------

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

type DocumentType = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
};

type UploadedDocument = {
  id: string;
  original_file_name: string | null;
  upload_status: string;
  review_status: string;
  ai_status: string;
  uploaded_at: null;
  document_type_id: string | null;
};

// ---------- Status label helpers ----------

function uploadStatusLabel(s: string): string {
  switch (s) {
    case "pending":
    case "initiated":
      return "Előkészítve";
    case "uploaded":
      return "Feltöltve";
    case "failed":
      return "Sikertelen";
    default:
      return s;
  }
}

function reviewStatusLabel(s: string): string {
  switch (s) {
    case "pending":
      return "Függőben";
    case "approved":
      return "Jóváhagyva";
    case "rejected":
      return "Elutasítva";
    default:
      return s;
  }
}

function aiStatusLabel(s: string): string {
  switch (s) {
    case "pending":
      return "Feldolgozásra vár";
    case "processing":
      return "Feldolgozás alatt";
    case "completed":
      return "Feldolgozva";
    case "failed":
      return "Sikertelen";
    default:
      return s;
  }
}

// ---------- Constants ----------

const timelineSteps = [
  { key: "draft", label: "Piszkozat", icon: Circle, description: "Az ügy létrejött, de még nincs beküldve." },
  { key: "submitted", label: "Beküldve", icon: SendHorizonal, description: "Az ügy sikeresen beküldve." },
  {
    key: "docs_uploaded",
    label: "Dokumentumok feltöltve",
    icon: Upload,
    description: "A szükséges dokumentumok feltöltése megtörtént.",
  },
  {
    key: "ai_processing",
    label: "AI feldolgozás",
    icon: FileSearch,
    description: "Az ügy automatikus feldolgozás alatt áll.",
  },
  { key: "yellow_review", label: "Sárga ellenőrzés", icon: AlertTriangle, description: "Kézi ellenőrzés szükséges." },
  { key: "red_rejected", label: "Elutasítva", icon: XCircle, description: "Az ügy elutasításra került." },
  { key: "green_approved", label: "Jóváhagyva", icon: CheckCircle, description: "Az ügy jóváhagyásra került." },
  {
    key: "contract_generated",
    label: "Szerződés generálva",
    icon: FileText,
    description: "Az adásvételi szerződés elkészült.",
  },
  {
    key: "awaiting_signed_contract",
    label: "Aláírt szerződésre vár",
    icon: PenLine,
    description: "Az aláírt szerződés feltöltése szükséges.",
  },
  {
    key: "signed_contract_uploaded",
    label: "Aláírt szerződés feltöltve",
    icon: Upload,
    description: "Az aláírt szerződés beérkezett.",
  },
  {
    key: "service_agreement_accepted",
    label: "Szolgáltatási szerződés elfogadva",
    icon: FileCheck,
    description: "A szolgáltatási szerződés elfogadása megtörtént.",
  },
  {
    key: "payment_pending",
    label: "Fizetés függőben",
    icon: CreditCard,
    description: "A fizetés még nem érkezett meg.",
  },
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
  signed_contract_uploaded: {
    label: "Aláírt szerződés feltöltve",
    className: "bg-secondary/15 text-secondary border-secondary/30",
  },
  service_agreement_accepted: {
    label: "Szolgáltatási szerződés elfogadva",
    className: "bg-secondary/15 text-secondary border-secondary/30",
  },
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Component ----------

export default function CaseDetail() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Document upload state
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load case
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
            "id, case_number, status, status_group, current_step, priority, source, created_at, updated_at, submitted_at, closed_at",
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

  // Load document types
  const loadDocumentTypes = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("document_types")
      .select("id, code, label, description, is_required, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setDocumentTypes(data as DocumentType[]);
    }
  }, []);

  // Load uploaded documents
  const loadUploadedDocuments = useCallback(async () => {
    if (!caseId) return;

    const { data, error } = await (supabase as any)
      .from("documents")
      .select("id, original_file_name, upload_status, review_status, ai_status, uploaded_at, document_type_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUploadedDocuments(data as UploadedDocument[]);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      loadDocumentTypes();
      loadUploadedDocuments();
    }
  }, [caseId, loadDocumentTypes, loadUploadedDocuments]);

  // Upload handler
  const handleUpload = async () => {
    setUploadError(null);
    setUploadSuccessMessage(null);

    if (!selectedDocumentTypeId) {
      setUploadError("Kérjük, válassz dokumentumtípust.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Kérjük, válassz ki egy fájlt.");
      return;
    }
    if (!caseId) {
      setUploadError("Hiányzó ügyazonosító.");
      return;
    }

    try {
      setIsUploading(true);

      await uploadCaseDocument({
        caseId,
        documentTypeId: selectedDocumentTypeId,
        file: selectedFile,
      });

      setUploadSuccessMessage("A dokumentum sikeresen feltöltve.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadUploadedDocuments();
    } catch (err: any) {
      setUploadError(err?.message || "A feltöltés nem sikerült.");
    } finally {
      setIsUploading(false);
    }
  };

  // Helpers
  const getDocTypeLabel = (docTypeId: string | null): string => {
    if (!docTypeId) return "—";
    const dt = documentTypes.find((t) => t.id === docTypeId);
    return dt?.label || "Ismeretlen típus";
  };

  const currentStatus = useMemo(() => {
    if (!caseData?.status) return statusBadgeMap.draft;
    return (
      statusBadgeMap[caseData.status] || {
        label: caseData.status,
        className: "bg-muted text-muted-foreground",
      }
    );
  }, [caseData]);

  const currentStepIndex = useMemo(() => {
    if (!caseData?.status) return 0;
    const idx = timelineSteps.findIndex((step) => step.key === caseData.status);
    return idx >= 0 ? idx : 0;
  }, [caseData]);

  // ---------- Render: loading / error / not found ----------

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <Link
            to="/seller"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
          <Link
            to="/seller"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
          <Link
            to="/seller"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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

  // ---------- Render: main ----------

  return (
    <SellerLayout>
      <div className="space-y-6">
        <Link
          to="/seller"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
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
                          <div
                            className={cn(
                              "absolute left-[17px] top-[36px] w-0.5 h-[calc(100%-12px)]",
                              completed ? "bg-success" : current ? "bg-primary" : "bg-border",
                            )}
                          />
                        )}

                        <div
                          className={cn(
                            "relative z-10 flex items-center justify-center h-9 w-9 rounded-full shrink-0 border-2 transition-colors",
                            completed
                              ? "bg-success border-success text-success-foreground"
                              : current
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-muted border-border text-muted-foreground",
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : current ? (
                            <Icon className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>

                        <div className={cn("pb-8", isLast && "pb-0")}>
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              completed ? "text-success" : current ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {step.label}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-0.5",
                              completed || current ? "text-muted-foreground" : "text-muted-foreground/60",
                            )}
                          >
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
            {/* Document upload */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Dokumentumfeltöltés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Töltsd fel az ügyhöz kapcsolódó szükséges dokumentumokat.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Dokumentumtípus</Label>
                    <Select
                      value={selectedDocumentTypeId}
                      onValueChange={setSelectedDocumentTypeId}
                      disabled={isUploading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz dokumentumtípust" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((dt) => (
                          <SelectItem key={dt.id} value={dt.id}>
                            {dt.label}
                            {dt.is_required && " *"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Fájl kiválasztása</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      disabled={isUploading}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                  {uploadSuccessMessage && <p className="text-sm text-success">{uploadSuccessMessage}</p>}

                  <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Feltöltés folyamatban...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Dokumentum feltöltése
                      </>
                    )}
                  </Button>
                </div>

                {/* Uploaded documents list */}
                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Feltöltött dokumentumok</h3>

                  {uploadedDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Még nincs feltöltött dokumentum.</p>
                  ) : (
                    <div className="space-y-3">
                      {uploadedDocuments.map((doc) => (
                        <div key={doc.id} className="rounded-md border border-border p-3 space-y-1.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {doc.original_file_name || "Névtelen fájl"}
                              </p>
                              <p className="text-xs text-muted-foreground">{getDocTypeLabel(doc.document_type_id)}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              Feltöltés: {uploadStatusLabel(doc.upload_status)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Ellenőrzés: {reviewStatusLabel(doc.review_status)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              AI: {aiStatusLabel(doc.ai_status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Feltöltve: {formatDateTime(doc.uploaded_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Next action */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Következő teendő
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Az ügy aktuális állapota: {currentStatus.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Jelenlegi lépés: {caseData.current_step || "Nincs megadva"}
                </p>
                {caseData.status === "red_rejected" && (
                  <p className="text-sm text-destructive mt-2">
                    Ez az ügy elutasított státuszban van. Az admin ellenőrzés eredményét kell áttekinteni.
                  </p>
                )}
                {caseData.status === "cancelled" && (
                  <p className="text-sm text-destructive mt-2">Ez az ügy megszakított státuszban van.</p>
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
