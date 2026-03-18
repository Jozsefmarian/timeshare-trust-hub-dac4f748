import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Upload, Loader2 } from "lucide-react";
import { uploadCaseDocument } from "@/lib/documentUpload";

interface CorrectionRequirement {
  type: "document_replace" | "field_correction";
  message: string;
  document_type_id?: string;
  document_type_label?: string;
  field_name?: string;
  field_label?: string;
  current_value?: string | number | null;
  expected_value?: string | number | null;
}

interface CorrectionPanelProps {
  caseId: string;
  corrections: CorrectionRequirement[];
  onCorrectionCompleted: () => void;
}

export default function CorrectionPanel({ caseId, corrections, onCorrectionCompleted }: CorrectionPanelProps) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, { type: "success" | "error"; text: string }>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleDocUpload = async (idx: number, correction: CorrectionRequirement) => {
    const fileInput = fileRefs.current[idx];
    const file = fileInput?.files?.[0];
    if (!file || !correction.document_type_id) return;

    try {
      setUploadingIdx(idx);
      await uploadCaseDocument({
        caseId,
        documentTypeId: correction.document_type_id,
        file,
      });
      setMessages((prev) => ({ ...prev, [idx]: { type: "success", text: "Dokumentum sikeresen feltöltve." } }));
      onCorrectionCompleted();
    } catch (err: any) {
      setMessages((prev) => ({ ...prev, [idx]: { type: "error", text: err?.message || "Feltöltés sikertelen." } }));
    } finally {
      setUploadingIdx(null);
    }
  };

  if (corrections.length === 0) return null;

  return (
    <Card className="shadow-sm border-warning/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Javítás szükséges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {corrections.map((c, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-3">
            <p className="text-sm text-foreground">{c.message}</p>

            {c.type === "document_replace" && (
              <div className="space-y-2">
                <Label className="text-sm">{c.document_type_label || "Dokumentum"} újrafeltöltése</Label>
                <Input
                  type="file"
                  ref={(el) => {
                    fileRefs.current[idx] = el;
                  }}
                  disabled={uploadingIdx === idx}
                />
                <Button size="sm" disabled={uploadingIdx === idx} onClick={() => handleDocUpload(idx, c)}>
                  {uploadingIdx === idx ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Feltöltés...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Feltöltés
                    </>
                  )}
                </Button>
              </div>
            )}

            {c.type === "field_correction" && (
              <div className="space-y-2 rounded-md border border-amber-200 bg-white/70 p-3">
                <Label className="text-amber-900">{c.field_label || c.field_name}</Label>

                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Jelenlegi megadott érték:{" "}
                    <span className="font-medium text-foreground">
                      {c.current_value !== null && c.current_value !== undefined && c.current_value !== ""
                        ? String(c.current_value)
                        : "—"}
                    </span>
                  </p>

                  {c.expected_value !== null && c.expected_value !== undefined && c.expected_value !== "" && (
                    <p className="text-muted-foreground">
                      Dokumentum alapján várt érték:{" "}
                      <span className="font-medium text-foreground">{String(c.expected_value)}</span>
                    </p>
                  )}
                </div>

                <p className="text-xs text-amber-800">
                  Kérjük, ellenőrizze az eredeti dokumentumot, majd szükség esetén javítsa az adatot vagy töltsön fel
                  helyes dokumentumot.
                </p>
              </div>
            )}

            {messages[idx] && (
              <p className={`text-sm ${messages[idx].type === "success" ? "text-success" : "text-destructive"}`}>
                {messages[idx].text}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
