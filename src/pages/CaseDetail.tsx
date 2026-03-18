import { useCallback, useEffect, useMemosupport, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Components
import CaseTimeline from "@/components/seller/CaseTimeline";
import CaseSummaryCard from "@/components/seller/CaseSummaryCard";
import AiProcessingPanel from "@/components/seller/panels/AiProcessingPanel";
import ManualReviewPanel from "@/components/seller/panels/ManualReviewPanel";
import RejectedPanel from "@/components/seller/panels/RejectedPanel";
import CorrectionPanel from "@/components/seller/panels/CorrectionPanel";
import ContractPanel from "@/components/seller/panels/ContractPanel";
import ServiceAgreementPanel from "@/components/seller/panels/ServiceAgreementPanel";
import PaymentPanel from "@/components/seller/panels/PaymentPanel";
import SubmittedDocumentsPanel from "@/components/seller/panels/SubmittedDocumentsPanel";

const supabaseAny: any = supabase;

// ---------- Types ----------

type CaseRow = {
  id: string;
  case_number: string;
  status: string;
  status_group: string | null;
  current_step: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
  classification: string | null;
};

type WeekOffer = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_type: string | null;
  season_label: string | null;
};

type UploadedDocument = {
  id: string;
  original_file_name: string | null;
  upload_status: string;
  review_status: string;
  ai_status: string;
  uploaded_at: string | null;
  document_type_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
};

type DocumentType = {
  id: string;
  label: string;
};

