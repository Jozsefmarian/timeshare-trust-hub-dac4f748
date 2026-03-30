import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  ai_pipeline_status: string | null;
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
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseRow | null>(null);
  const [weekOffer, setWeekOffer] = useState<WeekOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
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
            "id, case_number, status, status_group, current_step, created_at, updated_at, submitted_at, closed_at, classification, ai_pipeline_status",
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
        "id, contract_type, status, generated_file_name, generated_storage_bucket, generated_storage_path, signed_file_name, signed_storage_bucket, signed_storage_path, generated_at, signed_uploaded_at",
      )
      .eq("case_id", caseId)
      .in("contract_type", ["timeshare_transfer", "power_of_attorney", "share_transfer", "securities_transfer"])
      .order("created_at", { ascending: true });
    setContracts((data as ContractRow[]) ?? []);
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
    const buildFriendlyMessage = (cr: CheckResult) => {
      const details = cr.details ?? {};
      const fieldName = details.field_name as string | undefined;

      const fieldLabel =
        details.field_label ||
        (fieldName === "resort_name_raw"
          ? "Üdülő neve"
          : fieldName === "week_number"
            ? "Hét sorszáma"
            : fieldName === "unit_type" || fieldName === "apartment_type"
              ? "Apartman típusa"
              : fieldName === "season_label" || fieldName === "season"
                ? "Szezon"
                : fieldName === "rights_start_year"
                  ? "Jog kezdő éve"
                  : fieldName === "rights_end_year"
                    ? "Jog záró éve"
                    : fieldName === "share_count"
                      ? "Részvényszám"
                      : fieldName === "usage_frequency"
                        ? "Használat gyakorisága"
                        : fieldName === "usage_parity"
                          ? "Év típusa"
                          : fieldName || "Adatmező");

      const expectedValue =
        details.expected_value ?? details.document_value ?? details.extracted_value ?? details.matched_value ?? null;

      const currentValue = details.current_value ?? details.form_value ?? null;

      if (cr.check_type === "document_check") {
        return cr.message || `${details.document_type_label || "A szükséges dokumentum"} újrafeltöltése szükséges.`;
      }

      if (fieldName === "usage_frequency") {
        return (
          cr.message ||
          "A használat gyakorisága nem egyezik. Kérjük, ellenőrizze, hogy minden éves vagy minden másodéves jogról van-e szó."
        );
      }

      if (fieldName === "usage_parity") {
        return (
          cr.message ||
          "Az év típusa nem egyezik. Kérjük, ellenőrizze, hogy páros vagy páratlan évekre vonatkozik-e a használat."
        );
      }

      if (expectedValue || currentValue) {
        return cr.message || `${fieldLabel} eltér a dokumentumban szereplő adattól.`;
      }

      return cr.message || `${fieldLabel} javítása szükséges.`;
    };

    return checkResults
      .filter(
        (cr) =>
          cr.result === "correction_required" ||
          cr.result === "fail" ||
          cr.result === "warning" ||
          cr.severity === "correction" ||
          cr.severity === "medium" ||
          cr.severity === "high",
      )
      .map((cr) => {
        const details = cr.details ?? {};

        return {
          type: (cr.check_type === "document_check" ? "document_replace" : "field_correction") as
            | "document_replace"
            | "field_correction",
          message: buildFriendlyMessage(cr),
          document_type_id: details.document_type_id,
          document_type_label: details.document_type_label,
          field_name:
            details.field_name ??
            (cr.check_type.startsWith("field_presence:") ? cr.check_type.replace("field_presence:", "") : undefined),
          field_label: details.field_label,
          current_value: details.current_value ?? details.form_value ?? null,
          expected_value:
            details.expected_value ??
            details.document_value ??
            details.extracted_value ??
            details.matched_value ??
            null,
        };
      });
  }, [checkResults]);

  const handleRecheckRequested = useCallback(async () => {
    if (!caseId) throw new Error("Hiányzó ügyazonosító.");

    const { error } = await supabase.functions.invoke("recheck-case", {
      body: { case_id: caseId },
    });

    if (error) throw error;

    // UI frissítés
    await Promise.all([loadCheckResults(), loadClassification(), loadUploadedDocuments()]);

    setCaseData((prev) =>
      prev
        ? {
            ...prev,
            ai_pipeline_status: "queued",
            classification: null,
            updated_at: new Date().toISOString(),
          }
        : prev,
    );
  }, [caseId, loadCheckResults, loadClassification, loadUploadedDocuments]);

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
    if (newStatus === "signed_contract_uploaded" && caseId) {
      navigate(`/seller/cases/${caseId}/payment`);
    }
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

  const rawStatus = normalizeCaseStatus(caseData.status);

  const status =
    rawStatus === "docs_uploaded" &&
    (caseData.ai_pipeline_status === "queued" || caseData.ai_pipeline_status === "processing")
      ? "ai_processing"
      : rawStatus;

  const isRejected = status === "red_rejected" || (rawStatus === "docs_uploaded" && caseData.classification === "red");

  const isYellow =
    status === "yellow_review" || (rawStatus === "docs_uploaded" && caseData.classification === "yellow");

  const hasCorrections = corrections.length > 0;

  const isYellowFixRequired = isYellow && hasCorrections;
  const isYellowManualReview = isYellow && !hasCorrections;

  const shouldHideForwardFlow = isRejected || isYellowFixRequired || isYellowManualReview;

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
                onRecheckRequested={handleRecheckRequested}
              />
            )}

            {/* Yellow - manual review */}
            {isYellowManualReview && <ManualReviewPanel reasonSummary={classification?.reason_summary} />}

            {/* Rejected */}
            {isRejected && <RejectedPanel reasonSummary={classification?.reason_summary} />}

            {/* Contract panel */}
            {isAtOrPast(status, "green_approved") && !shouldHideForwardFlow && (
              <ContractPanel
                contracts={contracts}
                caseId={caseId!}
                caseStatus={status}
                onContractsUpdated={loadContract}
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
