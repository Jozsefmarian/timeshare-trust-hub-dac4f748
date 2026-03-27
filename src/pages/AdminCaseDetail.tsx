import { useParams, useNavigate } from "react-router-dom";
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
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Brain,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---------- Types ----------

type AdminCaseRow = {
  id: string;
  case_number: string;
  status: string;
  classification: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  seller_user_id: string;
};

type SellerProfile = {
  full_name: string | null;
  email: string;
  phone: string | null;
};

type CaseDocument = {
  id: string;
  original_file_name: string | null;
  file_name: string;
  document_type: string;
  document_type_id: string | null;
  upload_status: string;
  review_status: string;
  ai_status: string;
  uploaded_at: string | null;
  storage_bucket: string;
  storage_path: string | null;
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

type WeekOfferRow = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_type: string | null;
  season_label: string | null;
  rights_start_year: number | null;
  rights_end_year: number | null;
  usage_frequency: string | null;
};

type ClassificationRow = {
  id: string;
  classification: string;
  reason_summary: string | null;
  reason_codes: string[] | null;
  created_at: string;
};

type CheckResultRow = {
  id: string;
  document_id: string | null;
  check_type: string;
  result: string;
  severity: string | null;
  message: string | null;
  details: unknown;
  created_at: string;
};

type ContractRow = {
  id: string;
  case_id: string;
  contract_type: string;
  status: string;
  generated_file_name: string | null;
  generated_storage_bucket: string | null;
  generated_storage_path: string | null;
  signed_file_name: string | null;
  signed_storage_bucket: string | null;
  signed_storage_path: string | null;
  generated_at: string | null;
  signed_uploaded_at: string | null;
};

// ---------- Helpers ----------

async function updateDocumentReviewStatus(documentId: string, status: string) {
  const { error } = await supabase.from("documents").update({ review_status: status }).eq("id", documentId);
  if (error) throw error;
}

async function recalculateCaseStatus(caseId: string) {
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id, review_status, document_type_id")
    .eq("case_id", caseId);
  if (docsErr) throw docsErr;
  if (!docs || docs.length === 0) return;

  const { data: requiredTypes } = await supabase
    .from("document_types")
    .select("id")
    .eq("is_required", true)
    .eq("is_active", true);

  const requiredIds = new Set((requiredTypes ?? []).map((t) => t.id));
  const statuses = docs.map((d) => d.review_status);

  if (statuses.some((s) => s === "needs_reupload")) {
    await supabase.from("cases").update({ status: "documents_uploaded" }).eq("id", caseId);
    return;
  }
  if (statuses.some((s) => s === "rejected")) {
    await supabase.from("cases").update({ status: "review_in_progress" }).eq("id", caseId);
    return;
  }
  if (requiredIds.size > 0) {
    const approvedTypeIds = new Set(
      docs.filter((d) => d.review_status === "approved" && d.document_type_id).map((d) => d.document_type_id!),
    );
    const allRequiredApproved = [...requiredIds].every((id) => approvedTypeIds.has(id));
    if (allRequiredApproved) {
      await supabase.from("cases").update({ status: "ready_for_contract" }).eq("id", caseId);
      return;
    }
  } else {
    if (docs.length > 0 && statuses.every((s) => s === "approved")) {
      await supabase.from("cases").update({ status: "ready_for_contract" }).eq("id", caseId);
      return;
    }
  }
  if (statuses.some((s) => s !== "pending")) {
    await supabase.from("cases").update({ status: "review_in_progress" }).eq("id", caseId);
    return;
  }
  await supabase.from("cases").update({ status: "documents_uploaded" }).eq("id", caseId);
}

async function updateCaseInternalNote(caseId: string, note: string) {
  const { error } = await supabase
    .from("cases")
    .update({ internal_note: note } as any)
    .eq("id", caseId);
  if (error) throw error;
}

// ---------- Status helpers ----------

function reviewStatusLabel(s: string): string {
  switch (s) {
    case "pending": return "Függőben";
    case "approved": return "Jóváhagyva";
    case "rejected": return "Elutasítva";
    case "needs_reupload": return "Újrafeltöltés szükséges";
    default: return s;
  }
}

function reviewStatusClasses(s: string): string {
  switch (s) {
    case "pending": return "bg-muted text-muted-foreground";
    case "approved": return "bg-success/10 text-success";
    case "rejected": return "bg-destructive/10 text-destructive";
    case "needs_reupload": return "bg-warning/10 text-warning";
    default: return "bg-muted text-muted-foreground";
  }
}

function classificationLabel(c: string | null): string {
  switch (c) {
    case "green": return "Zöld";
    case "yellow": return "Sárga";
    case "red": return "Piros";
    default: return "Nincs besorolva";
  }
}

