import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

interface RejectedPanelProps {
  reasonSummary?: string | null;
  reasonCodes?: string[] | null;
}

export default function RejectedPanel({ reasonSummary, reasonCodes }: RejectedPanelProps) {
  return (
    <Card className="shadow-sm border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          Ügy elutasítva
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
          {/* Üzenet 2 — specifikáció szerinti szöveg, minden elutasítási esetben */}
          <p className="text-sm font-medium text-foreground">
            Az Ön által feltöltött dokumentumok alapján a szálláshely tiltja az átruházást, így sajnos nem tudjuk
            megvásárolni az üdülési jogát. A részletekért kérjük keresse fel ügyfélszolgálatunkat.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
