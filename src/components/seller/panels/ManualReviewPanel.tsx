import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// messageType értékek:
// "uze1" — Üzenet 1: sárga1 ág, recheck limit elérve, manuális review kényszer
// "uze3" — Üzenet 3: sárga2 ág, policy ütközés, nem volt recheck
// null   — ha a classifications rekord még töltődik (transition állapot)

interface ManualReviewPanelProps {
  messageType: "uze1" | "uze3" | null;
  reasonSummary?: string | null;
}

export default function ManualReviewPanel({ messageType, reasonSummary }: ManualReviewPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          Manuális ellenőrzés szükséges
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-amber-900">
        {/* Üzenet 1: sárga1 limit — recheck_limit_reached */}
        {messageType === "uze1" && (
          <p>
            Sajnos a javítás sikertelen volt, így az ügyét átirányítottuk munkatársunkhoz ellenőrzésre. A manuális
            ellenőrzést legfeljebb 24 órán belül elvégezzük. Az eredményről azonnali értesítést küldünk Önnek e-mailben
            és folytathatja az adásvételi folyamatot.
          </p>
        )}

        {/* Üzenet 3: sárga2 — policy ütközés, nem kizáró */}
        {messageType === "uze3" && (
          <p>
            Az Ön által feltöltött dokumentumok alapján, az üdülési hetének megvásárlásáról további részletes elemzést
            követően tudunk megalapozott döntést hozni. Az elemzést legfeljebb 24 órán belül elvégezzük. Az eredményről
            és a további teendőkről emailben küldünk Önnek tájékoztatást.
          </p>
        )}

        {/* Töltődés közben fallback */}
        {messageType === null && (
          <p className="text-amber-800">
            Az adminisztrátor hamarosan átnézi az ügyet. Az eredményről emailben is értesítjük.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
