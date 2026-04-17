import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Globe, Archive, Plus, Trash2, ShieldCheck, AlertTriangle, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RestrictionRule {
  id: string;
  name: string;
  type: string;
  field: string;
  operator: string;
  value: string;
  severity: string;
  message: string;
}

interface WeekRestriction {
  id: string;
  resort_id: string | null;
  weeks: string;
}

interface ClassificationRule {
  id: string;
  name: string;
  condition: string;
  result: string;
  message: string;
}

interface ResortOption {
  id: string;
  name: string;
}

const operators = ["tartalmazza", "nem tartalmazza", "egyenlő", "nem egyenlő", "kisebb mint", "nagyobb mint"];
const classifications = ["Zöld", "Sárga", "Piros"];

const classificationColors: Record<string, string> = {
  Zöld: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50",
  Sárga: "bg-amber-500/15 text-amber-600 border-amber-500/50",
  Piros: "bg-red-500/15 text-red-600 border-red-500/50",
};

const severityToDb: Record<string, string> = {
  confirmed: "confirmed",
  suspected: "suspected",
  "Tiltott (→ piros, kizárás)": "confirmed",
  "Feltételes (→ sárga, manuális review)": "suspected",
};

const severityFromDb: Record<string, string> = {
  confirmed: "confirmed",
  suspected: "suspected",
};

const classificationToDb: Record<string, string> = {
  Zöld: "green",
  Sárga: "yellow",
  Piros: "red",
};
const classificationFromDb: Record<string, string> = Object.fromEntries(
  Object.entries(classificationToDb).map(([k, v]) => [v, k]),
);

const statusFromDb: Record<string, string> = {
  draft: "Piszkozat",
  published: "Publikált",
  archived: "Archivált",
};

