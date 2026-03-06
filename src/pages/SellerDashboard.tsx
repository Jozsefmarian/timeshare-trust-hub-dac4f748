import SellerLayout from "@/components/SellerLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, FileCheck, Clock, CreditCard } from "lucide-react";

export default function SellerDashboard() {
  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eladói vezérlőpult</h1>
          <p className="text-muted-foreground">Üdvözöljük újra. Itt láthatja üdülési jog ügyeinek áttekintését.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Aktív ügyek" value="3" icon={<FolderOpen className="h-4 w-4" />} variant="accent" description="2 felülvizsgálat alatt" />
          <DashboardCard title="Dokumentumok" value="12" icon={<FileCheck className="h-4 w-4" />} variant="success" trend="+2" description="ezen a héten" />
          <DashboardCard title="Függő teendők" value="5" icon={<Clock className="h-4 w-4" />} variant="warning" description="beavatkozás szükséges" />
          <DashboardCard title="Fizetések" value="$4 200" icon={<CreditCard className="h-4 w-4" />} description="összes beérkezett" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader><CardTitle className="text-base">Aktív ügyek</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Marriott Vacation Club — 32. hét", status: "Felülvizsgálat alatt", color: "bg-warning" },
                  { name: "Hilton Grand Vacations — 14. hét", status: "Dokumentumok hiányoznak", color: "bg-secondary" },
                  { name: "Wyndham Resorts — 48. hét", status: "Átruházás folyamatban", color: "bg-success" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.status}</p>
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
                  { text: "Dokumentum feltöltve a #102-es ügyhöz", time: "2 órája" },
                  { text: "A #98-as ügy státusza frissült", time: "5 órája" },
                  { text: "Fizetés beérkezett — $1 400", time: "1 napja" },
                  { text: "Új ügy létrehozva", time: "3 napja" },
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
    </SellerLayout>
  );
}