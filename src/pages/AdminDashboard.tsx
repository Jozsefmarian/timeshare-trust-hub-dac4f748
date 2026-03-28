import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, FileCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ACTION_LABELS: Record<string, string> = {
  submit_case: "Ügy beküldve",
  contracts_generated: "Szerződések generálva",
  payment_received: "Fizetés beérkezett",
  admin_override: "Admin besorolás",
  policy_published: "Szabályzat közzétéve",
  case_closed: "Ügy lezárva",
};

const STATUS_COLORS: Record<string, string> = {
  green_approved: "bg-success",
  yellow_review: "bg-warning",
  red_rejected: "bg-destructive",
  draft: "bg-muted-foreground",
  submitted: "bg-secondary",
  ai_processing: "bg-secondary",
  closed: "bg-success",
  cancelled: "bg-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Piszkozat",
  docs_uploaded: "Dokumentumok feltöltve",
  submitted: "Beküldve",
  ai_processing: "AI feldolgozás",
  green_approved: "Jóváhagyva",
  yellow_review: "Felülvizsgálat alatt",
  red_rejected: "Elutasítva",
  contract_generated: "Szerződés generálva",
  awaiting_signed_contract: "Aláírt szerződés várható",
  signed_contract_uploaded: "Aláírt szerződés feltöltve",
  service_agreement_accepted: "Megbízási szerződés elfogadva",
  payment_pending: "Fizetésre vár",
  paid: "Fizetve",
  closed: "Lezárva",
  cancelled: "Visszavonva",
  stuck_needs_support: "Elakadt",
};

type RecentCase = {
  id: string;
  case_number: string;
  status: string;
  seller_name: string;
};

type RecentActivity = {
  id: string;
  action: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [totalCases, setTotalCases] = useState<number | null>(null);
  const [activeSellers, setActiveSellers] = useState<number | null>(null);
  const [pendingReviews, setPendingReviews] = useState<number | null>(null);
  const [flaggedItems, setFlaggedItems] = useState<number | null>(null);
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [casesRes, sellersRes, reviewsRes, flaggedRes, recentCasesRes, activityRes] = await Promise.all([
        supabase.from("cases").select("id", { count: "exact", head: true }),
        supabase.from("cases").select("seller_user_id").not("status", "in", "(closed,cancelled)"),
        supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "yellow_review"),
        supabase.from("case_restriction_hits").select("id", { count: "exact", head: true }).eq("severity", "confirmed"),
        supabase.from("cases").select("id, case_number, status, seller_user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("audit_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      setTotalCases(casesRes.count ?? 0);
      
      // Count distinct seller_user_ids
      if (sellersRes.data) {
        const unique = new Set(sellersRes.data.map((r: { seller_user_id: string }) => r.seller_user_id));
        setActiveSellers(unique.size);
      } else {
        setActiveSellers(0);
      }

      setPendingReviews(reviewsRes.count ?? 0);
      setFlaggedItems(flaggedRes.count ?? 0);

      // Load seller names for recent cases
      if (recentCasesRes.data && recentCasesRes.data.length > 0) {
        const sellerIds = [...new Set(recentCasesRes.data.map((c) => c.seller_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", sellerIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.id, p.full_name || p.email])
        );

        setRecentCases(
          recentCasesRes.data.map((c) => ({
            id: c.id,
            case_number: c.case_number,
            status: c.status,
            seller_name: profileMap.get(c.seller_user_id) || "Ismeretlen",
          }))
        );
      } else {
        setRecentCases([]);
      }

      setRecentActivity(activityRes.data || []);
      setLoading(false);
    };

    load();
  }, []);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} perce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} órája`;
    const days = Math.floor(hours / 24);
    return `${days} napja`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin vezérlőpult</h1>
          <p className="text-muted-foreground">Platform áttekintés és ügykezelés.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Összes ügy" value={loading ? "..." : String(totalCases ?? 0)} icon={<FolderOpen className="h-4 w-4" />} variant="accent" />
          <DashboardCard title="Aktív eladók" value={loading ? "..." : String(activeSellers ?? 0)} icon={<Users className="h-4 w-4" />} description="aktív ügyekkel" />
          <DashboardCard title="Függő felülvizsgálatok" value={loading ? "..." : String(pendingReviews ?? 0)} icon={<FileCheck className="h-4 w-4" />} variant="warning" description="beavatkozásra vár" />
          <DashboardCard title="Megjelölt elemek" value={loading ? "..." : String(flaggedItems ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" description="megerősített korlátozás" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader><CardTitle className="text-base">Ügyek áttekintése</CardTitle></CardHeader>
            <CardContent>
              {recentCases.length === 0 && !loading ? (
                <p className="text-sm text-muted-foreground">Még nincsenek ügyek.</p>
              ) : (
                <div className="space-y-4">
                  {recentCases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-foreground text-sm">{c.case_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.seller_name} · {STATUS_LABELS[c.status] || c.status}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[c.status] || "bg-muted-foreground"}`} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Legutóbbi tevékenység</CardTitle></CardHeader>
            <CardContent>
              {recentActivity.length === 0 && !loading ? (
                <p className="text-sm text-muted-foreground">Nincs tevékenység.</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-secondary shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">{ACTION_LABELS[a.action] || a.action}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
