import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

interface RejectedPanelProps {
  reasonSummary?: string | null;
}

export default function RejectedPanel({ reasonSummary }: RejectedPanelProps) {
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
          <p className="text-sm font-medium text-foreground">
            Az Ön ügyét sajnos nem tudtuk elfogadni.
          </p>
          {reasonSummary && (
            <p className="text-sm text-muted-foreground">{reasonSummary}</p>
          )}
          {!reasonSummary && (
            <p className="text-xs text-muted-foreground">
              Amennyiben kérdése van, kérjük vegye fel velünk a kapcsolatot.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
