import SellerLayout from "@/components/SellerLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, FileCheck, Clock, CreditCard } from "lucide-react";

export default function SellerDashboard() {
  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seller Dashboard</h1>
          <p className="text-muted-foreground">Welcome back. Here's an overview of your timeshare cases.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Active Cases" value="3" icon={<FolderOpen className="h-4 w-4" />} variant="accent" description="2 pending review" />
          <DashboardCard title="Documents" value="12" icon={<FileCheck className="h-4 w-4" />} variant="success" trend="+2" description="this week" />
          <DashboardCard title="Pending Actions" value="5" icon={<Clock className="h-4 w-4" />} variant="warning" description="action required" />
          <DashboardCard title="Payments" value="$4,200" icon={<CreditCard className="h-4 w-4" />} description="total received" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader><CardTitle className="text-base">Active Cases</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Marriott Vacation Club — Week 32", status: "Under Review", color: "bg-warning" },
                  { name: "Hilton Grand Vacations — Week 14", status: "Documents Pending", color: "bg-secondary" },
                  { name: "Wyndham Resorts — Week 48", status: "Transfer in Progress", color: "bg-success" },
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
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: "Document uploaded for Case #102", time: "2h ago" },
                  { text: "Case #98 status updated", time: "5h ago" },
                  { text: "Payment received — $1,400", time: "1d ago" },
                  { text: "New case created", time: "3d ago" },
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
