import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Upload, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const supabaseAny: any = supabase;

interface ContractData {
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface ContractPanelProps {
  contract: ContractData;
  caseId: string;
  caseStatus: string;
  onContractUpdated: () => void;
  onCaseStatusUpdated: (newStatus: string) => void;
}

export default function ContractPanel({ contract, caseId, caseStatus, onContractUpdated, onCaseStatusUpdated }: ContractPanelProps) {
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOpenContract = async () => {
    if (!contract.generated_storage_bucket || !contract.generated_storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from(contract.generated_storage_bucket)
        .createSignedUrl(contract.generated_storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setMessage({ type: "error", text: "A szerződés megnyitása nem sikerült." });
    }
  };

  const handleUploadSigned = async () => {
    if (!signedFile || !caseId) return;
    setMessage(null);

    try {
      setIsUploading(true);
      const ts = Date.now();
      const now = new Date().toISOString();
      const storagePath = `cases/${caseId}/contracts/signed/${ts}-${signedFile.name}`;
      const bucket = "signed-contracts";

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(storagePath, signedFile, {
        contentType: signedFile.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadErr) throw uploadErr;

      const { error: contractErr } = await supabaseAny.from("contracts").update({
        signed_storage_bucket: bucket,
        signed_storage_path: storagePath,
        signed_file_name: signedFile.name,
        signed_uploaded_at: now,
        status: "signed_uploaded",
      }).eq("id", contract.id);
      if (contractErr) throw contractErr;

      const { error: caseErr } = await supabaseAny.from("cases").update({
        status: "signed_contract_uploaded",
      }).eq("id", caseId);
      if (caseErr) throw caseErr;

      setMessage({ type: "success", text: "Az aláírt szerződés sikeresen feltöltve." });
      setSignedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onContractUpdated();
      onCaseStatusUpdated("signed_contract_uploaded");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "A feltöltés nem sikerült." });
    } finally {
      setIsUploading(false);
    }
  };

  const showSignedUpload = contract.status === "generated" || contract.status === "awaiting_signature";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Adásvételi szerződés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Státusz:</span>
          <Badge variant="outline" className="text-xs">{contractStatusLabel(contract.status)}</Badge>
        </div>

        {contract.generated_at && (
          <p className="text-xs text-muted-foreground">Generálva: {formatDateTime(contract.generated_at)}</p>
        )}

        {contract.generated_storage_path && (
          <Button variant="outline" className="w-full" onClick={handleOpenContract}>
            <Download className="h-4 w-4 mr-2" />
            Szerződés letöltése
          </Button>
        )}

        {showSignedUpload && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Aláírt szerződés feltöltése</p>
              <p className="text-xs text-muted-foreground">
                Töltse le a szerződést, nyomtassa ki, írja alá, majd töltse fel ide a beszkennelt aláírt példányt.
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm">Aláírt fájl kiválasztása</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  disabled={isUploading}
                  onChange={(e) => setSignedFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {message && (
                <p className={`text-sm ${message.type === "success" ? "text-success" : "text-destructive"}`}>
                  {message.text}
                </p>
              )}
              <Button className="w-full" disabled={isUploading || !signedFile} onClick={handleUploadSigned}>
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Feltöltés...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Aláírt szerződés feltöltése</>
                )}
              </Button>
            </div>
          </>
        )}

        {contract.signed_uploaded_at && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-sm text-success font-medium">Aláírt szerződés feltöltve</p>
            <p className="text-xs text-muted-foreground mt-1">
              Feltöltve: {formatDateTime(contract.signed_uploaded_at)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
