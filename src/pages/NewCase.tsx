import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, File, X, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadCaseDocument } from "@/lib/documentUpload";
import { submitCase } from "@/integrations/supabase/api";

const STEPS = ["Tulajdonos adatai", "Üdülési jog adatai", "Nyilatkozatok", "Dokumentum feltöltés"];

const DOC_CATEGORIES = {
  timeshare_contract: {
    label: "Üdülőhasználati szerződés",
    backendCode: "timeshare_contract",
    required: true,
    alwaysVisible: true,
  },
  standard_information_form: {
    label: "Tájékoztató/Klubrend",
    backendCode: "standard_information_form",
    required: true,
    alwaysVisible: true,
  },
  maintenance_fee_invoice: {
    label: "Fenntartási díj bizonylat",
    backendCode: "maintenance_fee_invoice",
    required: true,
    alwaysVisible: true,
  },
  share_statement: {
    label: "Részvény adásvételi szerződés",
    backendCode: "share_statement",
    required: false,
    alwaysVisible: false,
  },
  other_document: {
    label: "Egyéb dokumentum",
    backendCode: "other_document",
    required: false,
    alwaysVisible: true,
  },
} as const;

type DocCategoryKey = keyof typeof DOC_CATEGORIES;
type UploadStatus = "pending" | "uploading" | "uploaded" | "failed";

interface TrackedFile {
  id: string;
  file: File;
  category: DocCategoryKey;
  status: UploadStatus;
  documentId?: string;
  error?: string;
}

let fileIdCounter = 0;
function nextFileId() {
  return `file-${Date.now()}-${++fileIdCounter}`;
}

