import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface PaymentPanelProps {
  caseStatus: string;
}

export default function PaymentPanel({ caseStatus }: PaymentPanelProps) {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const isPaid = caseStatus === "paid" || caseStatus === "closed";

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Fizetés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPaid ? (
          <div className="p-4 rounded-xl bg-success/5 border border-success/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm text-success font-medium">Fizetés megérkezett</p>
              <p className="text-xs text-muted-foreground mt-1">A fizetés sikeresen feldolgozásra került.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Fizetendő összeg</span>
                <span className="font-bold text-foreground">99 000 HUF</span>
              </div>
              <p className="text-xs text-muted-foreground">Bankkártyás fizetés Stripe felületen keresztül.</p>
            </div>
            <Button className="w-full" onClick={() => navigate(`/seller/cases/${caseId}/payment`)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Fizetés megkezdése
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
