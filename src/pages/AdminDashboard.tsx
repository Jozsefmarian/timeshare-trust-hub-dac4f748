import AdminLayout from "@/components/AdminLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, FileCheck, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin vezérlőpult</h1>
          <p className="text-muted-foreground">Platform áttekintés és ügykezelés.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Összes ügy" value="142" icon={<FolderOpen className="h-4 w-4" />} variant="accent" trend="+8" description="ebben a hónapban" />
          <DashboardCard title="Aktív eladók" value="67" icon={<Users className="h-4 w-4" />} description="regisztrált" />
          <DashboardCard title="Függő felülvizsgálatok" value="23" icon={<FileCheck className="h-4 w-4" />} variant="warning" description="beavatkozásra vár" />
          <DashboardCard title="Megjelölt elemek" value="4" icon={<AlertTriangle className="h-4 w-4" />} variant="warning" description="figyelmet igényel" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader><CardTitle className="text-base">Ügyek áttekintése</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "#142 ügy — Marriott 32. hét", seller: "Kovács J.", status: "Felülvizsgálat alatt", color: "bg-warning" },
                  { name: "#141 ügy — Hilton 14. hét", seller: "Szabó M.", status: "Dokumentumok hiányoznak", color: "bg-secondary" },
                  { name: "#140 ügy — Wyndham 48. hét", seller: "Nagy R.", status: "Átruházás befejezve", color: "bg-success" },
                  { name: "#139 ügy — Hyatt 8. hét", seller: "Tóth K.", status: "Megjelölve", color: "bg-destructive" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.seller} · {c.status}</p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Legutóbbi tevékenység</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: "A #142-es ügy felülvizsgálatra kijelölve", time: "30 perce" },
                  { text: "Szabályzat frissítve: Átruházási díjak", time: "2 órája" },
                  { text: "Új eladó regisztrált", time: "4 órája" },
                  { text: "A #140-es ügy befejezettnek jelölve", time: "1 napja" },
                  { text: "Üdülőhely készlet frissítve", time: "2 napja" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-secondary shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}