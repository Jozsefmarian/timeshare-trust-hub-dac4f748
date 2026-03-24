import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Eye,
  FileText,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  XCircle,
  Loader2,
  ClipboardList,
  Brain,
  Gavel,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------- Types ----------

type CaseRow = {
  id: string;
  case_number: string;
  status: string;
  classification: string | null;
  created_at: string;
  seller_user_id: string;
};

type SellerProfile = {
  full_name: string | null;
  email: string;
  phone: string | null;
};

type WeekOffer = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_type: string | null;
  season_label: string | null;
};

type CaseDocument = {
  id: string;
  document_type: string;
  document_type_id: string | null;
  original_file_name: string | null;
  file_name: string;
  storage_bucket: string;
  storage_path: string | null;
  upload_status: string;
  review_status: string;
  ai_status: string;
  uploaded_at: string | null;
};

type DocumentType = {
  id: string;
  code: string;
  label: string;
};

// ---------- Helpers ----------

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function reviewStatusLabel(s: string): string {
  switch (s) {
    case "pending":
      return "Függőben";
    case "approved":
      return "Jóváhagyva";
    case "rejected":
      return "Elutasítva";
    case "needs_reupload":
      return "Újrafeltöltés szükséges";
    default:
      return s;
  }
}

function reviewStatusClasses(s: string): string {
  switch (s) {
    case "approved":
      return "bg-success/10 text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    case "needs_reupload":
      return "bg-warning/10 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function uploadStatusLabel(s: string): string {
  switch (s) {
    case "completed":
      return "Feltöltve";
    case "uploaded":
      return "Feltöltve";
    case "initiated":
      return "Folyamatban";
    case "failed":
      return "Sikertelen";
    default:
      return s;
  }
}

function aiStatusLabel(s: string): string {
  switch (s) {
    case "pending":
      return "Függőben";
    case "processing":
      return "Feldolgozás";
    case "completed":
      return "Kész";
    case "failed":
      return "Sikertelen";
    default:
      return s;
  }
}

function classificationLabel(c: string | null): string {
  switch (c) {
    case "green":
      return "Zöld";
    case "yellow":
      return "Sárga";
    case "red":
      return "Piros";
    default:
      return "Nincs";
  }
}

function aiValidationBadgeLabel(s: string): string {
  switch (s) {
    case "green":
      return "Zöld";
    case "yellow":
      return "Sárga";
    case "red":
      return "Piros";
    case "manual_review":
      return "Manuális ellenőrzés";
    case "pending":
      return "Függőben";
    case "processing":
      return "Feldolgozás";
    case "completed":
      return "Kész";
    case "failed":
      return "Sikertelen";
    default:
      return s;
  }
}

function aiValidationBadgeClasses(s: string): string {
  switch (s) {
    case "green":
      return "bg-success/10 text-success";
    case "yellow":
    case "manual_review":
      return "bg-warning/10 text-warning";
    case "red":
    case "failed":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function classificationClasses(c: string | null): string {
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

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    draft: "Piszkozat",
    submitted: "Beküldve",
    documents_uploaded: "Dokumentumok feltöltve",
    ai_check: "AI ellenőrzés",
    under_review: "Ellenőrzés alatt",
    contract_pending: "Szerződés készül",
    payment_pending: "Fizetésre vár",
    closed: "Lezárva",
  };
  return map[s] ?? s;
}

type EffectiveAiDecision = "pending" | "green" | "yellow" | "red";

function caseAiDecisionLabel(status: EffectiveAiDecision): string {
  switch (status) {
    case "green":
      return "AI döntés: Zöld";
    case "yellow":
      return "AI döntés: Sárga";
    case "red":
      return "AI döntés: Piros";
    default:
      return "AI döntés: Függőben";
  }
}

function caseAiDecisionClasses(status: EffectiveAiDecision): string {
  switch (status) {
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

export default function AdminCaseReview() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [weekOffer, setWeekOffer] = useState<WeekOffer | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [classificationRows, setClassificationRows] = useState([]);
  const [checkResults, setCheckResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [isCaseAction, setIsCaseAction] = useState(false);

  const [adminNote, setAdminNote] = useState("");

  // ---------- Data Loading ----------

  const loadAll = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Load case
      const { data: cd, error: ce } = await supabase
        .from("cases")
        .select("id, case_number, status, classification, created_at, seller_user_id")
        .eq("id", caseId)
        .maybeSingle();
      if (ce) throw ce;
      if (!cd) {
        setCaseData(null);
        return;
      }
      setCaseData(cd as CaseRow);

      // Parallel loads
      const [profileRes, offerRes, docsRes, dtRes, classRes, checksRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone").eq("id", cd.seller_user_id).maybeSingle(),
        supabase
          .from("week_offers")
          .select("resort_name_raw, week_number, unit_type, season_label")
          .eq("case_id", caseId)
          .maybeSingle(),
        supabase
          .from("documents")
          .select(
            "id, document_type, document_type_id, original_file_name, file_name, storage_bucket, storage_path, upload_status, review_status, ai_status, uploaded_at",
          )
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        supabase.from("document_types").select("id, code, label").eq("is_active", true),
        supabase
          .from("classifications" as any)
          .select("id, classification, reason_summary, reason_codes, created_at")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        supabase
          .from("check_results" as any)
          .select("id, document_id, check_type, result, severity, message, details, created_at")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
      ]);

      setSeller(profileRes.data as SellerProfile | null);
      setWeekOffer(offerRes.data as WeekOffer | null);
      setDocuments((docsRes.data ?? []) as CaseDocument[]);
      setDocumentTypes((dtRes.data ?? []) as DocumentType[]);
      setClassificationRows((classRes.data ?? []) as any[]);
      setCheckResults((checksRes.data ?? []) as any[]);
    } catch (err: any) {
      setError(err.message || "Betöltési hiba.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---------- Helpers ----------

  const getDocTypeLabel = (doc: CaseDocument): string => {
    if (doc.document_type_id) {
      const dt = documentTypes.find((t) => t.id === doc.document_type_id);
      if (dt) return dt.label;
    }
    return doc.document_type || "Ismeretlen";
  };

  const latestClassification = classificationRows[0] ?? null;

  const caseAiDecision: EffectiveAiDecision =
    latestClassification?.classification === "green"
      ? "green"
      : latestClassification?.classification === "yellow"
        ? "yellow"
        : latestClassification?.classification === "red"
          ? "red"
          : "pending";


  // ---------- Document Actions ----------

  const handleDocReview = async (docId: string, status: string) => {
    if (!caseId) return;
    try {
      setUpdatingDocId(docId);
      const { error } = await supabase.from("documents").update({ review_status: status }).eq("id", docId);
      if (error) throw error;
      toast.success(`Dokumentum: ${reviewStatusLabel(status)}`);
      await loadAll();
    } catch {
      toast.error("A dokumentum státusz frissítése nem sikerült.");
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handlePreview = async (doc: CaseDocument) => {
    if (!doc.storage_bucket || !doc.storage_path) {
      toast.error("A dokumentum tárolási útvonala hiányzik.");
      return;
    }
    try {
      setPreviewLoadingId(doc.id);
      const { data, error } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("A dokumentum megnyitása nem sikerült.");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // ---------- Case-Level Actions ----------

  const updateCaseStatus = async (newStatus: string, note?: string) => {
    if (!caseId) return;
    try {
      setIsCaseAction(true);
      const { error: updateErr } = await supabase
        .from("cases")
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq("id", caseId);
      if (updateErr) throw updateErr;

      // Try to insert status history (non-blocking)
      try {
        await (supabase as any).from("case_status_history").insert({
          case_id: caseId,
          from_status: caseData?.status ?? null,
          to_status: newStatus,
          changed_by_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          change_source: "admin_review",
          note: note || null,
        });
      } catch {
        /* non-critical */
      }

      toast.success(`Ügy státusza frissítve: ${statusLabel(newStatus)}`);
      await loadAll();
    } catch {
      toast.error("Az ügy státuszának frissítése nem sikerült.");
    } finally {
      setIsCaseAction(false);
    }
  };

  const handleManualClassification = async (classification: "green" | "yellow" | "red", reason: string) => {
    try {
      setIsCaseAction(true);
      const { error } = await supabase.functions.invoke("admin-manual-classification", {
        body: {
          case_id: caseId,
          classification,
          reason,
        },
      });
      if (error) throw error;
      toast.success(`Besorolás frissítve: ${classificationLabel(classification)}`);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "A besorolás frissítése nem sikerült.");
    } finally {
      setIsCaseAction(false);
    }
  };


  // ---------- Render ----------

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !caseData) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">{error || "Az ügy nem található."}</p>
              {error && (
                <Button variant="outline" size="sm" className="mt-4" onClick={loadAll}>
                  Újrapróbálás
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/cases/${caseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">Ügy áttekintése</h1>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                {caseData.case_number}
              </Badge>
              <Badge variant="outline" className={classificationClasses(caseData.classification)}>
                {classificationLabel(caseData.classification)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Ügy összefoglaló
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Ügy száma" value={caseData.case_number} />
                <InfoRow label="Státusz" value={statusLabel(caseData.status)} />
                <InfoRow label="Besorolás" value={classificationLabel(caseData.classification)} />
                <InfoRow label="Létrehozva" value={formatDate(caseData.created_at)} />
                <Separator />
                {seller && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Eladó adatai</p>
                    <InfoRow label="Név" value={seller.full_name || "—"} />
                    <InfoRow label="Email" value={seller.email} />
                    <InfoRow label="Telefon" value={seller.phone || "—"} />
                  </>
                )}
                {weekOffer && (
                  <>
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Üdülési hét</p>
                    <InfoRow label="Üdülőhely" value={weekOffer.resort_name_raw || "—"} />
                    <InfoRow label="Hét száma" value={weekOffer.week_number?.toString() || "—"} />
                    <InfoRow label="Apartman típus" value={weekOffer.unit_type || "—"} />
                    <InfoRow label="Szezon" value={weekOffer.season_label || "—"} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Seller Form Data */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Eladói form adatok
                </CardTitle>
              </CardHeader>
              <CardContent>
                {seller ? (
                  <div className="space-y-2">
                    <InfoRow label="Teljes név" value={seller.full_name || "—"} />
                    <InfoRow label="Email" value={seller.email} />
                    <InfoRow label="Telefonszám" value={seller.phone || "—"} />
                    {weekOffer && (
                      <>
                        <Separator className="my-2" />
                        <InfoRow label="Üdülőhely (nyers)" value={weekOffer.resort_name_raw || "—"} />
                        <InfoRow label="Hét" value={weekOffer.week_number?.toString() || "—"} />
                        <InfoRow label="Típus" value={weekOffer.unit_type || "—"} />
                        <InfoRow label="Szezon" value={weekOffer.season_label || "—"} />
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nincs elérhető eladói adat.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Documents Review */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Feltöltött dokumentumok ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-8 text-center">
                    Még nincs feltöltött dokumentum ehhez az ügyhez.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {documents.map((doc) => {
                      const canReviewDocument = doc.upload_status === "completed";
                      const canPreviewDocument =
                        !!doc.storage_bucket && !!doc.storage_path && doc.upload_status === "completed";

                      return (
                        <div key={doc.id} className="px-6 py-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{getDocTypeLabel(doc)}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.original_file_name || doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(doc.uploaded_at)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <Badge variant="outline" className="text-xs">
                                {uploadStatusLabel(doc.upload_status)}
                              </Badge>
                              <Badge variant="outline" className={reviewStatusClasses(doc.review_status) + " text-xs"}>
                                {reviewStatusLabel(doc.review_status)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {aiStatusLabel(doc.ai_status)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canPreviewDocument || previewLoadingId === doc.id}
                              onClick={() => handlePreview(doc)}
                            >
                              {previewLoadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Eye className="h-4 w-4 mr-2" />
                              )}
                              Megtekintés
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              disabled={
                                !canReviewDocument || updatingDocId === doc.id || doc.review_status === "approved"
                              }
                              onClick={() => handleDocReview(doc.id, "approved")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Jóváhagy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-warning border-warning/30 hover:bg-warning/10"
                              disabled={
                                !canReviewDocument || updatingDocId === doc.id || doc.review_status === "needs_reupload"
                              }
                              onClick={() => handleDocReview(doc.id, "needs_reupload")}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Újrafeltöltés
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={
                                !canReviewDocument || updatingDocId === doc.id || doc.review_status === "rejected"
                              }
                              onClick={() => handleDocReview(doc.id, "rejected")}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Elutasít
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Validation Results */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI ellenőrzési eredmények
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {classificationRows.length === 0 && checkResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nincs AI ellenőrzési eredmény.</p>
                ) : (
                  <>
                    {latestClassification && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Legutóbbi besorolás:</span>
                          <Badge
                            variant="outline"
                            className={classificationClasses(latestClassification.classification ?? null)}
                          >
                            {classificationLabel(latestClassification.classification ?? null)}
                          </Badge>
                        </div>

                        {latestClassification.reason_summary && (
                          <p className="text-sm text-muted-foreground">{latestClassification.reason_summary}</p>
                        )}

                        {Array.isArray(latestClassification.reason_codes) &&
                          latestClassification.reason_codes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {latestClassification.reason_codes.map((code: string) => (
                                <Badge key={code} variant="outline">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          )}
                      </div>
                    )}

                    <div className="rounded-lg border">
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium">Ellenőrzési tételek</p>
                      </div>

                      {checkResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-4">Nincs check_results rekord.</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {checkResults.map((check: any) => {
                            const relatedDoc = documents.find((d) => d.id === check.document_id);

                            const badgeClass =
                              check.result === "pass"
                                ? "bg-success/10 text-success"
                                : check.result === "warning"
                                  ? "bg-warning/10 text-warning"
                                  : check.result === "fail"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-muted text-muted-foreground";

                            return (
                              <div key={check.id} className="px-4 py-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={badgeClass}>{String(check.result ?? "info")}</Badge>
                                  <span className="text-sm font-medium">{check.check_type}</span>
                                  {check.severity && <Badge variant="outline">{String(check.severity)}</Badge>}
                                </div>

                                {check.message && <p className="text-sm text-muted-foreground">{check.message}</p>}

                                {relatedDoc && (
                                  <p className="text-xs text-muted-foreground">
                                    Dokumentum: {relatedDoc.original_file_name || relatedDoc.file_name}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Case-Level Decision */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  Ügy szintű döntés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Összesített AI döntés</p>
                  <Badge className={caseAiDecisionClasses(caseAiDecision)}>{caseAiDecisionLabel(caseAiDecision)}</Badge>

                  {caseAiDecision === "green" && (
                    <p className="text-xs text-muted-foreground">
                      A dokumentumok AI szempontból tisztának tűnnek. Az ügy mehet tovább admin jóváhagyással.
                    </p>
                  )}

                  {caseAiDecision === "yellow" && (
                    <p className="text-xs text-muted-foreground">
                      Az AI manuális ellenőrzést javasol. Admin döntés szükséges.
                    </p>
                  )}

                  {caseAiDecision === "red" && (
                    <p className="text-xs text-muted-foreground">
                      Az AI piros jelzést adott. Az ügyet nem szabad automatikusan továbbengedni.
                    </p>
                  )}

                  {caseAiDecision === "pending" && (
                    <p className="text-xs text-muted-foreground">
                      Az AI ellenőrzés még nem ért véget, vagy még nincs teljes eredmény.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Belső admin megjegyzés</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Belső megjegyzés admin használatra. Audit logba is bekerülhet."
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full justify-start gap-2"
                  onClick={() => handleManualClassification("green", adminNote || "Admin manuális jóváhagyás")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Zöldre állítás
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleManualClassification("red", adminNote || "Admin elutasítás")}
                >
                  <XCircle className="h-4 w-4" />
                  Pirosra állítás
                </Button>
                <p className="text-xs text-muted-foreground">
                  Az indoklás mező kitöltése ajánlott, de nem kötelező.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-xs text-muted-foreground shrink-0">{label}</p>
      <p className="text-sm text-foreground text-right">{value}</p>
    </div>
  );
}
