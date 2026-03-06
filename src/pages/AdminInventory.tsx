import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Package, CalendarCheck } from "lucide-react";

type AssetStatus = "Aktív" | "Foglalva" | "Kiadva" | "Archivált";

interface Asset {
  id: string;
  assetId: string;
  resort: string;
  week: number;
  apartmentType: string;
  season: string;
  validFrom: string;
  validTo: string;
  status: AssetStatus;
  futureWeeks: number;
}

const mockAssets: Asset[] = [
  { id: "1", assetId: "INV-00412", resort: "Club Dobogómajor", week: 32, apartmentType: "2 szobás apartman", season: "Főszezon", validFrom: "2020-01-01", validTo: "2035-12-31", status: "Aktív", futureWeeks: 10 },
  { id: "2", assetId: "INV-00413", resort: "Danubius Health Spa Resort Hévíz", week: 14, apartmentType: "Stúdió", season: "Előszezon", validFrom: "2018-06-01", validTo: "2033-06-01", status: "Aktív", futureWeeks: 8 },
  { id: "3", assetId: "INV-00414", resort: "Spirit Hotel Thermal Spa", week: 51, apartmentType: "Superior apartman", season: "Téli szezon", validFrom: "2019-03-15", validTo: "2030-03-15", status: "Foglalva", futureWeeks: 5 },
  { id: "4", assetId: "INV-00415", resort: "Club Dobogómajor", week: 8, apartmentType: "1 szobás apartman", season: "Utószezon", validFrom: "2021-01-01", validTo: "2036-12-31", status: "Kiadva", futureWeeks: 11 },
  { id: "5", assetId: "INV-00416", resort: "Danubius Health Spa Resort Hévíz", week: 26, apartmentType: "2 szobás apartman", season: "Főszezon", validFrom: "2015-01-01", validTo: "2025-12-31", status: "Archivált", futureWeeks: 0 },
];

const resorts = [...new Set(mockAssets.map((a) => a.resort))];

const statusConfig: Record<AssetStatus, string> = {
  Aktív: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50",
  Foglalva: "bg-blue-500/15 text-blue-600 border-blue-500/50",
  Kiadva: "bg-amber-500/15 text-amber-600 border-amber-500/50",
  Archivált: "bg-muted text-muted-foreground",
};

export default function AdminInventory() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [resortFilter, setResortFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = mockAssets.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (resortFilter !== "all" && a.resort !== resortFilter) return false;
    if (search && !a.assetId.toLowerCase().includes(search.toLowerCase()) && !a.resort.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalFutureWeeks = mockAssets.filter((a) => a.status !== "Archivált").reduce((sum, a) => sum + a.futureWeeks, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Készlet</h1>
            <p className="text-muted-foreground text-sm mt-1">Üdülési jog készletkezelés</p>
          </div>
          <Card className="border-primary/20 bg-primary/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Elérhető jövőbeli hetek</p>
                <p className="text-lg font-bold text-primary">{totalFutureWeeks}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Státusz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes státusz</SelectItem>
                  {(["Aktív", "Foglalva", "Kiadva", "Archivált"] as AssetStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resortFilter} onValueChange={setResortFilter}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Üdülőhely" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes üdülőhely</SelectItem>
                  {resorts.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64 sm:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset azonosító</TableHead>
                  <TableHead>Üdülőhely</TableHead>
                  <TableHead>Hét</TableHead>
                  <TableHead>Apartman típus</TableHead>
                  <TableHead>Szezon</TableHead>
                  <TableHead>Jogosultság kezdete</TableHead>
                  <TableHead>Jogosultság vége</TableHead>
                  <TableHead>Státusz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nincs találat
                    </TableCell>
                  </TableRow>
                ) : filtered.map((asset) => (
                  <TableRow key={asset.id} className="cursor-pointer" onClick={() => navigate(`/admin/inventory/${asset.id}`)}>
                    <TableCell className="font-medium font-mono">{asset.assetId}</TableCell>
                    <TableCell>{asset.resort}</TableCell>
                    <TableCell>{asset.week}. hét</TableCell>
                    <TableCell>{asset.apartmentType}</TableCell>
                    <TableCell>{asset.season}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.validFrom}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.validTo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[asset.status]}>{asset.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