export default function AdminPolicyDetail() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const isNew = policyId === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState("Piszkozat");
  const [restrictions, setRestrictions] = useState<RestrictionRule[]>([]);
  const [weekRestrictions, setWeekRestrictions] = useState<WeekRestriction[]>([]);
  const [classRules, setClassRules] = useState<ClassificationRule[]>([]);
  const [resortOptions, setResortOptions] = useState<ResortOption[]>([]);

  const isDraft = status === "Piszkozat";

  const loadData = useCallback(async () => {
    if (isNew || !policyId) return;
    setIsLoading(true);
    try {
      const [pvRes, rrRes, crRes, resortsRes] = await Promise.all([
        supabase.from("policy_versions").select("id, name, version, status").eq("id", policyId).single(),
        supabase
          .from("restriction_rules")
          .select("id, rule_type, field_name, match_value, operator, severity, message_template, is_active, sort_order")
          .eq("policy_version_id", policyId)
          .order("sort_order"),
        supabase
          .from("classification_rules")
          .select("id, rule_name, conditions, result_classification, message_template, is_active, sort_order")
          .eq("policy_version_id", policyId)
          .order("sort_order"),
        supabase.from("resorts").select("id, name").eq("is_active", true).order("name"),
      ]);

      if (pvRes.error) throw pvRes.error;
      const pv = pvRes.data;
      setName(pv.name);
      setVersion(pv.version);
      setStatus(statusFromDb[pv.status] || pv.status);

      if (resortsRes.data) {
        setResortOptions(resortsRes.data.map((r) => ({ id: r.id, name: r.name })));
      }

      if (rrRes.data) {
        const keywordRules: RestrictionRule[] = [];
        const weekRules: WeekRestriction[] = [];

        rrRes.data.forEach((r: any) => {
          if (r.rule_type === "week_ban") {
            weekRules.push({
              id: r.id,
              resort_id: r.field_name || null,
              weeks: r.match_value || "",
            });
          } else {
            keywordRules.push({
              id: r.id,
              name: r.rule_type || "",
              type: "Kulcsszó tiltás",
              field: "",
              operator: operators[0],
              value: r.match_value || "",
              severity: severityFromDb[r.severity] || r.severity || "confirmed",
              message: r.message_template || "",
            });
          }
        });

        setRestrictions(keywordRules);
        setWeekRestrictions(weekRules);
      }

      if (crRes.data) {
        setClassRules(
          crRes.data.map((r: any) => ({
            id: r.id,
            name: r.rule_name || "",
            condition:
              r.conditions && typeof r.conditions === "object"
                ? r.conditions.description || JSON.stringify(r.conditions)
                : "",
            result: classificationFromDb[r.result_classification] || r.result_classification || classifications[0],
            message: r.message_template || "",
          })),
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Adatok betöltése sikertelen.");
    } finally {
      setIsLoading(false);
    }
  }, [policyId, isNew]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- CRUD helpers ---
  const addRestriction = () => {
    setRestrictions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        type: "Kulcsszó tiltás",
        field: "",
        operator: operators[0],
        value: "",
        severity: "confirmed",
        message: "",
      },
    ]);
  };
  const removeRestriction = (id: string) => setRestrictions((prev) => prev.filter((r) => r.id !== id));
  const updateRestriction = (id: string, field: keyof RestrictionRule, value: string) => {
    setRestrictions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addWeekRestriction = () => {
    setWeekRestrictions((prev) => [...prev, { id: `new-${Date.now()}`, resort_id: null, weeks: "" }]);
  };
  const removeWeekRestriction = (id: string) => setWeekRestrictions((prev) => prev.filter((r) => r.id !== id));
  const updateWeekRestriction = (id: string, field: keyof WeekRestriction, value: any) => {
    setWeekRestrictions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addClassification = () => {
    setClassRules((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: "", condition: "", result: classifications[0], message: "" },
    ]);
  };
  const removeClassification = (id: string) => setClassRules((prev) => prev.filter((r) => r.id !== id));
  const updateClassification = (id: string, field: keyof ClassificationRule, value: string) => {
    setClassRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!policyId || isNew) return;
    setIsSaving(true);
    try {
      // 1. Update policy_versions
      const { error: pvErr } = await supabase
        .from("policy_versions")
        .update({ name, version, updated_at: new Date().toISOString() })
        .eq("id", policyId);
      if (pvErr) throw pvErr;

      // 2. Delete all existing restriction rules
      const { error: delRr } = await supabase.from("restriction_rules").delete().eq("policy_version_id", policyId);
      if (delRr) throw delRr;

      // Insert keyword rules
      if (restrictions.length > 0) {
        const keywordRows = restrictions.map((r, i) => ({
          policy_version_id: policyId,
          rule_type: "keyword_ban",
          match_value: r.value || null,
          severity: severityToDb[r.severity] || "confirmed",
          field_name: null,
          operator: null,
          message_template: r.message || null,
          is_active: true,
          sort_order: i,
        }));
        const { error: insKeyword } = await supabase.from("restriction_rules").insert(keywordRows);
        if (insKeyword) throw insKeyword;
      }

      // Insert week restriction rules
      const validWeekRows = weekRestrictions.filter((w) => w.weeks.trim().length > 0);
      if (validWeekRows.length > 0) {
        const weekRows = validWeekRows.map((w, i) => ({
          policy_version_id: policyId,
          rule_type: "week_ban",
          match_value: w.weeks.trim(),
          field_name: w.resort_id || null,
          operator: null,
          severity: null,
          message_template: null,
          is_active: true,
          sort_order: i,
        }));
        const { error: insWeek } = await supabase.from("restriction_rules").insert(weekRows);
        if (insWeek) throw insWeek;
      }

      // 3. Classification rules: delete + insert
      const { error: delCr } = await supabase.from("classification_rules").delete().eq("policy_version_id", policyId);
      if (delCr) throw delCr;

      if (classRules.length > 0) {
        const crRows = classRules.map((r, i) => {
          let conditionsJson: any;
          try {
            conditionsJson = JSON.parse(r.condition);
          } catch {
            conditionsJson = { description: r.condition };
          }
          return {
            policy_version_id: policyId,
            rule_name: r.name,
            conditions: conditionsJson,
            result_classification: classificationToDb[r.result] || r.result,
            message_template: r.message || null,
            is_active: true,
            sort_order: i,
          };
        });
        const { error: insCr } = await supabase.from("classification_rules").insert(crRows);
        if (insCr) throw insCr;
      }

      toast.success("Szabályrendszer mentve.");
    } catch (err: any) {
      toast.error(err?.message || "Mentés sikertelen.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Status badge ---
  const statusBadge =
    status === "Publikált"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/50"
      : status === "Archivált"
        ? "bg-muted text-muted-foreground"
        : "border-amber-500/50 text-amber-600 bg-amber-500/10";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/policies")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Új szabályrendszer" : name}</h1>
                <Badge variant="outline" className={statusBadge}>
                  {status}
                </Badge>
              </div>
              {!isNew && <p className="text-muted-foreground text-sm mt-0.5">Verzió: v{version}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!isDraft}>
              <Archive className="h-4 w-4 mr-2" />
              Archiválás
            </Button>
            <Button
              variant="outline"
              disabled={isPublishing || status !== "Piszkozat"}
              onClick={async () => {
                if (!policyId || policyId === "new") return;
                setIsPublishing(true);
                try {
                  const { error } = await supabase.functions.invoke("publish-policy", {
                    body: { policy_version_id: policyId },
                  });
                  if (error) throw error;
                  toast.success("Szabályrendszer sikeresen publikálva.");
                  loadData();
                } catch (err: any) {
                  toast.error(err?.message || "A publikálás nem sikerült.");
                } finally {
                  setIsPublishing(false);
                }
              }}
            >
              {isPublishing ? (
                <>
                  <Globe className="h-4 w-4 mr-2 animate-spin" />
                  Publikálás...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Publikálás
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isDraft}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alapadatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Szabályrendszer neve</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="pl. Alapértelmezett szabályrendszer"
                      disabled={!isDraft}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verzió</Label>
                    <Input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="pl. 1.0"
                      disabled={!isDraft}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Restriction rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-destructive" />
                  Korlátozó szabályok
                </CardTitle>
                <CardDescription>Szabályok, amelyek korlátozzák az ügy elfogadását</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Section A: Kulcsszó szabályok */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Kulcsszó szabályok</h3>
                    <Button variant="outline" size="sm" onClick={addRestriction} disabled={!isDraft}>
                      <Plus className="h-4 w-4 mr-1" />
                      Új kulcsszó szabály
                    </Button>
                  </div>
                  {restrictions.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      Nincs kulcsszó szabály. Kattintson az "Új kulcsszó szabály" gombra.
                    </p>
                  )}
                  {restrictions.map((rule) => (
                    <Card key={rule.id} className="border-border/50">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Szabály neve</Label>
                              <Input
                                value={rule.name}
                                onChange={(e) => updateRestriction(rule.id, "name", e.target.value)}
                                placeholder="Szabály neve"
                                disabled={!isDraft}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Súlyosság</Label>
                              <Select
                                value={rule.severity}
                                onValueChange={(v) => updateRestriction(rule.id, "severity", v)}
                                disabled={!isDraft}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="confirmed">Tiltott (→ piros, kizárás)</SelectItem>
                                  <SelectItem value="suspected">Feltételes (→ sárga, manuális review)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                              <Label className="text-xs">Kulcsszavak (vesszővel elválasztva)</Label>
                              <Input
                                value={rule.value}
                                onChange={(e) => updateRestriction(rule.id, "value", e.target.value)}
                                placeholder="pl. elővásárlási jog, átruházás tilos, jóváhagyás szükséges"
                                disabled={!isDraft}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive shrink-0 mt-5"
                            onClick={() => removeRestriction(rule.id)}
                            disabled={!isDraft}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Üzenet</Label>
                          <Textarea
                            value={rule.message}
                            onChange={(e) => updateRestriction(rule.id, "message", e.target.value)}
                            placeholder="Hibaüzenet szövege..."
                            rows={2}
                            disabled={!isDraft}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Section B: Hét korlátozások */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Hét korlátozások</h3>
                    <Button variant="outline" size="sm" onClick={addWeekRestriction} disabled={!isDraft}>
                      <Plus className="h-4 w-4 mr-1" />
                      Üdülőhely hozzáadása
                    </Button>
                  </div>
                  {weekRestrictions.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      Még nincs hét korlátozás beállítva.
                    </p>
                  )}
                  {weekRestrictions.map((row) => (
                    <div key={row.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Üdülőhely</Label>
                          <Select
                            value={row.resort_id ?? "all_resorts"}
                            onValueChange={(v) =>
                              updateWeekRestriction(row.id, "resort_id", v === "all_resorts" ? null : v)
                            }
                            disabled={!isDraft}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Válasszon üdülőhelyet" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all_resorts">Minden szálláshely</SelectItem>
                              {resortOptions.map((resort) => (
                                <SelectItem key={resort.id} value={resort.id}>
                                  {resort.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Korlátozott hetek sorszámai</Label>
                          <Input
                            value={row.weeks}
                            onChange={(e) => updateWeekRestriction(row.id, "weeks", e.target.value)}
                            placeholder="pl. 1, 2, 3, 43, 44"
                            disabled={!isDraft}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0 mt-5"
                        onClick={() => removeWeekRestriction(row.id)}
                        disabled={!isDraft}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Classification rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      Minősítési szabályok
                    </CardTitle>
                    <CardDescription>Szabályok az ügy automatikus minősítéséhez</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addClassification} disabled={!isDraft}>
                    <Plus className="h-4 w-4 mr-1" />
                    Új minősítési szabály
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {classRules.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">Nincs minősítési szabály.</p>
                )}
                {classRules.map((rule) => (
                  <Card key={rule.id} className="border-border/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Szabály neve</Label>
                            <Input
                              value={rule.name}
                              onChange={(e) => updateClassification(rule.id, "name", e.target.value)}
                              placeholder="Szabály neve"
                              disabled={!isDraft}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Eredmény minősítés</Label>
                            <Select
                              value={rule.result}
                              onValueChange={(v) => updateClassification(rule.id, "result", v)}
                              disabled={!isDraft}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {classifications.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0 mt-5"
                          onClick={() => removeClassification(rule.id)}
                          disabled={!isDraft}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={classificationColors[rule.result] || ""}>
                          {rule.result}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Feltétel leírása</Label>
                        <Textarea
                          value={rule.condition}
                          onChange={(e) => updateClassification(rule.id, "condition", e.target.value)}
                          placeholder="Milyen feltétel esetén érvényes ez a minősítés..."
                          rows={2}
                          disabled={!isDraft}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Előnézet</CardTitle>
                <CardDescription>Szabályrendszer összefoglaló</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Állapot</span>
                  <Badge variant="outline" className={statusBadge}>
                    {status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Kulcsszó szabályok</span>
                  <span className="font-semibold">{restrictions.length} db</span>
                </div>
                <div className="flex items-center justify-between py-1 pl-4">
                  <span className="text-xs text-muted-foreground">- Tiltott</span>
                  <span className="text-xs text-muted-foreground">
                    {restrictions.filter((r) => r.severity === "confirmed").length} db
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 pl-4 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">- Feltételes</span>
                  <span className="text-xs text-muted-foreground">
                    {restrictions.filter((r) => r.severity === "suspected").length} db
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Hét korlátozások</span>
                  <span className="font-semibold">{weekRestrictions.length} db</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Minősítési szabályok</span>
                  <span className="font-semibold">{classRules.length}</span>
                </div>
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minősítések</p>
                  {classifications.map((c) => {
                    const count = classRules.filter((r) => r.result === c).length;
                    return (
                      <div key={c} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className={classificationColors[c]}>
                          {c}
                        </Badge>
                        <span className="text-muted-foreground">{count} szabály</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Figyelmeztetés</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A szabályrendszer módosítása után a „Publikálás" gombbal teheti aktívvá a változtatásokat.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
