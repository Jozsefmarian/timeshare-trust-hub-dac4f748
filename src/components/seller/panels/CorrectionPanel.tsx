import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Upload, Loader2, Save } from "lucide-react";
import { uploadCaseDocument } from "@/lib/documentUpload";
import { supabase } from "@/integrations/supabase/client";
const supabaseAny = supabase as any;

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

export interface RecheckResult {
  recheck_limit_reached?: boolean;
}

interface CorrectionPanelProps {
  caseId: string;
  corrections: CorrectionRequirement[];
  onCorrectionCompleted: () => void;
  onRecheckRequested?: () => Promise<RecheckResult>;
}

type MessageState = {
  type: "success" | "error";
  text: string;
};

function normalizeFieldName(fieldName?: string) {
  switch (fieldName) {
    case "season":
      return "season_label";
    case "apartment_type":
      return "unit_type";
    case "capacity":
      return "capacity";
    default:
      return fieldName;
  }
}

function getInitialFieldValue(correction: CorrectionRequirement) {
  if (correction.current_value !== null && correction.current_value !== undefined) {
    return String(correction.current_value);
  }

  if (correction.expected_value !== null && correction.expected_value !== undefined) {
    return String(correction.expected_value);
  }

  return "";
}

export default function CorrectionPanel({
  caseId,
  corrections,
  onCorrectionCompleted,
  onRecheckRequested,
}: CorrectionPanelProps) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckLimitReached, setRecheckLimitReached] = useState(false);
  const [panelMessage, setPanelMessage] = useState<MessageState | null>(null);
  const [messages, setMessages] = useState<Record<number, MessageState>>({});
  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  useEffect(() => {
    const nextValues: Record<number, string> = {};

    corrections.forEach((correction, idx) => {
      if (correction.type === "field_correction") {
        nextValues[idx] = getInitialFieldValue(correction);
      }
    });

    setFieldValues(nextValues);
  }, [corrections]);

  const setMessage = (idx: number, message: MessageState) => {
    setMessages((prev) => ({
      ...prev,
      [idx]: message,
    }));
  };

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

      setMessage(idx, {
        type: "success",
        text: "Dokumentum sikeresen feltöltve.",
      });

      onCorrectionCompleted();
    } catch (err: any) {
      setMessage(idx, {
        type: "error",
        text: err?.message || "Feltöltés sikertelen.",
      });
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleFieldValueChange = (idx: number, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [idx]: value,
    }));
  };

  const saveFieldCorrection = async (idx: number, correction: CorrectionRequirement) => {
    const normalizedField = normalizeFieldName(correction.field_name);
    const rawValue = (fieldValues[idx] ?? "").trim();

    if (!normalizedField) {
      setMessage(idx, {
        type: "error",
        text: "Hiányzik a javítandó mező neve.",
      });
      return;
    }

    if (["week_number", "usage_frequency", "share_count", "capacity"].includes(normalizedField) && rawValue === "") {
      setMessage(idx, {
        type: "error",
        text: "Ez a mező nem maradhat üresen.",
      });
      return;
    }

    try {
      setSavingIdx(idx);

      if (normalizedField === "share_count") {
        const parsed = Number(rawValue);

        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new Error("A részvényszám csak pozitív egész szám lehet.");
        }

        const { data: existingRow, error: loadError } = await supabaseAny
          .from("abbazia_shares")
          .select("id")
          .eq("case_id", caseId)
          .maybeSingle();

        if (loadError) throw loadError;

        if (existingRow?.id) {
          const { error: updateError } = await supabaseAny
            .from("abbazia_shares")
            .update({
              share_count: parsed,
            })
            .eq("id", existingRow.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabaseAny.from("abbazia_shares").insert({
            case_id: caseId,
            share_count: parsed,
          });

          if (insertError) throw insertError;
        }
      } else {
        let valueToSave: string | number | null = rawValue;

        if (normalizedField === "week_number") {
          const parsed = Number(rawValue);

          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 53) {
            throw new Error("A hét száma 1 és 53 közötti egész szám lehet.");
          }

          valueToSave = parsed;
        }

        if (normalizedField === "capacity") {
          const parsed = Number(rawValue);

          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
            throw new Error("A személyek száma 1 és 20 közötti egész szám lehet.");
          }

          valueToSave = parsed;
        }

        if (normalizedField === "usage_parity") {
          valueToSave = rawValue === "" ? null : rawValue;
        }

        if (normalizedField === "unit_type" || normalizedField === "season_label") {
          valueToSave = rawValue === "" ? null : rawValue;
        }

        const { error: updateError } = await (supabase as any)
          .from("week_offers")
          .update({
            [normalizedField]: valueToSave,
          })
          .eq("case_id", caseId);

        if (updateError) throw updateError;
      }

      await supabase
        .from("cases")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      setMessage(idx, {
        type: "success",
        text: "Az adat sikeresen mentve.",
      });

      // Update local field value immediately so the UI reflects the saved value
      setFieldValues((prev) => ({ ...prev, [idx]: rawValue }));

      onCorrectionCompleted();
    } catch (err: any) {
      setMessage(idx, {
        type: "error",
        text: err?.message || "A javítás mentése sikertelen.",
      });
    } finally {
      setSavingIdx(null);
    }
  };

  const renderFieldEditor = (idx: number, correction: CorrectionRequirement) => {
    const normalizedField = normalizeFieldName(correction.field_name);
    const value = fieldValues[idx] ?? "";

    if (normalizedField === "usage_frequency") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          >
            <option value="">Válasszon</option>
            <option value="annual">Minden éves</option>
            <option value="biennial">Minden másodéves</option>
          </select>
        </div>
      );
    }

    if (normalizedField === "usage_parity") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          >
            <option value="">Nem releváns / nincs megadva</option>
            <option value="even">Páros évek</option>
            <option value="odd">Páratlan évek</option>
          </select>
        </div>
      );
    }

    if (normalizedField === "week_number") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <Input
            type="number"
            min={1}
            max={53}
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          />
        </div>
      );
    }

    if (normalizedField === "share_count") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          />
        </div>
      );
    }

    if (normalizedField === "capacity") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <Input
            type="number"
            min={1}
            max={20}
            step={1}
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          />
        </div>
      );
    }

    if (normalizedField === "unit_type" || normalizedField === "season_label") {
      return (
        <div className="space-y-2">
          <Label>Új érték</Label>
          <Input
            value={value}
            onChange={(e) => handleFieldValueChange(idx, e.target.value)}
            disabled={savingIdx === idx}
          />
        </div>
      );
    }

    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Ehhez a mezőhöz még nincs szerkesztő bekötve.
      </div>
    );
  };

  const requestRecheck = async () => {
    if (!onRecheckRequested) return;

    try {
      setIsRechecking(true);
      setPanelMessage(null);

      const result = await onRecheckRequested();

      if (result?.recheck_limit_reached) {
        setRecheckLimitReached(true);
        setPanelMessage(null);
      } else {
        setPanelMessage({
          type: "success",
          text: "Az újraellenőrzés elindult.",
        });
      }
    } catch (err: any) {
      const status = err?.status ?? err?.code;
      if (status === 401 || err?.message?.includes("401")) {
        setPanelMessage({
          type: "error",
          text: "A munkamenet lejárt. Kérjük, frissítse az oldalt és próbálja újra.",
        });
      } else {
        setPanelMessage({
          type: "error",
          text: "Technikai hiba lépett fel. Kérjük, próbálja újra néhány perc múlva.",
        });
      }
    } finally {
      setIsRechecking(false);
    }
  };

  const isSupportedField = (fieldName?: string) => {
    const normalizedField = normalizeFieldName(fieldName);

    return ["week_number", "usage_frequency", "usage_parity", "unit_type", "season_label", "share_count", "capacity"].includes(
      normalizedField || "",
    );
  };

  if (corrections.length === 0) return null;

  return (
    <Card className="border-warning/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Javítás szükséges
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {corrections.map((c, idx) => (
          <div
            key={`${c.type}-${c.field_name || c.document_type_id || idx}`}
            className="rounded-lg border p-4 space-y-3"
          >
            <p className="text-sm font-medium">{c.message}</p>

            {c.type === "document_replace" && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {c.document_type_label || "Dokumentum"} újrafeltöltése
                </div>

                <Input
                  type="file"
                  ref={(el) => {
                    fileRefs.current[idx] = el;
                  }}
                  disabled={uploadingIdx === idx}
                />

                <Button type="button" onClick={() => handleDocUpload(idx, c)} disabled={uploadingIdx === idx}>
                  {uploadingIdx === idx ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Feltöltés...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Feltöltés
                    </>
                  )}
                </Button>
              </div>
            )}

            {c.type === "field_correction" && (
              <div className="space-y-3">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">{c.field_label || c.field_name || "Mező"}:</span>
                  </div>

                  <div className="text-muted-foreground">
                    Jelenlegi megadott érték:{" "}
                    {c.current_value !== null && c.current_value !== undefined && c.current_value !== ""
                      ? String(c.current_value)
                      : "—"}
                  </div>

                  {c.expected_value !== null && c.expected_value !== undefined && c.expected_value !== "" && (
                    <div className="text-muted-foreground">
                      Dokumentum alapján várt érték: {String(c.expected_value)}
                    </div>
                  )}
                </div>

                {renderFieldEditor(idx, c)}

                {isSupportedField(c.field_name) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => saveFieldCorrection(idx, c)}
                    disabled={savingIdx === idx}
                  >
                    {savingIdx === idx ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mentés...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Javítás mentése
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {messages[idx] && (
              <div className={`text-sm ${messages[idx].type === "success" ? "text-green-600" : "text-destructive"}`}>
                {messages[idx].text}
              </div>
            )}
          </div>
        ))}
        <div className="border-t pt-4 space-y-3">
        {recheckLimitReached ? (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Sajnos a javítás sikertelen volt, így az ügyét átirányítottuk munkatársunkhoz ellenőrzésre. A manuális ellenőrzést legfeljebb 24 órán belül elvégezzük. Az eredményről azonnal értesítést küldünk Önnek e-mailben és folytathatja az adásvételi folyamatot.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Ha minden szükséges adatot javított és a dokumentumokat is frissítette, indítsa el újra az ellenőrzést.
            </div>

            <Button type="button" onClick={requestRecheck} disabled={isRechecking || !onRecheckRequested}>
              {isRechecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Újraellenőrzés indul...
                </>
              ) : (
                "Újraellenőrzés kérése"
              )}
            </Button>

            {panelMessage && (
              <div className={`text-sm ${panelMessage.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {panelMessage.text}
              </div>
            )}
          </>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
