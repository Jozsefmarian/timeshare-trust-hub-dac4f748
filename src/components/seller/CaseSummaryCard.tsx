import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  draft: { label: "Piszkozat", className: "bg-muted text-muted-foreground" },
  submitted: { label: "Beküldve", className: "bg-primary/15 text-primary border-primary/30" },
  ai_processing: { label: "AI feldolgozás", className: "bg-secondary/15 text-secondary border-secondary/30" },
  yellow_review: { label: "Manuális ellenőrzés", className: "bg-warning/15 text-warning border-warning/30" },
  red_rejected: { label: "Elutasítva", className: "bg-destructive/15 text-destructive border-destructive/30" },
  green_approved: { label: "Jóváhagyva", className: "bg-success/15 text-success border-success/30" },
  contract_generated: { label: "Szerződés generálva", className: "bg-secondary/15 text-secondary border-secondary/30" },
  awaiting_signed_contract: { label: "Aláírásra vár", className: "bg-warning/15 text-warning border-warning/30" },
  signed_contract_uploaded: { label: "Aláírt szerződés feltöltve", className: "bg-secondary/15 text-secondary border-secondary/30" },
  service_agreement_accepted: { label: "Szolgáltatási szerződés elfogadva", className: "bg-secondary/15 text-secondary border-secondary/30" },
  payment_pending: { label: "Fizetés függőben", className: "bg-warning/15 text-warning border-warning/30" },
  paid: { label: "Fizetve", className: "bg-success/15 text-success border-success/30" },
  closed: { label: "Lezárt ügy", className: "bg-success/15 text-success border-success/30" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

interface WeekOfferData {
  resort_name_raw?: string | null;
  week_number?: number | null;
  unit_type?: string | null;
  season_label?: string | null;
}

interface CaseSummaryCardProps {
  caseNumber: string;
  status: string;
  createdAt: string;
  submittedAt?: string | null;
  weekOffer?: WeekOfferData | null;
}

export default function CaseSummaryCard({ caseNumber, status, createdAt, submittedAt, weekOffer }: CaseSummaryCardProps) {
  const badge = statusBadgeMap[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Ügy száma</p>
            <h1 className="text-2xl font-bold text-foreground">{caseNumber}</h1>
          </div>
          <Badge className={cn("text-xs font-semibold px-3 py-1", badge.className)}>
            {badge.label}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Létrehozva</p>
            <p className="font-medium text-foreground">{formatDate(createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Beküldve</p>
            <p className="font-medium text-foreground">{formatDate(submittedAt)}</p>
          </div>
          {weekOffer?.resort_name_raw && (
            <div>
              <p className="text-muted-foreground">Üdülőhely</p>
              <p className="font-medium text-foreground">{weekOffer.resort_name_raw}</p>
            </div>
          )}
          {weekOffer?.week_number && (
            <div>
              <p className="text-muted-foreground">Hét száma</p>
              <p className="font-medium text-foreground">{weekOffer.week_number}. hét</p>
            </div>
          )}
          {weekOffer?.unit_type && (
            <div>
              <p className="text-muted-foreground">Apartman típus</p>
              <p className="font-medium text-foreground">{weekOffer.unit_type}</p>
            </div>
          )}
          {weekOffer?.season_label && (
            <div>
              <p className="text-muted-foreground">Szezon</p>
              <p className="font-medium text-foreground">{weekOffer.season_label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
