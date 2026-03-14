import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileText, X, File, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadCaseDocument } from "@/lib/documentUpload";

const supabaseAny: any = supabase;

const STEPS = ["Tulajdonos adatai", "Üdülési jog adatai", "Nyilatkozatok", "Dokumentum feltöltés"];

const RESORTS = [
  "Marriott Vacation Club",
  "Hilton Grand Vacations",
  "Wyndham Resorts",
  "Club Dobogómajor",
  "Danubius Health Spa Resort",
  "Hunguest Hotels",
];

// Map seller-facing document categories to backend document_type codes
const DOC_CATEGORIES = {
  timeshare_contract: {
    label: "Üdülőhasználati szerződés",
    backendCode: "timeshare_contract",
    required: true,
    alwaysVisible: true,
  },
  standard_information_form: {
    label: "Standard Information Form",
    backendCode: "standard_information_form",
    required: true,
    alwaysVisible: true,
  },
  maintenance_fee_invoice: {
    label: "Maintenance fee invoice",
    backendCode: "maintenance_fee_invoice",
    required: true,
    alwaysVisible: true,
  },
  share_statement: {
    label: "Részvény adásvételi szerződés",
    backendCode: "share_statement",
    required: false, // conditionally required for Abbázia
    alwaysVisible: false, // only shown when share_related
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
  id: string; // unique client-side id
  file: File;
  category: DocCategoryKey;
  status: UploadStatus;
  progress: number;
  documentId?: string; // set after successful upload
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

  // Step 1 – owner data
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Step 2 – week data
  const [resort, setResort] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [apartmentType, setApartmentType] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [rightsStart, setRightsStart] = useState("");
  const [rightsEnd, setRightsEnd] = useState("");
  const [hasShares, setHasShares] = useState<string>("");
  const [shareCount, setShareCount] = useState("");

  // Step 3 – declarations
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [decl3, setDecl3] = useState(false);

  // Step 4 – files
  const [files, setFiles] = useState<TrackedFile[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [documentTypeMap, setDocumentTypeMap] = useState<Record<string, string>>({});
  const docTypesLoaded = useRef(false);
  // Retry safety: remember the case created in this session so we never duplicate
  const createdCaseRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  // Load document_types mapping on first render of step 4
  const ensureDocTypesLoaded = useCallback(async () => {
    if (docTypesLoaded.current) return;
    docTypesLoaded.current = true;
    const { data } = await supabaseAny.from("document_types").select("id, code").eq("is_active", true);
    if (data) {
      const map: Record<string, string> = {};
      for (const dt of data) map[dt.code] = dt.id;
      setDocumentTypeMap(map);
    }
  }, []);

  // When step changes to 3 (step 4), load doc types
  const handleStepChange = useCallback(
    (newStep: number) => {
      if (newStep === 3) ensureDocTypesLoaded();
      setStep(newStep);
    },
    [ensureDocTypesLoaded],
  );

  const isShareRelated = hasShares === "yes";

  const visibleCategories: { key: DocCategoryKey; label: string; required: boolean }[] = [
    { key: "timeshare_contract", label: DOC_CATEGORIES.timeshare_contract.label, required: true },
    ...(isShareRelated
      ? [{ key: "share_statement" as DocCategoryKey, label: DOC_CATEGORIES.share_statement.label, required: true }]
      : []),
    { key: "other_document", label: DOC_CATEGORIES.other_document.label, required: false },
  ];

  const addFiles = useCallback((category: DocCategoryKey, fileList: FileList | null) => {
    if (!fileList) return;
    const newTracked: TrackedFile[] = Array.from(fileList).map((f) => ({
      id: nextFileId(),
      file: f,
      category,
      status: "pending" as UploadStatus,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newTracked]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const filesForCategory = (cat: DocCategoryKey) => files.filter((f) => f.category === cat);

  const canProceed = () => {
    switch (step) {
      case 0:
        return ownerName && ownerAddress && ownerEmail && ownerPhone;
      case 1:
        return resort && weekNumber && apartmentType && seasonName && rightsStart && rightsEnd && hasShares !== "";
      case 2:
        return decl1 && decl2 && decl3;
      case 3: {
        // Required: timeshare_contract always, share_statement if share-related
        const hasTimeshare = filesForCategory("timeshare_contract").length > 0;
        const hasShare = !isShareRelated || filesForCategory("share_statement").length > 0;
        return hasTimeshare && hasShare;
      }
      default:
        return false;
    }
  };

  // Upload a single file through the real pipeline
  const uploadSingleFile = async (
    tracked: TrackedFile,
    caseId: string,
    docTypeId: string,
  ): Promise<{ success: boolean; documentId?: string }> => {
    // Mark uploading
    setFiles((prev) =>
      prev.map((f) => (f.id === tracked.id ? { ...f, status: "uploading" as UploadStatus, progress: 30 } : f)),
    );

    try {
      const result = await uploadCaseDocument({
        caseId,
        documentTypeId: docTypeId,
        file: tracked.file,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === tracked.id
            ? { ...f, status: "uploaded" as UploadStatus, progress: 100, documentId: result.documentId }
            : f,
        ),
      );
      return { success: true, documentId: result.documentId };
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === tracked.id
            ? { ...f, status: "failed" as UploadStatus, progress: 0, error: err?.message || "Feltöltés sikertelen" }
            : f,
        ),
      );
      return { success: false };
    }
  };

  const handleSubmit = async () => {
    // Prevent concurrent submits
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabaseAny.auth.getSession();
      if (!session) {
        toast({ title: "Sikertelen mentés", description: "Nincs bejelentkezett felhasználó.", variant: "destructive" });
        return;
      }

      // Validate required files exist
      const requiredCategories = visibleCategories.filter((c) => c.required);
      for (const cat of requiredCategories) {
        if (filesForCategory(cat.key).length === 0) {
          toast({
            title: "Hiányzó dokumentum",
            description: `Kérjük töltse fel: ${cat.label}`,
            variant: "destructive",
          });
          return;
        }
      }
      for (const cat of requiredCategories) {
        const catDef = DOC_CATEGORIES[cat.key];
        const docTypeId = documentTypeMap[catDef.backendCode];

        if (!docTypeId) {
          toast({
            title: "Konfigurációs hiba",
            description: `A kötelező dokumentumtípus nincs beállítva: ${cat.label}`,
            variant: "destructive",
          });
          return;
        }
      }

      let caseId = createdCaseRef.current;

      // Only create case + profile + week_offer if not already created in this session
      if (!caseId) {
        // 1. Upsert seller profile
        const sellerProfileNotes = [
          ownerEmail?.trim() ? `Kapcsolattartó email: ${ownerEmail.trim()}` : null,
          ownerPhone?.trim() ? `Kapcsolattartó telefon: ${ownerPhone.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const { data: sellerProfile, error: sellerProfileError } = await supabaseAny
          .from("seller_profiles")
          .upsert(
            {
              user_id: session.user.id,
              billing_name: ownerName.trim(),
              billing_address: ownerAddress.trim(),
              notes: sellerProfileNotes || null,
            },
            { onConflict: "user_id" },
          )
          .select("id")
          .single();

        if (sellerProfileError) throw sellerProfileError;

        // 2. Create case in draft status
        const now = new Date().toISOString();

        let caseId = createdCaseRef.current;

        if (!caseId) {
          const generatedCaseNumber = `TS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

          const { data: caseData, error: caseError } = await supabaseAny
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

          if (caseError) throw caseError;

          caseId = caseData.id;
          createdCaseRef.current = caseId;
        }

        // 3. Create week_offer
        const { error: weekOfferError } = await supabaseAny.from("week_offers").insert({
          case_id: caseId,
          resort_name_raw: resort.trim(),
          week_number: Number(weekNumber),
          unit_type: apartmentType.trim(),
          season_label: seasonName.trim(),
          rights_start_year: Number(rightsStart),
          rights_end_year: Number(rightsEnd),
          share_related: isShareRelated,
          share_count: isShareRelated && shareCount ? Number(shareCount) : null,
          created_at: now,
          updated_at: now,
        });

        if (weekOfferError) throw weekOfferError;
      }

      // 4. Upload only pending/failed files through the real pipeline
      const pendingFiles = files.filter((f) => f.status !== "uploaded");
      let allUploadsSucceeded = true;

      for (const tracked of pendingFiles) {
        const catDef = DOC_CATEGORIES[tracked.category];
        const docTypeId = documentTypeMap[catDef.backendCode];
        if (!docTypeId) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === tracked.id
                ? {
                    ...f,
                    status: "failed" as UploadStatus,
                    progress: 0,
                    error: `Nincs aktív document_type ehhez: ${catDef.backendCode}`,
                  }
                : f,
            ),
          );

          toast({
            title: "Konfigurációs hiba",
            description: `A dokumentumtípus nincs összekötve a backenddel: ${catDef.label}`,
            variant: "destructive",
          });

          allUploadsSucceeded = false;
          continue;
        }

        const result = await uploadSingleFile(tracked, caseId!, docTypeId);
        if (!result.success) {
          allUploadsSucceeded = false;
        }
      }

      if (!allUploadsSucceeded) {
        toast({
          title: "Dokumentum feltöltési hiba",
          description:
            "Egy vagy több dokumentum feltöltése sikertelen. Kérjük próbálja újra a sikertelen fájlokat, majd kattintson ismét a beküldésre.",
          variant: "destructive",
        });
        return;
      }

      // 5. All uploads succeeded — finalize case status
      const { error: updateError } = await supabaseAny
        .from("cases")
        .update({
          status: "submitted",
          status_group: "processing",
          current_step: "ai_processing",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      if (updateError) throw updateError;

      toast({
        title: "Ügy beküldve",
        description: "Az ügy sikeresen beküldve. Kövesse nyomon a feldolgozást az ügy oldalán.",
      });
      navigate(`/seller/cases/${caseId}`, { replace: true });
    } catch (err: any) {
      console.error("NewCase submit error:", err);
      toast({
        title: "Sikertelen mentés",
        description: err?.message || "Az ügy létrehozása nem sikerült.",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderFileStatus = (f: TrackedFile) => {
    switch (f.status) {
      case "uploading":
        return <Progress value={f.progress} className="h-1 mt-1" />;
      case "uploaded":
        return (
          <span className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Feltöltve
          </span>
        );
      case "failed":
        return (
          <span className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {f.error || "Sikertelen"}
          </span>
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
          <p className="text-muted-foreground text-sm mt-1">Töltse ki az alábbi lépéseket az ügy beküldéséhez.</p>
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
                  <Label htmlFor="ownerName">Teljes név</Label>
                  <Input
                    id="ownerName"
                    placeholder="Kovács János"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerAddress">Lakcím</Label>
                  <Input
                    id="ownerAddress"
                    placeholder="1011 Budapest, Fő utca 1."
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerEmail">E-mail cím</Label>
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
                      {RESORTS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
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
                    <Label htmlFor="apartmentType">Apartman típus</Label>
                    <Input
                      id="apartmentType"
                      placeholder="pl. Studio, 1 hálós"
                      value={apartmentType}
                      onChange={(e) => setApartmentType(e.target.value)}
                    />
                  </div>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="shareCount">Részvény darabszám</Label>
                    <Input
                      id="shareCount"
                      type="number"
                      min={1}
                      placeholder="pl. 1"
                      value={shareCount}
                      onChange={(e) => setShareCount(e.target.value)}
                    />
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
                    text: "Kijelentem, hogy az üdülési jog jogos tulajdonosa vagyok.",
                  },
                  { id: "decl2", checked: decl2, set: setDecl2, text: "A megadott adatok a valóságnak megfelelnek." },
                  {
                    id: "decl3",
                    checked: decl3,
                    set: setDecl3,
                    text: "Tudomásul veszem, hogy a rendszer automatikusan ellenőrzi a feltöltött dokumentumokat.",
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
                      <p className="text-xs text-muted-foreground">Húzza ide a fájlt vagy kattintson a feltöltéshez</p>
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
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Feltöltés és beküldés...
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
