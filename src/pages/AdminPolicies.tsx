import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, BookOpen } from "lucide-react";

type PolicyStatus = "Piszkozat" | "Publikált" | "Archivált";

interface Policy {
  id: string;
  name: string;
  version: string;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
}

const mockPolicies: Policy[] = [
  { id: "1", name: "Alapértelmezett szabályrendszer", version: "3.2", status: "Publikált", createdAt: "2025-01-15", updatedAt: "2025-03-01" },
  { id: "2", name: "Szigorított ellenőrzés", version: "1.0", status: "Piszkozat", createdAt: "2025-02-20", updatedAt: "2025-03-04" },
  { id: "3", name: "Év végi szabályzat", version: "2.1", status: "Archivált", createdAt: "2024-11-01", updatedAt: "2024-12-31" },
  { id: "4", name: "Nyári szezon szabályzat", version: "1.3", status: "Publikált", createdAt: "2025-01-10", updatedAt: "2025-02-15" },
  { id: "5", name: "Teszt szabályrendszer", version: "0.1", status: "Piszkozat", createdAt: "2025-03-03", updatedAt: "2025-03-05" },
];

const statusConfig: Record<PolicyStatus, { variant: "default" | "secondary" | "outline"; className: string }> = {
  Piszkozat: { variant: "outline", className: "border-amber-500/50 text-amber-600 bg-amber-500/10" },
  Publikált: { variant: "default", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50" },
  Archivált: { variant: "secondary", className: "bg-muted text-muted-foreground" },
};

const filterTabs: { label: string; value: PolicyStatus | "all" }[] = [
  { label: "Összes", value: "all" },
  { label: "Piszkozat", value: "Piszkozat" },
  { label: "Publikált", value: "Publikált" },
  { label: "Archivált", value: "Archivált" },
];

export default function AdminPolicies() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<PolicyStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockPolicies.filter((p) => {
    if (activeFilter !== "all" && p.status !== activeFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.version.includes(search)) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Szabályrendszerek</h1>
            <p className="text-muted-foreground text-sm mt-1">Ügyminősítési szabályrendszerek kezelése</p>
          </div>
          <Button onClick={() => navigate("/admin/policy/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Új szabályrendszer
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-1">
                {filterTabs.map((tab) => (
                  <Button
                    key={tab.value}
                    variant={activeFilter === tab.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilter(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Verzió</TableHead>
                  <TableHead>Állapot</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead>Utolsó módosítás</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Nincs találat
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((policy) => {
                    const sc = statusConfig[policy.status];
                    return (
                      <TableRow
                        key={policy.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/policy/${policy.id}`)}
                      >
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell>v{policy.version}</TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} className={sc.className}>{policy.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{policy.createdAt}</TableCell>
                        <TableCell className="text-muted-foreground">{policy.updatedAt}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
