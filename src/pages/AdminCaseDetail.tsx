import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Download, Eye, FileText, User, MapPin, Calendar,
  CheckCircle2, AlertTriangle, MessageSquare, RotateCcw,
  ShieldCheck, ShieldAlert, ShieldX, Loader2,
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

// ---------- Helpers ----------

async function updateDocumentReviewStatus(documentId: string, status: string) {
  const { error } = await supabase
    .from("documents")
    .update({ review_status: status })
    .eq("id", documentId);
  if (error) throw error;
}

async function recalculateCaseStatus(caseId: string) {
  // 1) Load all documents for this case
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id, review_status, document_type_id")
    .eq("case_id", caseId);
  if (docsErr) throw docsErr;
  if (!docs || docs.length === 0) return; // no docs → no change

  // 2) Load required document types
  const { data: requiredTypes } = await supabase
    .from("document_types")
    .select("id")
    .eq("is_required", true)
    .eq("is_active", true);

  const requiredIds = new Set((requiredTypes ?? []).map((t) => t.id));

  const statuses = docs.map((d) => d.review_status);

  // Rule 5: any needs_reupload → documents_uploaded
  if (statuses.some((s) => s === "needs_reupload")) {
    await supabase.from("cases").update({ status: "documents_uploaded" }).eq("id", caseId);
    return;
  }

  // Rule 4: any rejected → review_in_progress
  if (statuses.some((s) => s === "rejected")) {
    await supabase.from("cases").update({ status: "review_in_progress" }).eq("id", caseId);
    return;
  }

  // Rule 3: all required docs approved → ready_for_contract
  if (requiredIds.size > 0) {
    const approvedTypeIds = new Set(
      docs.filter((d) => d.review_status === "approved" && d.document_type_id).map((d) => d.document_type_id!)
    );
    const allRequiredApproved = [...requiredIds].every((id) => approvedTypeIds.has(id));
    if (allRequiredApproved) {
      await supabase.from("cases").update({ status: "ready_for_contract" }).eq("id", caseId);
      return;
    }
  } else {
    // No required types defined: if all docs approved → ready
    if (docs.length > 0 && statuses.every((s) => s === "approved")) {
      await supabase.from("cases").update({ status: "ready_for_contract" }).eq("id", caseId);
      return;
    }
  }

  // Rule 2: at least one review started (not pending) → review_in_progress
  if (statuses.some((s) => s !== "pending")) {
    await supabase.from("cases").update({ status: "review_in_progress" }).eq("id", caseId);
    return;
  }

  // Rule 1: has documents → documents_uploaded
  await supabase.from("cases").update({ status: "documents_uploaded" }).eq("id", caseId);
}

