import { useState, useCallback } from "react";
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
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileText, X, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  "Tulajdonos adatai",
  "Üdülési jog adatai",
  "Nyilatkozatok",
  "Dokumentum feltöltés",
];

const RESORTS = [
  "Marriott Vacation Club",
  "Hilton Grand Vacations",
  "Wyndham Resorts",
  "Club Dobogómajor",
  "Danubius Health Spa Resort",
  "Hunguest Hotels",
];

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  category: string;
  progress: number;
}

export default function NewCase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [caseNumber] = useState(() => `TS-${String(Math.floor(10000 + Math.random() * 90000))}`);

  // Step 1
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Step 2
  const [resort, setResort] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [apartmentType, setApartmentType] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [rightsStart, setRightsStart] = useState("");
  const [rightsEnd, setRightsEnd] = useState("");
  const [hasShares, setHasShares] = useState<string>("");
  const [shareCount, setShareCount] = useState("");

  // Step 3
  const [decl1, setDecl1] = useState(false);
  const [decl2, setDecl2] = useState(false);
  const [decl3, setDecl3] = useState(false);

  // Step 4
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileDrop = useCallback((category: string, fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      category,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setFiles((prev) =>
          prev.map((f) => (f.name === file.name && f.category === file.category ? { ...f, progress } : f))
        );
      }, 300);
    });
  }, []);

  const removeFile = (name: string, category: string) => {
    setFiles((prev) => prev.filter((f) => !(f.name === name && f.category === category)));
  };

  const filesForCategory = (cat: string) => files.filter((f) => f.category === cat);

  const canProceed = () => {
    switch (step) {
      case 0:
        return ownerName && ownerAddress && ownerEmail && ownerPhone;
      case 1:
        return resort && weekNumber && apartmentType && seasonName && rightsStart && rightsEnd && hasShares !== "";
      case 2:
        return decl1 && decl2 && decl3;
      case 3:
        return (
          filesForCategory("contract").length > 0 &&
          filesForCategory("ownership").length > 0 &&
          filesForCategory("maintenance").length > 0
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sikertelen mentés", description: "Nincs bejelentkezett felhasználó.", variant: "destructive" });
        return;
      }

      const { data: sellerProfile } = await (supabase as any)
        .from("seller_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const now = new Date().toISOString();
      const generatedCaseNumber = `TS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data, error } = await (supabase as any)
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

      if (error) throw error;

      toast({ title: "Ügy létrehozva", description: "Az új ügy sikeresen létrejött." });
      navigate(`/seller/case/${data.id}`, { replace: true });
    } catch (err: any) {
      console.error("NewCase insert error:", err);
      toast({ title: "Sikertelen mentés", description: err?.message || "Az ügy létrehozása nem sikerült.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SellerLayout>
        <div className="max-w-xl mx-auto py-12">
          <Card className="shadow-md text-center">
            <CardContent className="pt-10 pb-10 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Ügy sikeresen beküldve</h2>
                <p className="text-muted-foreground text-sm">
                  A rendszer ellenőrzi a feltöltött dokumentumokat. Az eredményről értesítést küldünk.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-muted-foreground">Ügy száma:</span>
                  <span className="font-mono font-bold text-foreground">{caseNumber}</span>
                </div>
                <Badge className="bg-secondary text-secondary-foreground">Beküldve</Badge>
              </div>
              <Button onClick={() => window.location.href = "/seller"} className="mt-4">
                Vissza a vezérlőpulthoz
              </Button>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

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
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    i <= step ? "bg-primary" : "bg-muted"
                  )}
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
                  <Input id="ownerName" placeholder="Kovács János" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerAddress">Lakcím</Label>
                  <Input id="ownerAddress" placeholder="1011 Budapest, Fő utca 1." value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerEmail">E-mail cím</Label>
                    <Input id="ownerEmail" type="email" placeholder="kovacs@example.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerPhone">Telefonszám</Label>
                    <Input id="ownerPhone" type="tel" placeholder="+36 30 123 4567" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Üdülőhely neve</Label>
                  <Select value={resort} onValueChange={setResort}>
                    <SelectTrigger><SelectValue placeholder="Válasszon üdülőhelyet" /></SelectTrigger>
                    <SelectContent>
                      {RESORTS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="weekNumber">Hét száma (1–52)</Label>
                    <Input id="weekNumber" type="number" min={1} max={52} placeholder="pl. 32" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="apartmentType">Apartman típus</Label>
                    <Input id="apartmentType" placeholder="pl. Studio, 1 hálós" value={apartmentType} onChange={(e) => setApartmentType(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seasonName">Szezon megnevezése</Label>
                  <Input id="seasonName" placeholder="pl. Főszezon, Utószezon" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rightsStart">Jogosultság kezdete (év)</Label>
                    <Input id="rightsStart" type="number" min={1990} max={2050} placeholder="pl. 2005" value={rightsStart} onChange={(e) => setRightsStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rightsEnd">Jogosultság vége (év)</Label>
                    <Input id="rightsEnd" type="number" min={1990} max={2099} placeholder="pl. 2035" value={rightsEnd} onChange={(e) => setRightsEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Kapcsolódik részvény?</Label>
                  <Select value={hasShares} onValueChange={setHasShares}>
                    <SelectTrigger><SelectValue placeholder="Válasszon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Igen</SelectItem>
                      <SelectItem value="no">Nem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasShares === "yes" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="shareCount">Részvény darabszám</Label>
                    <Input id="shareCount" type="number" min={1} placeholder="pl. 1" value={shareCount} onChange={(e) => setShareCount(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {[
                  { id: "decl1", checked: decl1, set: setDecl1, text: "Kijelentem, hogy az üdülési jog jogos tulajdonosa vagyok." },
                  { id: "decl2", checked: decl2, set: setDecl2, text: "A megadott adatok a valóságnak megfelelnek." },
                  { id: "decl3", checked: decl3, set: setDecl3, text: "Tudomásul veszem, hogy a rendszer automatikusan ellenőrzi a feltöltött dokumentumokat." },
                ].map((d) => (
                  <label key={d.id} htmlFor={d.id} className="flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                    <Checkbox id={d.id} checked={d.checked} onCheckedChange={(v) => d.set(!!v)} className="mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{d.text}</span>
                  </label>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {[
                  { key: "contract", label: "Üdülési szerződés", required: true },
                  { key: "ownership", label: "Tulajdonjog igazolás", required: true },
                  { key: "maintenance", label: "Fenntartási díj számla", required: true },
                  { key: "shares", label: "Részvény igazolás", required: false },
                ].map((doc) => (
                  <div key={doc.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">{doc.label}</Label>
                      {doc.required ? (
                        <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Kötelező</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Opcionális</Badge>
                      )}
                    </div>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(doc.key); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(null); handleFileDrop(doc.key, e.dataTransfer.files); }}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer",
                        dragOver === doc.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
                        input.onchange = () => handleFileDrop(doc.key, input.files);
                        input.click();
                      }}
                    >
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Húzza ide a fájlt vagy kattintson a feltöltéshez</p>
                    </div>
                    {filesForCategory(doc.key).map((f) => (
                      <div key={f.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border">
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                          {f.progress < 100 ? (
                            <Progress value={f.progress} className="h-1 mt-1" />
                          ) : (
                            <p className="text-[10px] text-success">Feltöltve</p>
                          )}
                        </div>
                        <button onClick={() => removeFile(f.name, f.category)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
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
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Előző
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Következő <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed()}>
              Ügy beküldése <CheckCircle2 className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
