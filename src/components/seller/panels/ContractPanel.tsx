import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Upload, Loader2, Download, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────

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

interface SignedFile {
  id: string;
  contract_id: string;
  case_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_bucket: string;
  storage_path: string;
  sort_order: number;
  uploaded_at: string;
  uploaded_by: string | null;
  created_at: string;
}

interface ContractPanelProps {
  contracts: ContractRow[];
  caseId: string;
  caseStatus: string;
  onContractsUpdated: () => void;
  onCaseStatusUpdated: (newStatus: string) => void;
  onAllContractsSigned: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────

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

// ── SingleContractCard ───────────────────────────────────────────────────

interface SingleContractCardProps {
  contract: ContractRow;
  caseId: string;
  signedFiles: SignedFile[];
  onUploaded: () => void;
}

function SingleContractCard({ contract, caseId, signedFiles, onUploaded }: SingleContractCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasSigned = signedFiles.length > 0;
  const canUpload =
    contract.status === "generated" ||
    contract.status === "awaiting_signature" ||
    contract.status === "signed_uploaded";

  const handleDownload = async () => {
    if (!contract.generated_storage_bucket || !contract.generated_storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from(contract.generated_storage_bucket)
        .createSignedUrl(contract.generated_storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("A fájl megnyitása nem sikerült.");
    }
  };

  const handleOpenSignedFile = async (file: SignedFile) => {
    try {
      const { data, error } = await supabase.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("A fájl megnyitása nem sikerült.");
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uploadedBy = user?.id ?? null;

      for (const file of Array.from(files)) {
        const ts = Date.now();
        const storagePath = `cases/${caseId}/contracts/signed/${contract.id}/${ts}-${sanitizeFilename(file.name)}`;

        const { error: uploadErr } = await supabase.storage.from("signed-contracts").upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await supabase.from("signed_contract_files").insert({
          contract_id: contract.id,
          case_id: caseId,
          storage_bucket: "signed-contracts",
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          uploaded_by: uploadedBy,
          sort_order: 0,
        });
        if (insertErr) throw insertErr;
      }

      // Update contract status
      const { error: contractErr } = await supabase
        .from("contracts")
        .update({ status: "signed_uploaded" })
        .eq("id", contract.id);
      if (contractErr) throw contractErr;

      toast.success(`${files.length} fájl sikeresen feltöltve.`);
      onUploaded();
    } catch (err: any) {
      toast.error(err?.message || "A feltöltés nem sikerült.");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{contractTypeLabel(contract.contract_type)}</span>
        </div>
        <Badge
          variant="outline"
          className={hasSigned ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}
        >
          {contractStatusLabel(contract.status)}
        </Badge>
      </div>

      {contract.generated_at && (
        <p className="text-xs text-muted-foreground">Generálva: {formatDateTime(contract.generated_at)}</p>
      )}

      {contract.generated_storage_path && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Letöltés és aláírás
        </Button>
      )}

      {/* Uploaded signed files list */}
      {signedFiles.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Feltöltött aláírt fájlok ({signedFiles.length})</p>
            {signedFiles.map((sf) => (
              <div
                key={sf.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{sf.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(sf.uploaded_at)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleOpenSignedFile(sf)}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Megnyitás
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upload area */}
      {canUpload && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Töltse le, nyomtassa ki, írja alá, majd töltse vissza az aláírt példányt. Egyszerre több fájl is
            kiválasztható.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={handleFilesSelected}
          />
          <Button
            size="sm"
            variant={hasSigned ? "outline" : "default"}
            className="w-full"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Feltöltés...
              </>
            ) : hasSigned ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                További fájlok hozzáadása
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

      {/* Success indicator when not uploadable anymore */}
      {hasSigned && !canUpload && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <p className="text-xs text-success font-medium">Aláírt példány feltöltve</p>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────

export default function ContractPanel({
  contracts,
  caseId,
  caseStatus,
  onContractsUpdated,
  onCaseStatusUpdated,
  onAllContractsSigned,
}: ContractPanelProps) {
  const [signedFilesMap, setSignedFilesMap] = useState<Record<string, SignedFile[]>>({});
  const [loadingFiles, setLoadingFiles] = useState(true);

  const loadSignedFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from("signed_contract_files")
        .select("*")
        .eq("case_id", caseId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      const grouped: Record<string, SignedFile[]> = {};
      for (const row of (data ?? []) as SignedFile[]) {
        if (!grouped[row.contract_id]) grouped[row.contract_id] = [];
        grouped[row.contract_id].push(row);
      }
      setSignedFilesMap(grouped);
    } catch {
      // silent
    } finally {
      setLoadingFiles(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) loadSignedFiles();
  }, [caseId, loadSignedFiles]);

  const totalCount = contracts.length;
  const signedCount = contracts.filter((c) => (signedFilesMap[c.id]?.length ?? 0) > 0).length;
  const allSigned = totalCount > 0 && signedCount === totalCount;

  const handleUploaded = async () => {
    onContractsUpdated();
    await loadSignedFiles();

    // Re-check if all contracts now have signed files
    const { data: freshFiles } = await supabase
      .from("signed_contract_files")
      .select("contract_id")
      .eq("case_id", caseId);

    if (!freshFiles) return;

    const contractIdsWithFiles = new Set(freshFiles.map((f: any) => f.contract_id));
    const nowAllSigned = contracts.length > 0 && contracts.every((c) => contractIdsWithFiles.has(c.id));

    if (nowAllSigned) {
      const { error: recheckErr } = await supabase.functions.invoke("confirm-document-upload", {
        body: { is_signed_contract: true, case_id: caseId },
      });
      if (!recheckErr) {
        onAllContractsSigned();
      } else {
        console.error("confirm-document-upload error:", recheckErr);
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
        <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Teendők:</p>
          <p>1. Töltse le az összes szerződést az alábbi gombokkal</p>
          <p>2. Nyomtassa ki, írja alá kézzel</p>
          <p>3. Szkenneli vagy fotózza le az aláírt példányokat</p>
          <p>4. Töltse vissza az aláírt fájlokat (típusonként több fájl is feltölthető)</p>
        </div>

        {contracts.map((contract) => (
          <SingleContractCard
            key={contract.id}
            contract={contract}
            caseId={caseId}
            signedFiles={signedFilesMap[contract.id] ?? []}
            onUploaded={handleUploaded}
          />
        ))}

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
