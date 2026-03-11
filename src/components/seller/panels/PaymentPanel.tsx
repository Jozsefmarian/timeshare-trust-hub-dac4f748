import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle } from "lucide-react";

interface PaymentPanelProps {
  caseStatus: string;
}

export default function PaymentPanel({ caseStatus }: PaymentPanelProps) {
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
            <CheckCircle className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="text-sm text-success font-medium">Fizetés megérkezett</p>
              <p className="text-xs text-muted-foreground mt-1">
                A fizetés sikeresen feldolgozásra került.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-sm font-medium text-foreground">Fizetés függőben</p>
              <p className="text-xs text-muted-foreground mt-1">
                A fizetés feldolgozása folyamatban. Az online fizetési lehetőség hamarosan elérhető lesz.
              </p>
            </div>
            <Button className="w-full" disabled>
              <CreditCard className="h-4 w-4 mr-2" />
              Fizetés (hamarosan)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
