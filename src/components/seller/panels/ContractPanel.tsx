import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Upload, Loader2, Download, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny: any = supabase;

// ── Típusok ───────────────────────────────────────────────────────────────

interface ContractRow {
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
}

interface ContractPanelProps {
  contracts: ContractRow[];
  caseId: string;
  caseStatus: string;
  onContractsUpdated: () => void;
  onCaseStatusUpdated: (newStatus: string) => void;
}

// ── Segédfüggvények ───────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  timeshare_transfer: "Üdülőhasználati átadási szerződés",
  power_of_attorney: "Meghatalmazás",
  share_transfer: "Részvény adásvételi szerződés",
  securities_transfer: "Értékpapír transzfer nyilatkozat",
};

function contractTypeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type] ?? type;
}

function contractStatusLabel(s: string): string {
  switch (s) {
    case "pending_generation":
      return "Generálásra vár";
    case "generated":
      return "Letölthető";
    case "awaiting_signature":
      return "Aláírásra vár";
    case "signed_uploaded":
      return "Aláírt példány feltöltve";
    case "verified":
      return "Ellenőrizve";
    default:
      return s;
  }
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

// ── Egyetlen szerződés kártya ─────────────────────────────────────────────

interface SingleContractCardProps {
  contract: ContractRow;
  caseId: string;
  onUploaded: (contractId: string) => void;
}

function SingleContractCard({ contract, caseId, onUploaded }: SingleContractCardProps) {
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSigned = contract.status === "signed_uploaded" || contract.status === "verified";
  const canUpload = contract.status === "generated" || contract.status === "awaiting_signature";

  const handleDownload = async () => {
    if (!contract.generated_storage_bucket || !contract.generated_storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from(contract.generated_storage_bucket)
        .createSignedUrl(contract.generated_storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setMessage({ type: "error", text: "A fájl megnyitása nem sikerült." });
    }
  };

  const handleUploadSigned = async () => {
    if (!signedFile) return;
    setMessage(null);
    setIsUploading(true);

    try {
      const ts = Date.now();
      const storagePath = `cases/${caseId}/contracts/signed/${ts}-${contract.contract_type}-${signedFile.name}`;
      const bucket = "signed-contracts";

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(storagePath, signedFile, {
        contentType: signedFile.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadErr) throw uploadErr;

      const { error: contractErr } = await supabaseAny
        .from("contracts")
        .update({
          signed_storage_bucket: bucket,
          signed_storage_path: storagePath,
          signed_file_name: signedFile.name,
          signed_uploaded_at: new Date().toISOString(),
          status: "signed_uploaded",
        })
        .eq("id", contract.id);
      if (contractErr) throw contractErr;

      setMessage({ type: "success", text: "Aláírt példány sikeresen feltöltve." });
      setSignedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded(contract.id);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "A feltöltés nem sikerült." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Fejléc */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{contractTypeLabel(contract.contract_type)}</span>
        </div>
        <Badge
          variant="outline"
          className={isSigned ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}
        >
          {contractStatusLabel(contract.status)}
        </Badge>
      </div>

      {/* Generálás dátuma */}
      {contract.generated_at && (
        <p className="text-xs text-muted-foreground">Generálva: {formatDateTime(contract.generated_at)}</p>
      )}

      {/* Letöltés gomb */}
      {contract.generated_storage_path && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Letöltés és aláírás
        </Button>
      )}

      {/* Aláírt feltöltés */}
      {canUpload && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Töltse le, nyomtassa ki, írja alá, majd töltse vissza az aláírt példányt.
          </p>
          <Input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={isUploading}
            onChange={(e) => setSignedFile(e.target.files?.[0] ?? null)}
          />
          <Button size="sm" className="w-full" disabled={isUploading || !signedFile} onClick={handleUploadSigned}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Feltöltés...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Aláírt példány feltöltése
              </>
            )}
          </Button>
        </>
      )}

      {/* Sikeres feltöltés visszajelzés */}
      {isSigned && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <div>
            <p className="text-xs text-success font-medium">Aláírt példány feltöltve</p>
            {contract.signed_uploaded_at && (
              <p className="text-xs text-muted-foreground">{formatDateTime(contract.signed_uploaded_at)}</p>
            )}
          </div>
        </div>
      )}

      {/* Hibaüzenet */}
      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-success" : "text-destructive"}`}>{message.text}</p>
      )}
    </div>
  );
}

// ── Fő panel ─────────────────────────────────────────────────────────────

export default function ContractPanel({
  contracts,
  caseId,
  caseStatus,
  onContractsUpdated,
  onCaseStatusUpdated,
}: ContractPanelProps) {
  const totalCount = contracts.length;
  const signedCount = contracts.filter((c) => c.status === "signed_uploaded" || c.status === "verified").length;
  const allSigned = totalCount > 0 && signedCount === totalCount;

  const handleOneUploaded = async (contractId: string) => {
    // Frissítjük a listát
    onContractsUpdated();

    // Ellenőrizzük hogy minden szerz. alá van-e írva
    const { data: updatedContracts } = await supabaseAny
      .from("contracts")
      .select("id, status")
      .eq("case_id", caseId)
      .in("contract_type", ["timeshare_transfer", "power_of_attorney", "share_transfer", "securities_transfer"]);

    if (!updatedContracts) return;

    const generatedContracts = updatedContracts.filter((c: any) =>
      ["timeshare_transfer", "power_of_attorney", "share_transfer", "securities_transfer"].includes(c.contract_type),
    );

    const allNowSigned =
      generatedContracts.length > 0 &&
      generatedContracts.every((c: any) => c.status === "signed_uploaded" || c.status === "verified");

    if (allNowSigned) {
      // ÚJ (biztonságos - az EF service_role-lal fut):
      const { error: recheckErr } = await supabase.functions.invoke("confirm-document-upload", {
        body: { document_id: contractId, is_signed_contract: true, case_id: caseId },
      });
      if (!recheckErr) {
        onCaseStatusUpdated("signed_contract_uploaded");
      }
    }
  };

  if (contracts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Szerződések
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A szerződések generálása folyamatban van. Hamarosan letölthetők lesznek.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Szerződések aláírása
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            {signedCount}/{totalCount} aláírva
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Útmutató */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Teendők:</p>
          <p>1. Töltse le az összes szerződést az alábbi gombokkal</p>
          <p>2. Nyomtassa ki, írja alá kézzel</p>
          <p>3. Szkenneli vagy fotózza le az aláírt példányokat</p>
          <p>4. Töltse vissza az aláírt fájlokat az egyes szerződésekhez</p>
        </div>

        {/* Minden szerződés kártyája */}
        {contracts.map((contract) => (
          <SingleContractCard key={contract.id} contract={contract} caseId={caseId} onUploaded={handleOneUploaded} />
        ))}

        {/* Összesítő üzenet ha minden aláírva */}
        {allSigned && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <p className="text-sm text-success font-medium">
              Minden szerződés aláírva és visszatöltve. Következő lépés: szolgáltatási szerződés elfogadása.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
