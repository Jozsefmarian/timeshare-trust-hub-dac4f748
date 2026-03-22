import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ManualReviewPanelProps {
  reasonSummary?: string | null;
}

export default function ManualReviewPanel({ reasonSummary }: ManualReviewPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          Manuális ellenőrzés szükséges
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-amber-900">
        <p>Az Ön ügyét nem tudtuk automatikusan véglegesíteni, ezért manuális admin ellenőrzésre került.</p>

        {reasonSummary && (
          <div className="rounded-md border border-amber-200 bg-white/70 p-3">
            <p className="font-medium">Ellenőrzési megjegyzés</p>
            <p className="mt-1 text-amber-800">
              {reasonSummary === "Manual review recommended." ? "Manuális ellenőrzés javasolt." : reasonSummary}
            </p>
          </div>
        )}

        {!reasonSummary && (
          <p className="text-amber-800">
            Az adminisztrátor hamarosan átnézi az ügyet. Az eredményről emailben is értesítjük.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
