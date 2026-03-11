import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function ManualReviewPanel() {
  return (
    <Card className="shadow-sm border-warning/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Manuális ellenőrzés szükséges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
          <p className="text-sm font-medium text-foreground">
            Az Ön ügyéhez kézi ellenőrzés szükséges.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            A kézi ellenőrzés legfeljebb 24 órán belül megtörténik.
            Amint elkészült, emailben is értesítjük.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
