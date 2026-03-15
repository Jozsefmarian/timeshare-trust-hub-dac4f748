import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type AiValidationResult = {
  id: string;
  document_id: string;
  validation_status: string;
  field_match_score: number | null;
  keyword_flags: Record<string, unknown> | null;
  notes: string | null;
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
    case "support":
      return "Support";
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
    case "support":
    case "failed":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function normalizeKeywordFlags(flags: Record<string, unknown> | null): string[] {
  if (!flags) return [];

  if (Array.isArray(flags)) {
    return flags.map(String).filter(Boolean);
  }

  return Object.entries(flags).flatMap(([key, value]) => {
    if (value === true) return [key];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [`${key}: ${value}`];
    if (typeof value === "number") return [`${key}: ${value}`];
    return [];
  });
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

// ---------- Component ----------

export default function AdminCaseReview() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [weekOffer, setWeekOffer] = useState<WeekOffer | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [validationResults, setValidationResults] = useState<AiValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [isCaseAction, setIsCaseAction] = useState(false);

  // Modals
  const [requestFixOpen, setRequestFixOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [requestFixNote, setRequestFixNote] = useState("");
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

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
      const [profileRes, offerRes, docsRes, dtRes, valRes] = await Promise.all([
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
          .from("ai_validation_results" as any)
          .select("id, document_id, validation_status, field_match_score, keyword_flags, notes")
          .eq("case_id", caseId),
      ]);

      setSeller(profileRes.data as SellerProfile | null);
      setWeekOffer(offerRes.data as WeekOffer | null);
      setDocuments((docsRes.data ?? []) as CaseDocument[]);
      setDocumentTypes((dtRes.data ?? []) as DocumentType[]);
      setValidationResults((valRes.data ?? []) as any as AiValidationResult[]);
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

  const canApproveCase =
    documents.length > 0 && documents.every((d) => d.upload_status === "completed" && d.review_status === "approved");

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

  const handleApproveCase = () => updateCaseStatus("contract_pending", adminNote || undefined);

  const handleRequestFix = async () => {
    await updateCaseStatus("under_review", requestFixNote);
    setRequestFixOpen(false);
    setRequestFixNote("");
  };

  const handleRejectCase = async () => {
    await updateCaseStatus("closed", adminNote?.trim() ? `Admin által lezárva. ${adminNote}` : "Admin által lezárva");
    setRejectConfirmOpen(false);
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
              <CardContent className="p-0">
                {validationResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-6 text-center">Nincs AI ellenőrzési eredmény.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {validationResults.map((vr) => {
                      const doc = documents.find((d) => d.id === vr.document_id);
                      const docName = doc ? doc.original_file_name || doc.file_name : "Ismeretlen dokumentum";
                      const keywordItems = normalizeKeywordFlags(vr.keyword_flags as Record<string, unknown> | null);
                      return (
                        <div key={vr.id} className="px-6 py-4 space-y-2">
                          <p className="text-sm font-medium text-foreground">{docName}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <Badge className={aiValidationBadgeClasses(vr.validation_status)}>
                              {aiValidationBadgeLabel(vr.validation_status)}
                            </Badge>

                            {vr.field_match_score != null && (
                              <span className="text-sm text-foreground">
                                Egyezési pont: <strong>{vr.field_match_score}%</strong>
                              </span>
                            )}
                          </div>

                          {keywordItems.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Kulcsszó jelzések</p>
                              <div className="flex flex-wrap gap-2">
                                {keywordItems.map((item) => (
                                  <Badge key={item} variant="outline">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {vr.notes && <p className="text-xs text-muted-foreground">{vr.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
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
                  disabled={isCaseAction || !canApproveCase}
                  onClick={handleApproveCase}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Ügy jóváhagyása
                  {!canApproveCase && documents.length > 0 && (
                    <span className="text-xs ml-auto opacity-70">(Nem minden dokumentum jóváhagyott még.)</span>
                  )}
                  {documents.length === 0 && <span className="text-xs ml-auto opacity-70">(Nincs dokumentum)</span>}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-warning border-warning/30 hover:bg-warning/10"
                  disabled={isCaseAction}
                  onClick={() => setRequestFixOpen(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Javítás kérése
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={isCaseAction}
                  onClick={() => setRejectConfirmOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Elutasítás / Lezárás
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Request Fix Modal */}
      <Dialog open={requestFixOpen} onOpenChange={setRequestFixOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Javítás kérése</DialogTitle>
            <DialogDescription>Adjon meg egy megjegyzést az eladónak a szükséges javításokról.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Mi a javítandó..."
            value={requestFixNote}
            onChange={(e) => setRequestFixNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestFixOpen(false)}>
              Mégsem
            </Button>
            <Button disabled={isCaseAction} onClick={handleRequestFix}>
              {isCaseAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Javítás kérése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation */}
      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ügy elutasítása / lezárása</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan el szeretné utasítani és lezárni ezt az ügyet? Ez a művelet a státuszt „Lezárva" értékre állítja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCaseAction}
              onClick={handleRejectCase}
            >
              Elutasítás és lezárás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
