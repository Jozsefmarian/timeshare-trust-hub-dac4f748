import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, AlertCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supabaseAny: any = supabase;

interface Resort {
  id: string;
  name: string;
  code: string | null;
  brand: string | null;
  city: string | null;
  country: string;
  operator_name: string | null;
  is_active: boolean;
  is_supported: boolean;
  notes: string | null;
}

const EMPTY_RESORT: Omit<Resort, "id"> = {
  name: "",
  code: "",
  brand: "",
  city: "",
  country: "HU",
  operator_name: "",
  is_active: true,
  is_supported: true,
  notes: "",
};

export default function AdminResorts() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResort, setEditingResort] = useState<Resort | null>(null);
  const [formData, setFormData] = useState<Omit<Resort, "id">>(EMPTY_RESORT);
  const [isSaving, setIsSaving] = useState(false);

  const loadResorts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabaseAny
        .from("resorts")
        .select("id, name, code, brand, city, country, operator_name, is_active, is_supported, notes")
        .order("name", { ascending: true });

      if (queryError) throw queryError;
      setResorts((data ?? []) as Resort[]);
    } catch (err: any) {
      setError(err?.message || "Nem sikerült betölteni az üdülőhelyeket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResorts();
  }, [loadResorts]);

  const openNew = () => {
    setEditingResort(null);
    setFormData(EMPTY_RESORT);
    setDialogOpen(true);
  };

  const openEdit = (resort: Resort) => {
    setEditingResort(resort);
    setFormData({
      name: resort.name,
      code: resort.code ?? "",
      brand: resort.brand ?? "",
      city: resort.city ?? "",
      country: resort.country,
      operator_name: resort.operator_name ?? "",
      is_active: resort.is_active,
      is_supported: resort.is_supported,
      notes: resort.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("A resort neve kötelező.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code?.trim() || null,
        brand: formData.brand?.trim() || null,
        city: formData.city?.trim() || null,
        country: formData.country.trim() || "HU",
        operator_name: formData.operator_name?.trim() || null,
        is_active: formData.is_active,
        is_supported: formData.is_supported,
        notes: formData.notes?.trim() || null,
      };

      if (editingResort) {
        const { error: updateError } = await supabaseAny.from("resorts").update(payload).eq("id", editingResort.id);
        if (updateError) throw updateError;
        toast.success("Üdülőhely sikeresen frissítve.");
      } else {
        const { error: insertError } = await supabaseAny.from("resorts").insert(payload);
        if (insertError) throw insertError;
        toast.success("Üdülőhely sikeresen létrehozva.");
      }

      setDialogOpen(false);
      loadResorts();
    } catch (err: any) {
      toast.error(err?.message || "A mentés nem sikerült.");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = resorts.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q) ||
      (r.brand ?? "").toLowerCase().includes(q) ||
      (r.code ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Üdülőhelyek</h1>
            <p className="text-muted-foreground text-sm mt-1">Resort registry kezelése</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Új üdülőhely
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={loadResorts}>
              Újrapróbálás
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="relative w-full sm:w-72 mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés név, város, hálózat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Hálózat</TableHead>
                  <TableHead>Város</TableHead>
                  <TableHead>Kód</TableHead>
                  <TableHead className="text-center">Aktív</TableHead>
                  <TableHead className="text-center">Támogatott</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {resorts.length === 0 ? "Még nincs üdülőhely. Hozzon létre egyet." : "Nincs találat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((resort) => (
                    <TableRow key={resort.id}>
                      <TableCell className="font-medium">{resort.name}</TableCell>
                      <TableCell className="text-muted-foreground">{resort.brand ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{resort.city ?? "—"}</TableCell>
                      <TableCell>
                        {resort.code ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{resort.code}</code>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            resort.is_active
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {resort.is_active ? "Igen" : "Nem"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            resort.is_supported
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {resort.is_supported ? "Igen" : "Nem"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(resort)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Szerkesztő dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingResort ? "Üdülőhely szerkesztése" : "Új üdülőhely"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Név *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="pl. Abbázia Club Hotel Keszthely"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Belső kód</Label>
                <Input
                  value={formData.code ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                  placeholder="pl. ABBAZIA_KESZTHELY"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hálózat</Label>
                <Input
                  value={formData.brand ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="pl. Danubius"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Város</Label>
                <Input
                  value={formData.city ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="pl. Keszthely"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ország kód</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  placeholder="HU"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Üzemeltető cég</Label>
              <Input
                value={formData.operator_name ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, operator_name: e.target.value }))}
                placeholder="pl. Abbázia Resort Kft."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Megjegyzés</Label>
              <Input
                value={formData.notes ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Belső megjegyzés..."
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))}
                />
                <Label>Aktív</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_supported}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_supported: v }))}
                />
                <Label>Támogatott (felvesszük)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Mégse
            </Button>
            <Button disabled={isSaving} onClick={handleSave}>
              {isSaving ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