async function updateCaseClassification(caseId: string, classification: string) {
  const { error } = await supabase
    .from("cases")
    .update({ classification } as any)
    .eq("id", caseId);
  if (error) throw error;
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
  return d.toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

// ---------- Component ----------

export default function AdminCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<AdminCaseRow | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [validationResults, setValidationResults] = useState<AiValidationResult[]>([]);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
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
        .select("id, case_number, status, classification, internal_note, created_at, updated_at, submitted_at, seller_user_id" as any)
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

      // Load seller profile
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
      .select("id, original_file_name, file_name, document_type, document_type_id, upload_status, review_status, ai_status, uploaded_at, storage_bucket, storage_path")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data as CaseDocument[]);
  }, [caseId]);

  // Load document types
  const loadDocumentTypes = useCallback(async () => {
    const { data } = await supabase
      .from("document_types")
      .select("id, code, label")
      .eq("is_active", true);

    if (data) setDocumentTypes(data as DocumentType[]);
  }, []);

  // Load AI validation results
  const loadValidationResults = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabase
      .from("ai_validation_results" as any)
      .select("id, document_id, validation_status, field_match_score, keyword_flags, notes")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (data) setValidationResults(data as any as AiValidationResult[]);
  }, [caseId]);

  // Load contract
  const loadContract = useCallback(async () => {
    if (!caseId) return;
    const { data } = await (supabase as any)
      .from("contracts")
      .select("id, case_id, contract_type, status, generated_file_name, generated_storage_bucket, generated_storage_path, signed_file_name, signed_storage_bucket, signed_storage_path, generated_at, signed_uploaded_at")
      .eq("case_id", caseId)
      .eq("contract_type", "sale_contract")
      .maybeSingle();

    setContract(data as ContractRow | null);
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      loadCase();
      loadDocuments();
      loadDocumentTypes();
      loadValidationResults();
      loadContract();
    }
  }, [caseId, loadCase, loadDocuments, loadDocumentTypes, loadValidationResults, loadContract]);

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
      await updateCaseClassification(caseId, classification);
      toast.success(`Ügy besorolása: ${classificationLabel(classification)}`);
      await loadCase();
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
      await Promise.all([loadContract(), loadCase()]);
    } catch (err: any) {
      toast.error(err?.message || "A szerződés generálása nem sikerült.");
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleOpenContract = async () => {
    if (!contract?.generated_storage_bucket || !contract?.generated_storage_path) {
      toast.error("A szerződés fájl útvonala hiányzik.");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from(contract.generated_storage_bucket)
        .createSignedUrl(contract.generated_storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("A szerződés megnyitása nem sikerült.");
    }
  };

  const handleOpenSignedContract = async () => {
    if (!contract?.signed_storage_bucket || !contract?.signed_storage_path) {
      toast.error("Az aláírt szerződés fájl útvonala hiányzik.");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from(contract.signed_storage_bucket)
        .createSignedUrl(contract.signed_storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Az aláírt szerződés megnyitása nem sikerült.");
    }
  };

    if (!doc.storage_bucket || !doc.storage_path) {
      toast.error("A dokumentum tárolási útvonala hiányzik.");
      return;
    }
    try {
      setPreviewLoadingId(doc.id);
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 60);
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
              <Badge variant="outline" className="bg-muted text-muted-foreground">{caseData.status}</Badge>
              <Badge variant="outline" className={classificationClasses(caseData.classification)}>
                {classificationLabel(caseData.classification)}
              </Badge>
            </div>
            {seller && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {seller.full_name || seller.email}
              </p>
            )}
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
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(doc.uploaded_at)}
                              </p>
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

            {/* Ellenőrzési eredmény */}
            {validationResults.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Ellenőrzési eredmény
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {validationResults.map((vr) => {
                      const docName =
                        documents.find((d) => d.id === vr.document_id)?.original_file_name ||
                        documents.find((d) => d.id === vr.document_id)?.file_name ||
                        "Ismeretlen dokumentum";
                      return (
                        <div key={vr.id} className="px-6 py-4 space-y-2">
                          <p className="text-sm font-medium text-foreground">{docName}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                vr.validation_status === "completed"
                                  ? "bg-success/10 text-success"
                                  : vr.validation_status === "processing"
                                  ? "bg-warning/10 text-warning"
                                  : vr.validation_status === "failed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {vr.validation_status === "completed"
                                ? "Kész"
                                : vr.validation_status === "processing"
                                ? "Feldolgozás alatt"
                                : vr.validation_status === "failed"
                                ? "Sikertelen"
                                : "Függőben"}
                            </Badge>
                            {vr.field_match_score != null && (
                              <span className="text-sm text-foreground">
                                Egyezési pont: <strong>{vr.field_match_score}%</strong>
                              </span>
                            )}
                          </div>
                          {vr.notes && (
                            <p className="text-xs text-muted-foreground">{vr.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Szerződés */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Szerződés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contract ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Státusz:</span>
                        <Badge variant="outline" className={contractStatusClasses(contract.status)}>
                          {contractStatusLabel(contract.status)}
                        </Badge>
                      </div>
                      {contract.generated_file_name && (
                        <p className="text-xs text-muted-foreground">
                          Fájl: {contract.generated_file_name}
                        </p>
                      )}
                      {contract.generated_at && (
                        <p className="text-xs text-muted-foreground">
                          Generálva: {formatDateTime(contract.generated_at)}
                        </p>
                      )}
                      {contract.signed_uploaded_at && (
                        <p className="text-xs text-muted-foreground">
                          Aláírt feltöltve: {formatDateTime(contract.signed_uploaded_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {contract.generated_storage_path && (
                        <Button variant="outline" size="sm" onClick={handleOpenContract}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Generált szerződés megnyitása
                        </Button>
                      )}
                      {contract.signed_storage_path && (
                        <Button variant="outline" size="sm" onClick={handleOpenSignedContract}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Aláírt szerződés megnyitása
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Még nincs generált szerződés.</p>
                )}
                <Button
                  className="w-full"
                  disabled={isGeneratingContract}
                  onClick={handleGenerateContract}
                >
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
                <Button
                  className="w-full"
                  disabled={isSavingNote}
                  onClick={handleSaveNote}
                >
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
