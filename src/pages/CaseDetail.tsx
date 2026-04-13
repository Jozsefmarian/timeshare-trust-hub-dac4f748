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
import ServiceAgreementPanel from "@/components/seller/panels/ServiceAgreementPanel";

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
  recheck_count: number;
};

type WeekOffer = {
  resort_name_raw: string | null;
  week_number: number | null;
  unit_type: string | null;
  season_label: string | null;
  share_related: boolean | null;
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
  reason_codes: string[] | null;
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

// ---------- Üzenet típus meghatározása reason_codes alapján ----------
// Ez a függvény dönti el, hogy a ManualReviewPanel melyik üzenetet mutassa:
// - "uze1": Üzenet 1 — sárga1 ág, recheck limit elérve (RECHECK_LIMIT_REACHED)
// - "uze3": Üzenet 3 — sárga2 ág, policy ütközés (nem volt recheck, admin review kell)
// - null: ha nincs classifications rekord (pl. még töltődik)
type ManualReviewMessageType = "uze1" | "uze3" | null;

function getManualReviewMessageType(classification: ClassificationRow | null): ManualReviewMessageType {
  if (!classification?.reason_codes) return null;
  if (classification.reason_codes.includes("RECHECK_LIMIT_REACHED")) return "uze1";
  // Sárga2 jellemző kódok: FLAG_MANUAL_LEGAL, ALLOW_BUT_YELLOW, NO_FIELD_MATCH_RESULTS, WARNING:*, CONFIRMED_RESTRICTION
  const sarga2Codes = ["FLAG_MANUAL_LEGAL", "ALLOW_BUT_YELLOW", "NO_FIELD_MATCH_RESULTS", "CONFIRMED_RESTRICTION"];
  if (classification.reason_codes.some((c) => sarga2Codes.includes(c) || c.startsWith("WARNING:"))) return "uze3";
  // Ha van RECHECK_LIMIT_REACHED → uze1, egyébként default: uze3
  return "uze3";
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
            "id, case_number, status, status_group, current_step, created_at, updated_at, submitted_at, closed_at, classification, ai_pipeline_status, recheck_count",
          )
          .eq("id", caseId)
          .eq("seller_user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        setCaseData(data as CaseRow | null);

        if (data) {
          const { data: wo } = await supabaseAny
            .from("week_offers")
            .select("resort_name_raw, week_number, unit_type, season_label, share_related")
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
      .eq("upload_status", "uploaded")
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
      .select("reason_summary, reason_codes")
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

  // Polling: green_approved → contract_generated
  useEffect(() => {
    if (!caseId || !caseData || normalizeCaseStatus(caseData.status) !== "green_approved") return;

    let count = 0;
    const maxPolls = 150;

    const interval = setInterval(async () => {
      count++;
      if (count > maxPolls) {
        clearInterval(interval);
        return;
      }
      try {
        const { data } = await supabaseAny.from("cases").select("status, ai_pipeline_status").eq("id", caseId).single();
        if (data && normalizeCaseStatus(data.status) !== "green_approved") {
          setCaseData((prev: CaseRow | null) =>
            prev
              ? {
                  ...prev,
                  status: data.status,
                  ai_pipeline_status: data.ai_pipeline_status,
                  updated_at: new Date().toISOString(),
                }
              : prev,
          );
          loadContract();
          clearInterval(interval);
        }
      } catch {
        /* silent */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [caseId, caseData?.status, loadContract]);

  // Polling: yellow_review + AI folyamatban van (ai_pipeline_status = queued/processing)
  // Ha a classify-case már lefutott (completed) és a status yellow_review,
  // akkor NEM pollingolunk — az állapot végleges (RECHECK_LIMIT_REACHED vagy sárga2).
  useEffect(() => {
    if (!caseId || !caseData) return;
    const normalized = normalizeCaseStatus(caseData.status);
    if (normalized !== "yellow_review") return;

    // Ha az AI pipeline már kész, nincs mit várni
    if (caseData.ai_pipeline_status === "completed") return;

    let count = 0;
    const maxPolls = 150;

    const interval = setInterval(async () => {
      count++;
      if (count > maxPolls) {
        clearInterval(interval);
        return;
      }
      try {
        const { data } = await supabaseAny
          .from("cases")
          .select("status, ai_pipeline_status, classification")
          .eq("id", caseId)
          .single();

        if (!data) return;

        const newNormalized = normalizeCaseStatus(data.status);

        // Ha az AI befejezett (completed), frissítjük az állapotot és leállítjuk a pollingot
        if (data.ai_pipeline_status === "completed") {
          setCaseData((prev: CaseRow | null) =>
            prev
              ? {
                  ...prev,
                  status: data.status,
                  ai_pipeline_status: data.ai_pipeline_status,
                  classification: data.classification,
                  updated_at: new Date().toISOString(),
                }
              : prev,
          );
          loadContract();
          loadCheckResults();
          loadClassification();
          clearInterval(interval);
        }
        // Ha az ügy elhagyta a yellow_review státuszt, frissítjük
        else if (newNormalized !== "yellow_review") {
          setCaseData((prev: CaseRow | null) =>
            prev
              ? {
                  ...prev,
                  status: data.status,
                  ai_pipeline_status: data.ai_pipeline_status,
                  classification: data.classification,
                  updated_at: new Date().toISOString(),
                }
              : prev,
          );
          loadContract();
          loadCheckResults();
          loadClassification();
          clearInterval(interval);
        }
      } catch {
        /* silent */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [caseId, caseData?.status, caseData?.ai_pipeline_status, loadContract, loadCheckResults, loadClassification]);

  // Corrections meghatározása check_results alapján
  const corrections = useMemo(() => {
    const buildFriendlyMessage = (cr: CheckResult) => {
      const details = cr.details ?? {};
      const fieldName = details.field_name as string | undefined;

      const FIELD_LABEL_HU: Record<string, string> = {
        resort_name_raw: "Üdülőingatlan neve",
        week_number: "Üdülési hét sorszáma",
        unit_number: "Apartman/egység száma",
        capacity: "Férőhely (max. személyek száma)",
        unit_type: "Apartman típusa",
        season_label: "Szezon",
        rights_start_year: "Jog kezdő éve",
        rights_end_year: "Jog záró éve",
        share_count: "Részvényszám",
        usage_frequency: "Használat gyakorisága",
        usage_parity: "Év típusa",
      };

      const fieldLabel =
        (fieldName ? FIELD_LABEL_HU[fieldName] : null) || details.field_label || fieldName || "Adatmező";
      const expectedValue = details.expected_value ?? details.document_value ?? details.extracted_value ?? null;
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
          (cr.check_type === "field_match" || cr.check_type === "document_check") &&
          (cr.result === "correction_required" ||
            cr.result === "fail" ||
            cr.result === "warning" ||
            cr.severity === "correction" ||
            cr.severity === "medium" ||
            cr.severity === "high"),
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
          expected_value: details.expected_value ?? details.document_value ?? details.extracted_value ?? null,
        };
      });
  }, [checkResults]);

  const handleRecheckRequested = useCallback(async () => {
    if (!caseId) throw new Error("Hiányzó ügyazonosító.");

    const { data, error } = await supabase.functions.invoke("recheck-case", {
      body: { case_id: caseId },
    });

    if (data?.recheck_limit_reached) {
      // A recheck-case EF már DB-ben rögzítette a RECHECK_LIMIT_REACHED állapotot.
      // Frissítjük a lokális state-et és betöltjük az új classification rekordot.
      await loadClassification();
      setCaseData((prev) =>
        prev
          ? { ...prev, ai_pipeline_status: "completed", classification: "yellow", updated_at: new Date().toISOString() }
          : prev,
      );
      return { recheck_limit_reached: true };
    }

    if (error) {
      const errorBody = typeof error === "object" && error !== null ? (error as any) : null;
      const contextData = errorBody?.context?.body
        ? (() => {
            try {
              return JSON.parse(errorBody.context.body);
            } catch {
              return null;
            }
          })()
        : null;
      if (contextData?.recheck_limit_reached) {
        await loadClassification();
        return { recheck_limit_reached: true };
      }
      throw error;
    }

    // Normál recheck elindult — azonnal frissítjük a case adatokat, polling veszi át a többit
    setCaseData((prev) =>
      prev
        ? { ...prev, ai_pipeline_status: "queued", classification: null, updated_at: new Date().toISOString() }
        : prev,
    );

    // Azonnal frissítjük a check results-t és classification-t (ne várjon az első polling intervallumra)
    await Promise.all([loadCheckResults(), loadClassification(), loadUploadedDocuments()]);

    return { recheck_limit_reached: false };
  }, [caseId, loadCheckResults, loadClassification, loadUploadedDocuments]);

  const handleCaseStatusUpdate = (newStatus: string) => {
    setCaseData((prev) =>
      prev ? { ...prev, status: normalizeCaseStatus(newStatus), updated_at: new Date().toISOString() } : prev,
    );
  };

  const handleAllContractsSigned = () => {
    handleCaseStatusUpdate("signed_contract_uploaded");
    navigate(`/seller/cases/${caseId}/payment`);
  };

  const handleServiceAgreementAccepted = () => {
    handleCaseStatusUpdate("service_agreement_accepted");
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

  // Ha az AI pipeline fut (queued/processing) és a státusz nem egy végleges állapot,
  // akkor AI feldolgozás panelt mutatunk.
  const aiRunning =
    (caseData.ai_pipeline_status === "queued" || caseData.ai_pipeline_status === "processing") &&
    ![
      "red_rejected",
      "green_approved",
      "contract_generated",
      "awaiting_signed_contract",
      "signed_contract_uploaded",
      "service_agreement_accepted",
      "payment_pending",
      "paid",
      "closed",
    ].includes(rawStatus);

  const status = aiRunning ? "ai_processing" : rawStatus;

  const isRejected = status === "red_rejected";
  const isYellow = status === "yellow_review";

  // A corrections csak akkor releváns, ha az AI pipeline már kész
  // (különben még töltődnek az eredmények)
  const aiDone = caseData.ai_pipeline_status === "completed";
  const hasCorrections = corrections.length > 0;

  // A sárga ág meghatározása reason_codes alapján:
  // - ha van RECHECK_LIMIT_REACHED a classifications-ban → sárga1 limit, nincs CorrectionPanel
  // - ha van correction_required a check_results-ban → sárga1 javítási ág, CorrectionPanel kell
  // - egyébként → sárga2 policy ütközés, ManualReviewPanel Üzenet3
  const manualReviewMessageType = getManualReviewMessageType(classification);
  const isRecheckLimitReached = manualReviewMessageType === "uze1";

  const isYellowFixRequired = isYellow && aiDone && hasCorrections && !isRecheckLimitReached;
  const isYellowManualReview = isYellow && aiDone && (!hasCorrections || isRecheckLimitReached);

  const shouldHideForwardFlow = isRejected || isYellowFixRequired || isYellowManualReview;

  return (
    <SellerLayout>
      <div className="space-y-6">
        <BackLink />

        <CaseSummaryCard
          caseNumber={caseData.case_number}
          status={status}
          createdAt={caseData.created_at}
          submittedAt={caseData.submitted_at}
          weekOffer={weekOffer}
        />

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-base font-semibold text-foreground mb-4">Ügy állapota</h2>
                <CaseTimeline
                  status={status}
                  forceBranch={
                    isYellowFixRequired || isYellowManualReview
                      ? "manual"
                      : status === "ai_processing" && caseData?.classification === "yellow"
                        ? "manual"
                        : undefined
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* AI Processing */}
            {(status === "submitted" || status === "docs_uploaded" || status === "ai_processing") && (
              <AiProcessingPanel />
            )}

            {/* Yellow - javítási ág (CorrectionPanel) */}
            {isYellowFixRequired && (
              <CorrectionPanel
                caseId={caseId!}
                corrections={corrections}
                onCorrectionCompleted={async () => {
                  await Promise.all([loadUploadedDocuments(), loadCheckResults(), loadClassification()]);
                }}
                onRecheckRequested={handleRecheckRequested}
              />
            )}

            {/* Yellow - manuális review (Üzenet 1 vagy Üzenet 3) */}
            {isYellowManualReview && (
              <ManualReviewPanel
                messageType={manualReviewMessageType}
                reasonSummary={classification?.reason_summary ?? null}
              />
            )}

            {/* Rejected — Üzenet 2 */}
            {isRejected && (
              <RejectedPanel
                reasonSummary={classification?.reason_summary ?? null}
                reasonCodes={classification?.reason_codes ?? null}
              />
            )}

            {/* Szerződések */}
            {isAtOrPast(status, "green_approved") && !shouldHideForwardFlow && (
              <ContractPanel
                contracts={contracts}
                caseId={caseId!}
                caseStatus={status}
                onContractsUpdated={loadContract}
                onCaseStatusUpdated={handleCaseStatusUpdate}
                onAllContractsSigned={handleAllContractsSigned}
              />
            )}

            {/* Szolgáltatási szerződés */}
            {isAtOrPast(status, "signed_contract_uploaded") && !shouldHideForwardFlow && (
              <ServiceAgreementPanel caseId={caseId!} caseStatus={status} onAccepted={handleServiceAgreementAccepted} />
            )}

            {/* Fizetés */}
            {isAtOrPast(status, "service_agreement_accepted") && !shouldHideForwardFlow && (
              <PaymentPanel caseStatus={status} isAbbazia={weekOffer?.share_related === true} />
            )}

            {/* Feltöltött dokumentumok (csak olvasható) */}
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
