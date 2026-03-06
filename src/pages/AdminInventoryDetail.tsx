import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Archive, ShieldOff, Plus, Send, FolderOpen } from "lucide-react";

const yearlyStatuses = ["Szabad", "Foglalva", "Kiadva"] as const;

const yearlyStatusColors: Record<string, string> = {
  Szabad: "bg-emerald-500/15 text-emerald-600 border-emerald-500/50",
  Foglalva: "bg-blue-500/15 text-blue-600 border-blue-500/50",
  Kiadva: "bg-amber-500/15 text-amber-600 border-amber-500/50",
};

const mockYears = [
  { year: 2025, week: 32, status: "Kiadva" },
  { year: 2026, week: 32, status: "Szabad" },
  { year: 2027, week: 32, status: "Szabad" },
  { year: 2028, week: 32, status: "Szabad" },
  { year: 2029, week: 32, status: "Foglalva" },
  { year: 2030, week: 32, status: "Szabad" },
];

const mockNotes = [
  { id: "1", author: "Admin", date: "2025-03-01 10:22", text: "Asset átvétel megtörtént, dokumentumok rendben." },
  { id: "2", author: "Admin", date: "2025-02-15 14:05", text: "Eladóval egyeztetve, átadás jóváhagyva." },
];

export default function AdminInventoryDetail() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState(mockNotes);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([{ id: `n${Date.now()}`, author: "Admin", date: new Date().toISOString().slice(0, 16).replace("T", " "), text: newNote }, ...notes]);
    setNewNote("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/inventory")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight font-mono">INV-00412</h1>
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/50">Aktív</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">Club Dobogómajor · 32. hét · Főszezon</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><ShieldOff className="h-4 w-4 mr-2" />Blokkolás</Button>
            <Button variant="outline" size="sm"><Archive className="h-4 w-4 mr-2" />Archiválás</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Asset details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  {[
                    ["Asset azonosító", "INV-00412"],
                    ["Üdülőhely", "Club Dobogómajor"],
                    ["Hét száma", "32. hét"],
                    ["Apartman típus", "2 szobás apartman"],
                    ["Szezon", "Főszezon"],
                    ["Jogosultság kezdete", "2020-01-01"],
                    ["Jogosultság vége", "2035-12-31"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Originating case */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Eredeti ügy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Ügy száma</p>
                    <p className="font-medium font-mono">TS-10234</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Eladó neve</p>
                    <p className="font-medium">Kovács János</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Dátum</p>
                    <p className="font-medium">2025-01-20</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yearly inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Éves készlet</CardTitle>
                <CardDescription>Generált éves heti bejegyzések</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Év</TableHead>
                      <TableHead>Hét</TableHead>
                      <TableHead>Státusz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockYears.map((y) => (
                      <TableRow key={y.year}>
                        <TableCell className="font-medium">{y.year}</TableCell>
                        <TableCell>{y.week}. hét</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={yearlyStatusColors[y.status]}>{y.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Megjegyzések</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Új megjegyzés..." rows={2} className="flex-1" />
                  <Button size="icon" className="shrink-0 self-end" onClick={addNote}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{note.author}</span>
                        <span className="text-xs text-muted-foreground">{note.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{note.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