function classificationClasses(c: string | null): string {
  switch (c) {
    case "green": return "bg-success/10 text-success";
    case "yellow": return "bg-warning/10 text-warning";
    case "red": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
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

function contractTypeLabel(t: string): string {
  switch (t) {
    case "timeshare_transfer": return "Üdülőhasználati átadási szerződés";
    case "power_of_attorney": return "Meghatalmazás";
    case "share_transfer": return "Részvény adásvételi szerződés";
    case "securities_transfer": return "Értékpapír transzfer nyilatkozat";
    default: return t;
  }
}

function contractStatusLabel(s: string): string {
  switch (s) {
    case "pending_generation": return "Generálásra vár";
    case "generated": return "Generálva";
    case "awaiting_signature": return "Aláírásra vár";
    case "signed_uploaded": return "Aláírt példány feltöltve";
    case "verified": return "Ellenőrizve";
    default: return s;
  }
}

function contractStatusClasses(s: string): string {
  switch (s) {
    case "generated": return "bg-primary/10 text-primary";
    case "awaiting_signature": return "bg-warning/10 text-warning";
    case "signed_uploaded": return "bg-success/10 text-success";
    case "verified": return "bg-success/10 text-success";
    default: return "bg-muted text-muted-foreground";
  }
}

function usageFrequencyLabel(f: string | null): string {
  switch (f) {
    case "annual": return "Minden évben";
    case "biennial": return "Minden második évben";
    default: return f || "—";
  }
}

function checkResultBadgeClass(result: string): string {
  switch (result) {
    case "pass": return "bg-success/10 text-success";
    case "warning": return "bg-warning/10 text-warning";
    case "fail": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

// ---------- Component ----------

export default function AdminCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<AdminCaseRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [validationResults, setValidationResults] = useState<AiValidationResult[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [weekOffer, setWeekOffer] = useState<WeekOfferRow | null>(null);
  const [classificationRows, setClassificationRows] = useState<ClassificationRow[]>([]);
  const [checkResults, setCheckResults] = useState<CheckResultRow[]>([]);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [updatingClassification, setUpdatingClassification] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Load case + seller
  const loadCase = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select(
          "id, case_number, status, classification, internal_note, created_at, updated_at, submitted_at, seller_user_id" as any,
        )
        .eq("id", caseId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setCaseData(null);
        setIsLoading(false);
        return;
      }

      const row = data as any as AdminCaseRow;
      setCaseData(row);
      setComment(row.internal_note || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", row.seller_user_id)
        .maybeSingle();

      setSeller(profile as SellerProfile | null);
    } catch (err: any) {
      toast.error("Az ügy betöltése nem sikerült.");
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabase
      .from("documents")
      .select(
        "id, original_file_name, file_name, document_type, document_type_id, upload_status, review_status, ai_status, uploaded_at, storage_bucket, storage_path",
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data as CaseDocument[]);
  }, [caseId]);

  // Load document types
  const loadDocumentTypes = useCallback(async () => {
    const { data } = await supabase.from("document_types").select("id, code, label").eq("is_active", true);
    if (data) setDocumentTypes(data as DocumentType[]);
  }, []);

  // Load AI validation results (archived table – currently unused)
  const loadValidationResults = useCallback(async () => {
    setValidationResults([]);
  }, [caseId]);

  // Load contracts (multiple types)
  const loadContracts = useCallback(async () => {
    if (!caseId) return;
    const { data } = await (supabase as any)
      .from("contracts")
      .select(
        "id, case_id, contract_type, status, generated_file_name, generated_storage_bucket, generated_storage_path, signed_file_name, signed_storage_bucket, signed_storage_path, generated_at, signed_uploaded_at",
      )
      .eq("case_id", caseId)
      .in("contract_type", ["timeshare_transfer", "power_of_attorney", "share_transfer", "securities_transfer"])
      .order("created_at", { ascending: true });

    setContracts((data ?? []) as ContractRow[]);
  }, [caseId]);

  // Load week offer
  const loadWeekOffer = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabase
      .from("week_offers")
      .select("resort_name_raw, week_number, unit_type, season_label, rights_start_year, rights_end_year, usage_frequency")
      .eq("case_id", caseId)
      .maybeSingle();
    setWeekOffer(data as WeekOfferRow | null);
  }, [caseId]);

  // Load classifications + check_results
  const loadAiResults = useCallback(async () => {
    if (!caseId) return;
    const [classRes, checksRes] = await Promise.all([
      (supabase as any)
        .from("classifications")
        .select("id, classification, reason_summary, reason_codes, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("check_results")
        .select("id, document_id, check_type, result, severity, message, details, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false }),
    ]);
    setClassificationRows((classRes.data ?? []) as ClassificationRow[]);
    setCheckResults((checksRes.data ?? []) as CheckResultRow[]);
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      loadCase();
      loadDocuments();
      loadDocumentTypes();
      loadValidationResults();
      loadContracts();
      loadWeekOffer();
      loadAiResults();
    }
  }, [caseId, loadCase, loadDocuments, loadDocumentTypes, loadValidationResults, loadContracts, loadWeekOffer, loadAiResults]);

  // Actions
  const handleDocReview = async (docId: string, status: string) => {
    if (!caseId) return;
    try {
      setUpdatingDocId(docId);
      await updateDocumentReviewStatus(docId, status);
      await recalculateCaseStatus(caseId);
      toast.success(`Dokumentum státusz frissítve: ${reviewStatusLabel(status)}`);
      await Promise.all([loadDocuments(), loadCase()]);
    } catch {
      toast.error("A dokumentum státusz frissítése nem sikerült.");
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handleClassification = async (classification: string) => {
    if (!caseId) return;
    try {
      setUpdatingClassification(true);
      const { error } = await supabase.functions.invoke("admin-manual-classification", {
        body: {
          case_id: caseId,
          classification,
          reason: adminNote || "Admin besorolás az ügy detail oldalról",
        },
      });
      if (error) throw error;
      toast.success(`Ügy besorolása: ${classificationLabel(classification)}`);
      await Promise.all([loadCase(), loadAiResults()]);
    } catch {
      toast.error("A besorolás frissítése nem sikerült.");
    } finally {
      setUpdatingClassification(false);
    }
  };

  const handleSaveNote = async () => {
    if (!caseId) return;
    try {
      setIsSavingNote(true);
      await updateCaseInternalNote(caseId, comment);
      toast.success("Megjegyzés mentve.");
      await loadCase();
    } catch {
      toast.error("A megjegyzés mentése nem sikerült.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!caseId) return;
    try {
      setIsGeneratingContract(true);
      const { data, error } = await supabase.functions.invoke("generate-sale-contract", {
        body: { case_id: caseId },
      });
      if (error) throw error;
      toast.success("Adásvételi szerződés sikeresen generálva.");
      await Promise.all([loadContracts(), loadCase()]);
    } catch (err: any) {
      toast.error(err?.message || "A szerződés generálása nem sikerült.");
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleOpenContractFile = async (bucket: string | null, path: string | null, label: string) => {
    if (!bucket || !path) {
      toast.error(`A ${label} fájl útvonala hiányzik.`);
      return;
    }
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error(`A ${label} megnyitása nem sikerült.`);
    }
  };

  const handleOpenDocument = async (doc: CaseDocument) => {
    if (!doc.storage_bucket || !doc.storage_path) {
      toast.error("A dokumentum tárolási útvonala hiányzik.");
      return;
    }
    try {
      setPreviewLoadingId(doc.id);
      const { data, error } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("A dokumentum megnyitása nem sikerült.");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const getDocTypeLabel = (docTypeId: string | null): string => {
    if (!docTypeId) return "—";
    return documentTypes.find((t) => t.id === docTypeId)?.label || "Ismeretlen típus";
  };

  const latestClassification = classificationRows[0] ?? null;

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

  if (!caseData) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">Az ügy nem található.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{caseData.case_number}</h1>
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                {caseData.status}
              </Badge>
              <Badge variant="outline" className={classificationClasses(caseData.classification)}>
                {classificationLabel(caseData.classification)}
              </Badge>
            </div>
            {seller && <p className="text-muted-foreground text-sm mt-0.5">{seller.full_name || seller.email}</p>}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Eladói adatok */}
            {seller && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Eladói adatok
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InfoRow label="Teljes név" value={seller.full_name || "—"} />
                    <InfoRow label="Email" value={seller.email} />
                    <InfoRow label="Telefonszám" value={seller.phone || "—"} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dokumentumok */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Dokumentumok ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-4">Még nincs feltöltött dokumentum.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {documents.map((doc) => (
                      <div key={doc.id} className="px-6 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {getDocTypeLabel(doc.document_type_id)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.original_file_name || doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(doc.uploaded_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={reviewStatusClasses(doc.review_status)}>
                              {reviewStatusLabel(doc.review_status)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={previewLoadingId === doc.id || !doc.storage_path}
                              onClick={() => handleOpenDocument(doc)}
                            >
                              {previewLoadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {/* Document review actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success/30 hover:bg-success/10"
                            disabled={updatingDocId === doc.id || doc.review_status === "approved"}
                            onClick={() => handleDocReview(doc.id, "approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Jóváhagy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={updatingDocId === doc.id || doc.review_status === "rejected"}
                            onClick={() => handleDocReview(doc.id, "rejected")}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            Elutasít
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-warning border-warning/30 hover:bg-warning/10"
                            disabled={updatingDocId === doc.id || doc.review_status === "needs_reupload"}
                            onClick={() => handleDocReview(doc.id, "needs_reupload")}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Újrafeltöltést kér
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Üdülési hét adatai */}
            {weekOffer && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Üdülési hét adatai
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <InfoRow label="Üdülőhely" value={weekOffer.resort_name_raw || "—"} />
                    <InfoRow label="Hét száma" value={weekOffer.week_number ? `${weekOffer.week_number}. hét` : "—"} />
                    <InfoRow label="Apartman típus" value={weekOffer.unit_type || "—"} />
                    <InfoRow label="Szezon" value={weekOffer.season_label || "—"} />
                    <InfoRow
                      label="Jogosultság időszaka"
                      value={
                        weekOffer.rights_start_year && weekOffer.rights_end_year
                          ? `${weekOffer.rights_start_year} – ${weekOffer.rights_end_year}`
                          : "—"
                      }
                    />
                    <InfoRow label="Használat gyakorisága" value={usageFrequencyLabel(weekOffer.usage_frequency)} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI ellenőrzési eredmények */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI ellenőrzési eredmények
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {classificationRows.length === 0 && checkResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Még nincs AI ellenőrzési eredmény.</p>
                ) : (
                  <>
                    {latestClassification && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Legutóbbi besorolás:</span>
                          <Badge
                            variant="outline"
                            className={classificationClasses(latestClassification.classification)}
                          >
                            {classificationLabel(latestClassification.classification)}
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

                    {checkResults.length > 0 && (
                      <div className="rounded-lg border">
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-medium">Ellenőrzési tételek</p>
                        </div>
                        <div className="divide-y divide-border">
                          {checkResults.map((check) => {
                            const relatedDoc = documents.find((d) => d.id === check.document_id);
                            return (
                              <div key={check.id} className="px-4 py-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={checkResultBadgeClass(check.result)}>
                                    {check.result}
                                  </Badge>
                                  <span className="text-sm font-medium">{check.check_type}</span>
                                  {check.severity && <Badge variant="outline">{check.severity}</Badge>}
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
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Időpontok */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Időpontok
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <InfoRow label="Létrehozva" value={formatDate(caseData.created_at)} />
                  <InfoRow label="Utolsó módosítás" value={formatDate(caseData.updated_at)} />
                  <InfoRow label="Beküldve" value={formatDate(caseData.submitted_at)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Szerződések */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Szerződések
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contracts.length > 0 ? (
                  <div className="space-y-4">
                    {contracts.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3 space-y-2">
                        <p className="text-sm font-medium">{contractTypeLabel(c.contract_type)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Státusz:</span>
                          <Badge variant="outline" className={contractStatusClasses(c.status)}>
                            {contractStatusLabel(c.status)}
                          </Badge>
                        </div>
                        {c.generated_at && (
                          <p className="text-xs text-muted-foreground">Generálva: {formatDateTime(c.generated_at)}</p>
                        )}
                        <div className="flex flex-col gap-1">
                          {c.generated_storage_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenContractFile(c.generated_storage_bucket, c.generated_storage_path, "generált szerződés")
                              }
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Megnyitás
                            </Button>
                          )}
                          {c.signed_storage_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenContractFile(c.signed_storage_bucket, c.signed_storage_path, "aláírt szerződés")
                              }
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Aláírt megnyitása
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Még nincs generált szerződés.</p>
                )}
                <Button className="w-full" disabled={isGeneratingContract} onClick={handleGenerateContract}>
                  {isGeneratingContract ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generálás...
                    </>
                  ) : (
                    "Adásvételi szerződés generálása"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Besorolás */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ügy besorolása</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Indoklás (ajánlott, de nem kötelező)"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
                <Button
                  className="w-full justify-start gap-2 bg-success hover:bg-success/90 text-success-foreground"
                  disabled={updatingClassification || caseData.classification === "green"}
                  onClick={() => handleClassification("green")}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Zöld
                </Button>
                <Button
                  className="w-full justify-start gap-2 bg-warning hover:bg-warning/90 text-warning-foreground"
                  disabled={updatingClassification || caseData.classification === "yellow"}
                  onClick={() => handleClassification("yellow")}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Sárga
                </Button>
                <Button
                  className="w-full justify-start gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  disabled={updatingClassification || caseData.classification === "red"}
                  onClick={() => handleClassification("red")}
                >
                  <ShieldX className="h-4 w-4" />
                  Piros
                </Button>
                <p className="text-xs text-muted-foreground">Az indoklás mező kitöltése ajánlott, de nem kötelező.</p>
              </CardContent>
            </Card>

            {/* Belső megjegyzés */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Belső admin megjegyzés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Írja be a belső megjegyzést..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
                <Button className="w-full" disabled={isSavingNote} onClick={handleSaveNote}>
                  {isSavingNote ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Mentés...
                    </>
                  ) : (
                    "Megjegyzés mentése"
                  )}
                </Button>
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
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