export default function NewCase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [ownerBirthPlace, setOwnerBirthPlace] = useState("");
  const [ownerMotherName, setOwnerMotherName] = useState("");
  const [ownerBirthName, setOwnerBirthName] = useState("");
  const [ownerIdNumber, setOwnerIdNumber] = useState("");
  const [ownerTaxId, setOwnerTaxId] = useState("");

  // Resorts from DB
  const [resortOptions, setResortOptions] = useState<{ id: string; name: string }[]>([]);

  // Step 2
  const [resort, setResort] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [apartmentType, setApartmentType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [rightsStart, setRightsStart] = useState("");
  const [rightsEnd, setRightsEnd] = useState("");
  const [hasShares, setHasShares] = useState<string>("");
  const [shareCount, setShareCount] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [originalContractNumber, setOriginalContractNumber] = useState("");
  const [usageOption, setUsageOption] = useState<"annual" | "biennial_even" | "biennial_odd">("annual");

  // Abbázia share fields
  const [issuerName, setIssuerName] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [shareSeries, setShareSeries] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [isin, setIsin] = useState("");
  const [securitiesAccountProvider, setSecuritiesAccountProvider] = useState("");
  const [securitiesAccountId, setSecuritiesAccountId] = useState("");
  const [annualFee, setAnnualFee] = useState("");

  // Step 3
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [decl3, setDecl3] = useState(false);
  const [decl4, setDecl4] = useState(false);

  // Step 4
  const [files, setFiles] = useState<TrackedFile[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [documentTypeMap, setDocumentTypeMap] = useState<Record<string, string>>({});
  const docTypesLoaded = useRef(false);

  // Draft case refs
  const createdCaseRef = useRef<string | null>(null);
  const [draftCaseId, setDraftCaseId] = useState<string | null>(null);
  const draftCreating = useRef(false);

  const isShareRelated = hasShares === "yes";

  // Resorts betöltése DB-ből
  useEffect(() => {
    const loadResorts = async () => {
      const { data } = await supabase
        .from("resorts")
        .select("id, name")
        .eq("is_active", true)
        .eq("is_supported", true)
        .order("name", { ascending: true });
      if (data) setResortOptions(data as { id: string; name: string }[]);
    };
    loadResorts();
  }, []);

  // Load document_types mapping
  const ensureDocTypesLoaded = useCallback(async () => {
    if (docTypesLoaded.current) return;
    docTypesLoaded.current = true;
    const { data } = await supabase.from("document_types").select("id, code").eq("is_active", true);
    if (data) {
      const map: Record<string, string> = {};
      for (const dt of data) map[dt.code] = dt.id;
      setDocumentTypeMap(map);
    }
  }, []);

  // Ensure draft case exists when entering Step 4
  const ensureDraftCase = useCallback(async (): Promise<string | null> => {
    if (createdCaseRef.current) return createdCaseRef.current;
    if (draftCreating.current) return null;
    draftCreating.current = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Hiba", description: "Nincs bejelentkezett felhasználó.", variant: "destructive" });
        return null;
      }

      const now = new Date().toISOString();

      // Upsert seller profile
      const sellerProfileNotes = [
        ownerEmail?.trim() ? `Kapcsolattartó email: ${ownerEmail.trim()}` : null,
        ownerPhone?.trim() ? `Kapcsolattartó telefon: ${ownerPhone.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { data: sellerProfile, error: spErr } = await supabase
        .from("seller_profiles")
        .upsert(
          {
            user_id: session.user.id,
            billing_name: ownerName.trim(),
            billing_address: ownerAddress.trim(),
            id_number: ownerIdNumber.trim() || null,
            tax_id: ownerTaxId.trim() || null,
            birth_date: ownerBirthDate || null,
            birth_place: ownerBirthPlace.trim() || null,
            birth_name: ownerBirthName.trim() || null,
            mother_name: ownerMotherName.trim() || null,
            notes: sellerProfileNotes || null,
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();
      if (spErr) throw spErr;

      // Create case
      const generatedCaseNumber = `TS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const { data: caseData, error: caseErr } = await supabase
        .from("cases")
        .insert({
          case_number: generatedCaseNumber,
          seller_user_id: session.user.id,
          seller_profile_id: sellerProfile?.id ?? null,
          status: "draft",
          status_group: "intake",
          current_step: "seller_started",
          priority: "normal",
          source: "seller_portal",
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (caseErr) throw caseErr;

      const caseId = caseData.id;

      // Create week_offer
      const selectedResort = resortOptions.find((r) => r.name === resort);

      await supabase.from("week_offers").insert({
        case_id: caseId,
        resort_id: selectedResort?.id ?? null,
        resort_name_raw: resort.trim(),
        week_number: Number(weekNumber),
        unit_type: apartmentType.trim(),
        capacity: capacity ? Number(capacity) : null,
        season_label: seasonName.trim(),
        rights_start_year: Number(rightsStart),
        rights_end_year: Number(rightsEnd),
        usage_frequency: usageOption === "annual" ? "annual" : "biennial",
        usage_parity: usageOption === "biennial_even" ? "even" : usageOption === "biennial_odd" ? "odd" : null,
        share_related: isShareRelated,
        share_count: isShareRelated && shareCount ? Number(shareCount) : null,
        unit_number: unitNumber.trim() || null,
        original_contract_number: originalContractNumber.trim() || null,
        annual_fee: annualFee ? Number(annualFee) : null,
        created_at: now,
        updated_at: now,
      });

      // Abbázia részvény adatok mentése külön táblába
      if (isShareRelated && shareCount) {
        await supabase.from("abbazia_shares").insert({
          case_id: caseId,
          share_count: Number(shareCount),
          transfer_status: "pending",
          share_series: shareSeries || null,
          nominal_value: nominalValue ? Number(nominalValue) : null,
          isin: isin || null,
          securities_account_provider: securitiesAccountProvider || null,
          securities_account_id: securitiesAccountId || null,
          issuer_name: issuerName || null,
          client_number: clientNumber || null,
          created_at: now,
        });
      }

      createdCaseRef.current = caseId;
      setDraftCaseId(caseId);
      return caseId;
    } catch (err: any) {
      console.error("Draft case creation error:", err);
      toast({
        title: "Hiba",
        description: err?.message || "A piszkozat ügy létrehozása sikertelen.",
        variant: "destructive",
      });
      return null;
    } finally {
      draftCreating.current = false;
    }
  }, [
    ownerName,
    ownerAddress,
    ownerEmail,
    ownerPhone,
    ownerBirthDate,
    ownerBirthPlace,
    ownerMotherName,
    ownerIdNumber,
    ownerTaxId,
    resort,
    weekNumber,
    apartmentType,
    capacity,
    seasonName,
    rightsStart,
    rightsEnd,
    isShareRelated,
    shareCount,
    unitNumber,
    originalContractNumber,
    issuerName,
    clientNumber,
    shareSeries,
    nominalValue,
    isin,
    securitiesAccountProvider,
    securitiesAccountId,
    ownerBirthName,
    annualFee,
    toast,
  ]);

  // When entering step 4, ensure doc types + draft case
  const handleStepChange = useCallback(
    async (newStep: number) => {
      if (newStep === 3) {
        ensureDocTypesLoaded();
        await ensureDraftCase();
      }
      setStep(newStep);
    },
    [ensureDocTypesLoaded, ensureDraftCase],
  );

  const visibleCategories: { key: DocCategoryKey; label: string; required: boolean }[] = [
    { key: "timeshare_contract", label: DOC_CATEGORIES.timeshare_contract.label, required: true },
    { key: "standard_information_form", label: DOC_CATEGORIES.standard_information_form.label, required: true },
    { key: "maintenance_fee_invoice", label: DOC_CATEGORIES.maintenance_fee_invoice.label, required: true },
    ...(isShareRelated
      ? [{ key: "share_statement" as DocCategoryKey, label: DOC_CATEGORIES.share_statement.label, required: true }]
      : []),
    { key: "other_document", label: DOC_CATEGORIES.other_document.label, required: false },
  ];

  const filesForCategory = (cat: DocCategoryKey) => files.filter((f) => f.category === cat);

  // Immediate upload of a single file
  const uploadFileImmediately = useCallback(
    async (tracked: TrackedFile) => {
      let caseId = createdCaseRef.current;
      if (!caseId) {
        // Várjuk meg amíg a case létrejön (max 10s)
        let waited = 0;
        while (!createdCaseRef.current && waited < 10000) {
          await new Promise((r) => setTimeout(r, 200));
          waited += 200;
        }
        caseId = createdCaseRef.current;
        if (!caseId) {
          const id = await ensureDraftCase();
          if (!id) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === tracked.id
                  ? { ...f, status: "failed" as UploadStatus, error: "Piszkozat ügy létrehozása sikertelen." }
                  : f,
              ),
            );
            return;
          }
        }
      }

      const catDef = DOC_CATEGORIES[tracked.category];
      let docTypeId = documentTypeMap[catDef.backendCode];

      // Ha a map még nem töltődött be, betöltjük most
      if (!docTypeId) {
        const { data } = await supabase.from("document_types").select("id, code").eq("is_active", true);
        if (data) {
          const freshMap: Record<string, string> = {};
          for (const dt of data) freshMap[dt.code] = dt.id;
          setDocumentTypeMap(freshMap);
          docTypeId = freshMap[catDef.backendCode];
        }
      }

      if (!docTypeId) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tracked.id
              ? {
                  ...f,
                  status: "failed" as UploadStatus,
                  error: `Dokumentumtípus nem található: ${catDef.backendCode}`,
                }
              : f,
          ),
        );
        return;
      }

      setFiles((prev) => prev.map((f) => (f.id === tracked.id ? { ...f, status: "uploading" as UploadStatus } : f)));

      try {
        const result = await uploadCaseDocument({
          caseId: createdCaseRef.current!,
          documentTypeId: docTypeId,
          file: tracked.file,
        });
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tracked.id ? { ...f, status: "uploaded" as UploadStatus, documentId: result.documentId } : f,
          ),
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tracked.id
              ? { ...f, status: "failed" as UploadStatus, error: err?.message || "Feltöltés sikertelen" }
              : f,
          ),
        );
      }
    },
    [documentTypeMap, ensureDraftCase],
  );

  // Add files and immediately start uploading
  const addFiles = useCallback(
    (category: DocCategoryKey, fileList: FileList | null) => {
      if (!fileList) return;
      const newTracked: TrackedFile[] = Array.from(fileList).map((f) => ({
        id: nextFileId(),
        file: f,
        category,
        status: "pending" as UploadStatus,
      }));
      setFiles((prev) => [...prev, ...newTracked]);

      // Trigger immediate upload for each new file
      for (const tracked of newTracked) {
        uploadFileImmediately(tracked);
      }
    },
    [uploadFileImmediately],
  );

  const retryFile = useCallback(
    (fileId: string) => {
      const tracked = files.find((f) => f.id === fileId);
      if (!tracked) return;
      uploadFileImmediately(tracked);
    },
    [files, uploadFileImmediately],
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!(
          ownerName &&
          ownerAddress &&
          ownerEmail &&
          ownerPhone &&
          ownerBirthDate &&
          ownerBirthPlace &&
          ownerBirthName &&
          ownerMotherName &&
          ownerIdNumber
        );
      case 1:
        return (
          !!resort &&
          !!weekNumber &&
          !!apartmentType &&
          !!capacity &&
          !!unitNumber &&
          !!seasonName &&
          !!rightsStart &&
          !!rightsEnd &&
          hasShares !== "" &&
          !!originalContractNumber &&
          !!annualFee &&
          !!usageOption &&
          (hasShares !== "yes" ||
            (!!issuerName &&
              !!clientNumber &&
              !!shareSeries &&
              !!nominalValue &&
              !!isin &&
              !!securitiesAccountProvider &&
              !!securitiesAccountId))
        );
      case 2:
        return decl1 && decl2 && decl3 && decl4;
      case 3: {
        // Only uploaded files count
        const requiredCats = visibleCategories.filter((c) => c.required);
        const anyUploading = files.some((f) => f.status === "uploading");
        if (anyUploading) return false;
        for (const cat of requiredCats) {
          const hasUploaded = filesForCategory(cat.key).some((f) => f.status === "uploaded");
          if (!hasUploaded) return false;
        }
        return true;
      }
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const caseId = createdCaseRef.current;
      if (!caseId) {
        toast({ title: "Hiba", description: "Nincs létrehozott piszkozat ügy.", variant: "destructive" });
        return;
      }

      // Validate all required categories have at least one uploaded file
      const requiredCats = visibleCategories.filter((c) => c.required);
      for (const cat of requiredCats) {
        const hasUploaded = filesForCategory(cat.key).some((f) => f.status === "uploaded");
        if (!hasUploaded) {
          toast({
            title: "Hiányzó dokumentum",
            description: `Kérjük töltse fel: ${cat.label}`,
            variant: "destructive",
          });
          return;
        }
      }

      // Finalize case status
      const result = await submitCase(caseId);

      toast({
        title: "Ügy beküldve",
        description:
          result.new_status === "green_approved"
            ? "Az ügy sikeresen beküldve és automatikusan jóváhagyva lett."
            : result.new_status === "yellow_review"
              ? "Az ügy sikeresen beküldve. További ellenőrzés szükséges."
              : "Az ügy sikeresen beküldve, de az automatikus ellenőrzés elutasította.",
      });
      navigate(`/seller/cases/${caseId}`, { replace: true });
    } catch (err: any) {
      console.error("NewCase submit error:", err);
      console.error("NewCase submit error message:", err?.message);
      console.error("NewCase submit error details:", err?.details);
      console.error("NewCase submit error hint:", err?.hint);
      console.error("NewCase submit error code:", err?.code);

      toast({
        title: "Sikertelen beküldés",
        description: err?.message || err?.details || err?.hint || "Az ügy beküldése nem sikerült.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileStatus = (f: TrackedFile) => {
    switch (f.status) {
      case "uploading":
        return (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Feltöltés folyamatban...
          </span>
        );
      case "uploaded":
        return (
          <span className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Feltöltés sikeres
          </span>
        );
      case "failed":
        return (
          <div>
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Feltöltés sikertelen
            </span>
            {f.error && <p className="text-[9px] text-destructive/80 mt-0.5">{f.error}</p>}
          </div>
        );
      default:
        return <span className="text-[10px] text-muted-foreground">Várakozik</span>;
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Új ügy indítása</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Az alábbi 4 lépésben tudja megadni az adásvételi folyamat megkezdéséhez szükséges összes adatot. A kitöltés
            megkezdése előtt kérjük, figyelmesen olvassa el ezt a{" "}
            <a
              href="/seller/info"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary font-medium hover:underline"
            >
              Tájékoztatót
            </a>
            !
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="flex items-center w-full">
                <div
                  className={cn("h-2 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
                />
              </div>
              <span className={cn("text-[11px] font-medium", i <= step ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step]}</CardTitle>
            <CardDescription className="text-xs">
              {step === 0 && "Adja meg a tulajdonos személyes adatait."}
              {step === 1 && "Adja meg az üdülési jog részleteit."}
              {step === 2 && "Olvassa el és fogadja el a nyilatkozatokat."}
              {step === 3 && "Töltse fel a szükséges dokumentumokat."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName">Teljes név *</Label>
                  <Input
                    id="ownerName"
                    placeholder="Kovács János"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerAddress">Lakcím *</Label>
                  <Input
                    id="ownerAddress"
                    placeholder="1011 Budapest, Fő utca 1."
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerEmail">E-mail cím *</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="kovacs@example.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerPhone">Telefonszám</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      placeholder="+36 30 123 4567"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerIdNumber">Személyi igazolvány száma *</Label>
                    <Input
                      id="ownerIdNumber"
                      placeholder="123456AB"
                      value={ownerIdNumber}
                      onChange={(e) => setOwnerIdNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerTaxId">Adóazonosító jel</Label>
                    <Input
                      id="ownerTaxId"
                      placeholder="8012345678"
                      value={ownerTaxId}
                      onChange={(e) => setOwnerTaxId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerBirthDate">Születési dátum *</Label>
                    <Input
                      id="ownerBirthDate"
                      type="date"
                      value={ownerBirthDate}
                      onChange={(e) => setOwnerBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerBirthPlace">Születési hely *</Label>
                    <Input
                      id="ownerBirthPlace"
                      placeholder="Budapest"
                      value={ownerBirthPlace}
                      onChange={(e) => setOwnerBirthPlace(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerBirthName">Születési név *</Label>
                  <Input
                    id="ownerBirthName"
                    placeholder="pl. Kovács János"
                    value={ownerBirthName}
                    onChange={(e) => setOwnerBirthName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerMotherName">Anyja neve *</Label>
                  <Input
                    id="ownerMotherName"
                    placeholder="Szabó Mária"
                    value={ownerMotherName}
                    onChange={(e) => setOwnerMotherName(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">* Kötelező mező</p>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Üdülőhely neve</Label>
                  <Select value={resort} onValueChange={setResort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon üdülőhelyet" />
                    </SelectTrigger>
                    <SelectContent>
                      {resortOptions.length === 0 && (
                        <SelectItem value="_loading" disabled>
                          Betöltés...
                        </SelectItem>
                      )}
                      {resortOptions.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="weekNumber">Hét száma (1–52)</Label>
                    <Input
                      id="weekNumber"
                      type="number"
                      min={1}
                      max={52}
                      placeholder="pl. 32"
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="apartmentType">Apartman típus *</Label>
                    <Input
                      id="apartmentType"
                      placeholder="pl. Studio, 1 hálós"
                      value={apartmentType}
                      onChange={(e) => setApartmentType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity">Személyek száma (max. elhelyezhető fő) *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      max={20}
                      placeholder="pl. 2"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unitNumber">Apartman/egység száma *</Label>
                    <Input
                      id="unitNumber"
                      placeholder="pl. A-12, 304"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Igénybevétel gyakorisága</Label>
                  <Select
                    value={usageOption}
                    onValueChange={(value: "annual" | "biennial_even" | "biennial_odd") => setUsageOption(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Minden évben</SelectItem>
                      <SelectItem value="biennial_even">Minden másodévben – páros évek</SelectItem>
                      <SelectItem value="biennial_odd">Minden másodévben – páratlan évek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seasonName">Szezon megnevezése</Label>
                  <Input
                    id="seasonName"
                    placeholder="pl. Főszezon, Utószezon"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="originalContractNumber">Eredeti szerződés sorszáma *</Label>
                  <Input
                    id="originalContractNumber"
                    placeholder="pl. SZ-2005/1234"
                    value={originalContractNumber}
                    onChange={(e) => setOriginalContractNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="annualFee">Tárgyévi fenntartási díj (HUF) *</Label>
                  <Input
                    id="annualFee"
                    type="number"
                    min={0}
                    placeholder="pl. 150000"
                    value={annualFee}
                    onChange={(e) => setAnnualFee(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rightsStart">Jogosultság kezdete (év)</Label>
                    <Input
                      id="rightsStart"
                      type="number"
                      min={1990}
                      max={2050}
                      placeholder="pl. 2005"
                      value={rightsStart}
                      onChange={(e) => setRightsStart(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rightsEnd">Jogosultság vége (év)</Label>
                    <Input
                      id="rightsEnd"
                      type="number"
                      min={1990}
                      max={2099}
                      placeholder="pl. 2035"
                      value={rightsEnd}
                      onChange={(e) => setRightsEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Kapcsolódik részvény?</Label>
                  <Select value={hasShares} onValueChange={setHasShares}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Igen</SelectItem>
                      <SelectItem value="no">Nem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasShares === "yes" && (
                  <div className="grid gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="shareCount">Részvény darabszám *</Label>
                      <Input
                        id="shareCount"
                        type="number"
                        min={1}
                        placeholder="pl. 1"
                        value={shareCount}
                        onChange={(e) => setShareCount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="issuerName">Kibocsátó neve *</Label>
                      <Input
                        id="issuerName"
                        placeholder="pl. Abbázia Apartman Club Idegenforgalmi Zrt."
                        value={issuerName}
                        onChange={(e) => setIssuerName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="clientNumber">Ügyfélszám *</Label>
                        <Input
                          id="clientNumber"
                          placeholder="pl. 00123456"
                          value={clientNumber}
                          onChange={(e) => setClientNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="shareSeries">Részvénysorozat megjelölés *</Label>
                        <Input
                          id="shareSeries"
                          placeholder="pl. A sorozat"
                          value={shareSeries}
                          onChange={(e) => setShareSeries(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nominalValue">Névérték (HUF) *</Label>
                        <Input
                          id="nominalValue"
                          type="number"
                          min={1}
                          placeholder="pl. 100000"
                          value={nominalValue}
                          onChange={(e) => setNominalValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="isin">ISIN azonosító *</Label>
                        <Input
                          id="isin"
                          placeholder="pl. HU0000012345"
                          value={isin}
                          onChange={(e) => setIsin(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="securitiesAccountProvider">Értékpapír számlavezető intézmény *</Label>
                      <Input
                        id="securitiesAccountProvider"
                        placeholder="pl. OTP Bank Nyrt."
                        value={securitiesAccountProvider}
                        onChange={(e) => setSecuritiesAccountProvider(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="securitiesAccountId">Értékpapírszámla száma *</Label>
                      <Input
                        id="securitiesAccountId"
                        placeholder="pl. 12345678-12345678-12345678"
                        value={securitiesAccountId}
                        onChange={(e) => setSecuritiesAccountId(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {[
                  {
                    id: "decl1",
                    checked: decl1,
                    set: setDecl1,
                    text: "Kijelentem, hogy az üdülőhasználati jog jogos tulajdonosa vagyok és jogosult vagyok annak átruházására.",
                  },
                  {
                    id: "decl2",
                    checked: decl2,
                    set: setDecl2,
                    text: "Kijelentem, hogy az általam megadott adatok a valóságnak megfelelnek.",
                  },
                  {
                    id: "decl3",
                    checked: decl3,
                    set: setDecl3,
                    text: "Tudomásul veszem, hogy a rendszer automatikusan végzi a feltöltött dokumentumok ellenőrzését.",
                  },
                ].map((d) => (
                  <label
                    key={d.id}
                    htmlFor={d.id}
                    className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <Checkbox id={d.id} checked={d.checked} onCheckedChange={(v) => d.set(!!v)} className="mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{d.text}</span>
                  </label>
                ))}
                <label
                  htmlFor="decl4"
                  className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Checkbox id="decl4" checked={decl4} onCheckedChange={(v) => setDecl4(!!v)} className="mt-0.5" />
                  <span className="text-sm text-foreground leading-relaxed">
                    Kijelentem, hogy az{" "}
                    <a
                      href="/aszf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary font-medium hover:underline"
                    >
                      Általános Szerződési Feltételeket
                    </a>{" "}
                    elolvastam és elfogadom.
                  </span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {visibleCategories.map((doc) => (
                  <div key={doc.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">{doc.label}</Label>
                      {doc.required ? (
                        <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                          Kötelező
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Opcionális
                        </Badge>
                      )}
                    </div>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(doc.key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        addFiles(doc.key, e.dataTransfer.files);
                      }}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer",
                        dragOver === doc.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                      )}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
                        input.onchange = () => addFiles(doc.key, input.files);
                        input.click();
                      }}
                    >
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Húzza ide a fájlt vagy kattintson a feltöltéshez (fájl méret max. 4 MB)</p>
                    </div>
                    {filesForCategory(doc.key).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border"
                      >
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{f.file.name}</p>
                          {renderFileStatus(f)}
                        </div>
                        <div className="flex items-center gap-1">
                          {f.status === "failed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryFile(f.id);
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Újrapróbálás"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {f.status !== "uploading" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(f.id);
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => handleStepChange(step - 1)} disabled={step === 0 || isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Előző
          </Button>
          {step < 3 ? (
            <Button onClick={() => handleStepChange(step + 1)} disabled={!canProceed()}>
              Következő <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Beküldés...
                </>
              ) : (
                <>
                  Ügy beküldése <CheckCircle2 className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
