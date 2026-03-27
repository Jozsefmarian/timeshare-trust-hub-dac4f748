import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { ChevronDown, Plus, Maximize, Save, Check, Info } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

type ContractTemplate = {
  id: string;
  contract_type: string;
  title: string;
  version: string;
  html_content: string;
  is_active: boolean;
  created_at: string;
  created_by_user_id: string | null;
  available_variables: unknown;
  published_at: string | null;
  updated_at: string;
};

const CONTRACT_TYPES = [
  { type: "timeshare_transfer", label: "Adásvételi szerződés" },
  { type: "power_of_attorney", label: "Meghatalmazás" },
  { type: "share_transfer", label: "Részvény adásvételi szerződés" },
  { type: "securities_transfer", label: "Értékpapír transzfer nyilatkozat" },
] as const;

const AVAILABLE_VARIABLES = "{{buyer_name}}, {{buyer_address}}, {{buyer_company_number}}, {{buyer_tax_number}}, {{buyer_representative}}, {{seller_name}}, {{seller_address}}, {{seller_birth_date}}, {{seller_birth_place}}, {{seller_birth_name}}, {{seller_mother_name}}, {{seller_id_number}}, {{seller_tax_id}}, {{resort_name}}, {{week_number}}, {{unit_type}}, {{unit_number}}, {{season_label}}, {{rights_start_year}}, {{rights_end_year}}, {{original_contract_number}}, {{annual_fee}}, {{share_count}}, {{share_series}}, {{nominal_value}}, {{isin}}, {{securities_account_provider}}, {{securities_account_id}}, {{issuer_name}}, {{client_number}}, {{case_number}}, {{generation_date}}";

function TemplateSection({ type, label }: { type: string; label: string }) {
  const [active, setActive] = useState<ContractTemplate | null>(null);
  const [history, setHistory] = useState<ContractTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewHtml(htmlContent);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [htmlContent]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && showEditor) {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml, showEditor]);
  const load = useCallback(async () => {
    setLoading(true);
    const [activeRes, historyRes] = await Promise.all([
      supabase.from("contract_templates").select("*").eq("contract_type", type).eq("is_active", true).maybeSingle(),
      supabase.from("contract_templates").select("*").eq("contract_type", type).order("created_at", { ascending: false }),
    ]);
    setActive(activeRes.data as ContractTemplate | null);
    setHistory((historyRes.data as ContractTemplate[] | null) ?? []);
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const handlePreview = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.write(htmlContent); w.document.close(); }
  };

  const handleSave = async (activate: boolean) => {
    if (!title.trim() || !version.trim() || !htmlContent.trim()) {
      toast.error("Minden mező kitöltése kötelező.");
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Nincs bejelentkezve."); return; }

      if (activate) {
        await supabase.from("contract_templates").update({ is_active: false } as never).eq("contract_type", type).eq("is_active", true);
      }

      const { error } = await supabase.from("contract_templates").insert({
        contract_type: type,
        title: title.trim(),
        version: version.trim(),
        html_content: htmlContent,
        is_active: activate,
        created_by_user_id: session.user.id,
      });
      if (error) throw error;

      toast.success(activate ? "Sablon mentve és aktiválva." : "Piszkozat mentve.");
      setShowEditor(false);
      setTitle(""); setVersion(""); setHtmlContent("");
      await load();
    } catch (e: any) {
      toast.error("Hiba: " + (e.message || "Ismeretlen hiba"));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from("contract_templates").update({ is_active: false } as never).eq("contract_type", type);
      const { error } = await supabase.from("contract_templates").update({ is_active: true } as never).eq("id", id);
      if (error) throw error;
      toast.success("Sablon aktiválva.");
      await load();
    } catch (e: any) {
      toast.error("Hiba: " + (e.message || "Ismeretlen hiba"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{label}</CardTitle>
          {loading ? null : active ? (
            <Badge className="bg-green-600 hover:bg-green-600 text-white">Aktív</Badge>
          ) : (
            <Badge variant="secondary">Nincs aktív sablon</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {active && (
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">Sablon neve:</span> {active.title}</p>
            <p><span className="font-medium text-foreground">Verzió:</span> {active.version}</p>
            <p><span className="font-medium text-foreground">Létrehozva:</span> {format(new Date(active.created_at), "yyyy. MMMM d. HH:mm", { locale: hu })}</p>
          </div>
        )}

        {!showEditor ? (
          <Button variant="outline" onClick={() => setShowEditor(true)}>
            <Plus className="h-4 w-4 mr-1" /> Új verzió létrehozása
          </Button>
        ) : (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sablon neve</label>
                <Input placeholder='pl. "v1.0 - 2026 március"' value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Verzió</label>
                <Input placeholder='pl. "1.0"' value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
            </div>

            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Elérhető változók:</span> {AVAILABLE_VARIABLES}
            </div>

            <Textarea
              className="font-mono min-h-[400px]"
              placeholder="HTML sablon tartalma..."
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={!htmlContent.trim()}>
                <Eye className="h-4 w-4 mr-1" /> Előnézet
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> Mentés piszkozatként
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
                <Check className="h-4 w-4 mr-1" /> Mentés és aktiválás
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              Verziótörténet ({history.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nincs korábbi verzió.</p>
            ) : (
              <div className="border rounded-md mt-2 divide-y">
                {history.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-muted-foreground">v{t.version}</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(t.created_at), "yyyy.MM.dd HH:mm")}
                      </span>
                      {t.is_active && <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">Aktív</Badge>}
                    </div>
                    {!t.is_active && (
                      <Button variant="outline" size="sm" onClick={() => handleActivate(t.id)} disabled={saving}>
                        Aktiválás
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function AdminContractTemplates() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Szerződéssablonok</h1>
          <p className="text-muted-foreground">Adásvételi szerződések HTML sablonjainak kezelése</p>
        </div>
        {CONTRACT_TYPES.map((ct) => (
          <TemplateSection key={ct.type} type={ct.type} label={ct.label} />
        ))}
      </div>
    </AdminLayout>
  );
}
