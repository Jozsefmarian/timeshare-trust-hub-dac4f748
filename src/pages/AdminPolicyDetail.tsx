import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ClassificationRule {
  id: string;
  name: string;
  condition: string;
  result: string;
}

const mockRestrictions: RestrictionRule[] = [
  {
    id: "r1",
    name: "Csőd kulcsszó",
    type: "Kulcsszó tiltás",
    field: "megjegyzés",
    operator: "tartalmazza",
    value: "csőd, felszámolás",
    severity: "Magas",
    message: "Csődeljáráshoz kapcsolódó ügy nem fogadható el.",
  },
  {
    id: "r2",
    name: "Tiltott üdülőhely",
    type: "Üdülőhely tiltás",
    field: "üdülőhely",
    operator: "egyenlő",
    value: "Teszt Resort",
    severity: "Magas",
    message: "Ez az üdülőhely nem elfogadható.",
  },
  {
    id: "r3",
    name: "Lejárt jog",
    type: "Lejárati év korlátozás",
    field: "jogosultság_vége",
    operator: "kisebb mint",
    value: "2025",
    severity: "Közepes",
    message: "Lejárt jogosultság esetén egyedi elbírálás szükséges.",
  },
];

const mockClassifications: ClassificationRule[] = [
  {
    id: "c1",
    name: "Tiszta ügy",
    condition: "Nincs korlátozó szabály találat és minden dokumentum elfogadva",
    result: "Zöld",
  },
  {
    id: "c2",
    name: "Részleges probléma",
    condition: "Közepes súlyosságú szabály találat vagy hiányzó dokumentum",
    result: "Sárga",
  },
  { id: "c3", name: "Elutasítandó", condition: "Magas súlyosságú szabály találat", result: "Piros" },
];

const ruleTypes = ["Kulcsszó tiltás", "Üdülőhely tiltás", "Hét tiltás", "Lejárati év korlátozás"];
const operators = ["tartalmazza", "nem tartalmazza", "egyenlő", "nem egyenlő", "kisebb mint", "nagyobb mint"];
const severities = ["Alacsony", "Közepes", "Magas"];
const classifications = ["Zöld", "Sárga", "Piros"];

const classificationColors: Record<string, string> = {
  Zöld: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50",
  Sárga: "bg-amber-500/15 text-amber-600 border-amber-500/50",
  Piros: "bg-red-500/15 text-red-600 border-red-500/50",
};

const severityColors: Record<string, string> = {
  Alacsony: "bg-blue-500/15 text-blue-600 border-blue-500/50",
  Közepes: "bg-amber-500/15 text-amber-600 border-amber-500/50",
  Magas: "bg-red-500/15 text-red-600 border-red-500/50",
};

export default function AdminPolicyDetail() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const isNew = policyId === "new";

  const [name, setName] = useState(isNew ? "" : "Alapértelmezett szabályrendszer");
  const [version, setVersion] = useState(isNew ? "1.0" : "3.2");
  const [status] = useState(isNew ? "Piszkozat" : "Publikált");
  const [description, setDescription] = useState(
    isNew ? "" : "Az alapértelmezett szabályrendszer, amely az összes beérkező ügyre vonatkozik.",
  );
  const [restrictions, setRestrictions] = useState<RestrictionRule[]>(isNew ? [] : mockRestrictions);
  const [classRules, setClassRules] = useState<ClassificationRule[]>(isNew ? [] : mockClassifications);
  const [isPublishing, setIsPublishing] = useState(false);

  const addRestriction = () => {
    setRestrictions([
      ...restrictions,
      {
        id: `r${Date.now()}`,
        name: "",
        type: ruleTypes[0],
        field: "",
        operator: operators[0],
        value: "",
        severity: severities[0],
        message: "",
      },
    ]);
  };

  const removeRestriction = (id: string) => setRestrictions(restrictions.filter((r) => r.id !== id));

  const updateRestriction = (id: string, field: keyof RestrictionRule, value: string) => {
    setRestrictions(restrictions.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addClassification = () => {
    setClassRules([...classRules, { id: `c${Date.now()}`, name: "", condition: "", result: classifications[0] }]);
  };

  const removeClassification = (id: string) => setClassRules(classRules.filter((r) => r.id !== id));

  const updateClassification = (id: string, field: keyof ClassificationRule, value: string) => {
    setClassRules(classRules.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const statusBadge =
    status === "Publikált"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/50"
      : status === "Archivált"
        ? "bg-muted text-muted-foreground"
        : "border-amber-500/50 text-amber-600 bg-amber-500/10";

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
            <Button variant="outline">
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
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Mentés
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verzió</Label>
                    <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="pl. 1.0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Leírás</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Szabályrendszer rövid leírása..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Restriction rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-destructive" />
                      Korlátozó szabályok
                    </CardTitle>
                    <CardDescription>Szabályok, amelyek korlátozzák az ügy elfogadását</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addRestriction}>
                    <Plus className="h-4 w-4 mr-1" />
                    Új szabály
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {restrictions.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nincs korlátozó szabály. Kattintson az "Új szabály" gombra.
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
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Szabály típusa</Label>
                            <Select value={rule.type} onValueChange={(v) => updateRestriction(rule.id, "type", v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ruleTypes.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Mező neve</Label>
                            <Input
                              value={rule.field}
                              onChange={(e) => updateRestriction(rule.id, "field", e.target.value)}
                              placeholder="pl. megjegyzés"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Operátor</Label>
                            <Select
                              value={rule.operator}
                              onValueChange={(v) => updateRestriction(rule.id, "operator", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Érték</Label>
                            <Input
                              value={rule.value}
                              onChange={(e) => updateRestriction(rule.id, "value", e.target.value)}
                              placeholder="Érték"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Súlyosság</Label>
                            <Select
                              value={rule.severity}
                              onValueChange={(v) => updateRestriction(rule.id, "severity", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {severities.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
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
                          onClick={() => removeRestriction(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={severityColors[rule.severity] || ""}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Üzenet</Label>
                        <Textarea
                          value={rule.message}
                          onChange={(e) => updateRestriction(rule.id, "message", e.target.value)}
                          placeholder="Hibaüzenet szövege..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                  <Button variant="outline" size="sm" onClick={addClassification}>
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
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Eredmény minősítés</Label>
                            <Select
                              value={rule.result}
                              onValueChange={(v) => updateClassification(rule.id, "result", v)}
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
                  <span className="text-sm text-muted-foreground">Korlátozó szabályok</span>
                  <span className="font-semibold">{restrictions.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Minősítési szabályok</span>
                  <span className="font-semibold">{classRules.length}</span>
                </div>
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Súlyosság eloszlás
                  </p>
                  {severities.map((s) => {
                    const count = restrictions.filter((r) => r.severity === s).length;
                    return (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className={severityColors[s]}>
                          {s}
                        </Badge>
                        <span className="text-muted-foreground">{count} szabály</span>
                      </div>
                    );
                  })}
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