type ContractRow = {
  id: string;
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

type ClassificationRow = {
  reason_summary: string | null;
};

type CheckResult = {
  id: string;
  check_type: string;
  result: string;
  message: string | null;
  severity: string | null;
  details: any;
  document_id: string | null;
};

// ---------- Status helpers ----------

const STATUS_ORDER = [
  "draft",
  "submitted",
  "docs_uploaded",
  "ai_processing",
  "yellow_review",
  "red_rejected",
  "green_approved",
  "contract_generated",
  "awaiting_signed_contract",
  "signed_contract_uploaded",
  "service_agreement_accepted",
  "payment_pending",
  "paid",
  "closed",
];

function normalizeCaseStatus(status: string | null | undefined): string {
  if (!status) return "draft";

  const map: Record<string, string> = {
    documents_uploaded: "docs_uploaded",
    review_in_progress: "ai_processing",
    in_review: "ai_processing",
    approved: "green_approved",
    rejected: "red_rejected",
    ready_for_contract: "green_approved",
    contract_preparing: "contract_generated",
    signed: "signed_contract_uploaded",
    waiting_payment: "payment_pending",
    completed: "closed",
  };

  return map[status] ?? status;
}

function isAtOrPast(current: string, target: string): boolean {
  const normalizedCurrent = normalizeCaseStatus(current);
  return STATUS_ORDER.indexOf(normalizedCurrent) >= STATUS_ORDER.indexOf(target);
}

// ---------- Component ----------

export default function CaseDetail() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [weekOffer, setWeekOffer] = useState<WeekOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [classification, setClassification] = useState<ClassificationRow | null>(null);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

  // Load case + week offer
  useEffect(() => {
    const load = async () => {
      try {
        if (!caseId) {
          setLoadError("Hiányzó ügyazonosító.");
          setIsLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabaseAny.auth.getSession();
        if (!session) {
          setLoadError("Nincs bejelentkezett felhasználó.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabaseAny
          .from("cases")
          .select(
            "id, case_number, status, status_group, current_step, created_at, updated_at, submitted_at, closed_at, classification",
          )
          .eq("id", caseId)
          .eq("seller_user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        setCaseData(data as CaseRow | null);

        // Load week offer
        if (data) {
          const { data: wo } = await supabaseAny
            .from("week_offers")
            .select("resort_name_raw, week_number, unit_type, season_label")
            .eq("case_id", caseId)
            .maybeSingle();
          setWeekOffer(wo as WeekOffer | null);
        }
      } catch (err: any) {
        setLoadError(err?.message || "Az ügy betöltése nem sikerült.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [caseId]);

  // Load supporting data
  const loadDocumentTypes = useCallback(async () => {
    const { data } = await supabaseAny
      .from("document_types")
      .select("id, label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data) setDocumentTypes(data as DocumentType[]);
  }, []);

  const loadUploadedDocuments = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabaseAny
      .from("documents")
      .select(
        "id, original_file_name, upload_status, review_status, ai_status, uploaded_at, document_type_id, storage_bucket, storage_path",
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (data) setUploadedDocuments(data as UploadedDocument[]);
  }, [caseId]);

  const loadContract = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabaseAny
      .from("contracts")
      .select(
        "id, status, generated_file_name, generated_storage_bucket, generated_storage_path, signed_file_name, signed_storage_bucket, signed_storage_path, generated_at, signed_uploaded_at",
      )
      .eq("case_id", caseId)
      .eq("contract_type", "sale_purchase")
      .maybeSingle();
    setContract(data as ContractRow | null);
  }, [caseId]);

  const loadClassification = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabaseAny
      .from("classifications")
      .select("reason_summary")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setClassification(data as ClassificationRow | null);
  }, [caseId]);

  const loadCheckResults = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabaseAny
      .from("check_results")
      .select("id, check_type, result, message, severity, details, document_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (data) setCheckResults(data as CheckResult[]);
  }, [caseId]);

  useEffect(() => {
    if (caseId) {
      loadDocumentTypes();
      loadUploadedDocuments();
      loadContract();
      loadClassification();
      loadCheckResults();
    }
  }, [caseId, loadDocumentTypes, loadUploadedDocuments, loadContract, loadClassification, loadCheckResults]);

  // Build dynamic correction requirements from check results
  const corrections = useMemo(() => {
    return checkResults
      .filter((cr) => cr.result === "correction_required" || cr.severity === "correction")
      .map((cr) => ({
        type: (cr.check_type === "document_check" ? "document_replace" : "field_correction") as
          | "document_replace"
          | "field_correction",
        message: cr.message || "Javítás szükséges.",
        document_type_id: cr.details?.document_type_id,
        document_type_label: cr.details?.document_type_label,
        field_name: cr.details?.field_name,
        field_label: cr.details?.field_label,
        current_value: cr.details?.current_value,
      }));
  }, [checkResults]);

  const isRejected = status === "red_rejected";
  const isYellow = status === "yellow_review";
  const hasCorrections = corrections.length > 0;

  const isYellowFixRequired = isYellow && hasCorrections;
  const isYellowManualReview = isYellow && !hasCorrections;

  const shouldHideForwardFlow = isRejected || isYellowFixRequired || isYellowManualReview;

  const handleCaseStatusUpdate = (newStatus: string) => {
    setCaseData((prev) =>
      prev
        ? {
            ...prev,
            status: normalizeCaseStatus(newStatus),
            updated_at: new Date().toISOString(),
          }
        : prev,
    );
  };

  // ---------- Render ----------

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <BackLink />
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground">Ügy betöltése...</p>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  if (loadError || !caseData) {
    return (
      <SellerLayout>
        <div className="space-y-6">
          <BackLink />
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                {loadError ? "Hiba történt" : "Az ügy nem található"}
              </p>
              <p className="text-sm text-muted-foreground">
                {loadError || "Lehet, hogy nincs hozzáférésed ehhez az ügyhöz, vagy az ügy nem létezik."}
              </p>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  const status = normalizeCaseStatus(caseData.status);

  return (
    <SellerLayout>
      <div className="space-y-6">
        <BackLink />

        {/* Summary Card */}
        <CaseSummaryCard
          caseNumber={caseData.case_number}
          status={status}
          createdAt={caseData.created_at}
          submittedAt={caseData.submitted_at}
          weekOffer={weekOffer}
        />

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Timeline */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-base font-semibold text-foreground mb-4">Ügy állapota</h2>
                <CaseTimeline status={status} />
              </CardContent>
            </Card>
          </div>

          {/* Right: Status-based action panels */}
          <div className="lg:col-span-3 space-y-6">
            {/* AI Processing */}
            {(status === "submitted" || status === "docs_uploaded" || status === "ai_processing") && (
              <AiProcessingPanel />
            )}

            {/* Yellow - fix required */}
            {isYellowFixRequired && (
              <CorrectionPanel
                caseId={caseId!}
                corrections={corrections}
                onCorrectionCompleted={() => {
                  loadUploadedDocuments();
                  loadCheckResults();
                  loadClassification();
                }}
              />
            )}

            {/* Yellow - manual review */}
            {isYellowManualReview && <ManualReviewPanel reasonSummary={classification?.reason_summary} />}

            {/* Rejected */}
            {isRejected && <RejectedPanel reasonSummary={classification?.reason_summary} />}

            {/* Contract panel */}
            {contract && isAtOrPast(status, "green_approved") && !shouldHideForwardFlow && (
              <ContractPanel
                contract={contract}
                caseId={caseId!}
                caseStatus={status}
                onContractUpdated={loadContract}
                onCaseStatusUpdated={handleCaseStatusUpdate}
              />
            )}

            {/* Service Agreement */}
            {isAtOrPast(status, "signed_contract_uploaded") && !shouldHideForwardFlow && (
              <ServiceAgreementPanel
                caseId={caseId!}
                caseStatus={status}
                onAccepted={() => handleCaseStatusUpdate("service_agreement_accepted")}
              />
            )}

            {/* Payment */}
            {isAtOrPast(status, "service_agreement_accepted") && !shouldHideForwardFlow && (
              <PaymentPanel caseStatus={status} />
            )}

            {/* Submitted documents (read-only) */}
            <SubmittedDocumentsPanel documents={uploadedDocuments} documentTypes={documentTypes} />
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

function BackLink() {
  return (
    <Link
      to="/seller/cases"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Vissza az ügyeimhez
    </Link>
  );
}
