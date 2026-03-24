import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import DashboardCard from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CreditCard, DollarSign, Clock, CheckCircle2, Search, ExternalLink, RefreshCw } from "lucide-react";

type PaymentRow = {
  id: string;
  case_id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  invoice_url: string | null;
  cases: {
    case_number: string;
    seller_user_id: string;
    profiles: { full_name: string | null; email: string } | null;
  } | null;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Függőben", className: "bg-warning/10 text-warning border-warning/20" },
  requires_payment: { label: "Fizetésre vár", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Fizetve", className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Sikertelen", className: "bg-destructive/10 text-destructive border-destructive/20" },
  refunded: { label: "Visszatérítve", className: "bg-muted text-muted-foreground border-muted" },
};

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("hu-HU") + " " + (currency || "HUF");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("hu-HU");
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("payments")
      .select(`
        id,
        case_id,
        amount,
        currency,
        status,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        paid_at,
        created_at,
        invoice_url,
        cases (
          case_number,
          seller_user_id,
          profiles:profiles!cases_seller_user_id_fkey ( full_name, email )
        )
      `)
      .order("created_at", { ascending: false });

    if (err) {
      toast.error("Nem sikerült betölteni a fizetéseket.");
      setError(true);
    } else {
      setPayments((data as unknown as PaymentRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadPayments(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const caseNum = p.cases?.case_number?.toLowerCase() || "";
      const name = (p.cases?.profiles?.full_name || p.cases?.profiles?.email || "").toLowerCase();
      return caseNum.includes(q) || name.includes(q);
    });
  }, [payments, search]);

  const paidPayments = payments.filter((p) => p.status === "paid");
  const pendingCount = payments.filter((p) => p.status === "pending" || p.status === "requires_payment").length;
  const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fizetések</h1>
          <p className="text-muted-foreground">Beérkezett és függő fizetések áttekintése</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard title="Összes fizetés" value={String(payments.length)} icon={<CreditCard className="h-5 w-5" />} />
          <DashboardCard title="Sikeres fizetések" value={String(paidPayments.length)} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
          <DashboardCard title="Függő fizetések" value={String(pendingCount)} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <DashboardCard title="Bevétel összesen" value={formatAmount(totalRevenue, "HUF")} icon={<DollarSign className="h-5 w-5" />} variant="accent" />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Tranzakciók</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Keresés ügy vagy eladó alapján..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <p>Hiba történt a betöltés során.</p>
                <Button variant="outline" size="sm" onClick={loadPayments}><RefreshCw className="h-4 w-4 mr-1" />Újrapróbálkozás</Button>
              </div>
            ) : loading ? (
              <Table>
                <TableHeader><TableRow>{Array.from({ length: 8 }).map((_, i) => <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>)}</TableRow></TableHeader>
                <TableBody>{Array.from({ length: 5 }).map((_, r) => <TableRow key={r}>{Array.from({ length: 8 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)}</TableBody>
              </Table>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <CreditCard className="h-10 w-10" />
                <p>{search ? "Nincs találat." : "Még nincs fizetési tranzakció."}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ügy száma</TableHead>
                    <TableHead>Eladó</TableHead>
                    <TableHead>Összeg</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Stripe session</TableHead>
                    <TableHead>Fizetve</TableHead>
                    <TableHead>Számla</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const cfg = statusConfig[p.status] || statusConfig.pending;
                    const sellerName = p.cases?.profiles?.full_name || p.cases?.profiles?.email || "—";
                    const stripeId = p.stripe_checkout_session_id ? (p.stripe_checkout_session_id.length > 20 ? p.stripe_checkout_session_id.slice(0, 20) + "…" : p.stripe_checkout_session_id) : "—";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.cases?.case_number || "—"}</TableCell>
                        <TableCell>{sellerName}</TableCell>
                        <TableCell>{formatAmount(p.amount, p.currency)}</TableCell>
                        <TableCell><Badge className={cfg.className}>{cfg.label}</Badge></TableCell>
                        <TableCell><span className="font-mono text-xs">{stripeId}</span></TableCell>
                        <TableCell>{formatDate(p.paid_at)}</TableCell>
                        <TableCell>
                          {p.invoice_url ? (
                            <Button variant="ghost" size="sm" asChild><a href={p.invoice_url} target="_blank" rel="noopener noreferrer">Megnyitás <ExternalLink className="h-3 w-3 ml-1" /></a></Button>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
