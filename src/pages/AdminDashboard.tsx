import AdminLayout from "@/components/AdminLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, FileCheck, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and case management.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Total Cases" value="142" icon={<FolderOpen className="h-4 w-4" />} variant="accent" trend="+8" description="this month" />
          <DashboardCard title="Active Sellers" value="67" icon={<Users className="h-4 w-4" />} description="registered" />
          <DashboardCard title="Pending Reviews" value="23" icon={<FileCheck className="h-4 w-4" />} variant="warning" description="awaiting action" />
          <DashboardCard title="Flagged Items" value="4" icon={<AlertTriangle className="h-4 w-4" />} variant="warning" description="requires attention" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader><CardTitle className="text-base">Cases Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Case #142 — Marriott Week 32", seller: "John D.", status: "Under Review", color: "bg-warning" },
                  { name: "Case #141 — Hilton Week 14", seller: "Sarah M.", status: "Pending Documents", color: "bg-secondary" },
                  { name: "Case #140 — Wyndham Week 48", seller: "Mike R.", status: "Transfer Complete", color: "bg-success" },
                  { name: "Case #139 — Hyatt Week 8", seller: "Lisa K.", status: "Flagged", color: "bg-destructive" },
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
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: "Case #142 assigned for review", time: "30m ago" },
                  { text: "Policy updated: Transfer fees", time: "2h ago" },
                  { text: "New seller registered", time: "4h ago" },
                  { text: "Case #140 marked complete", time: "1d ago" },
                  { text: "Resort inventory updated", time: "2d ago" },
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
