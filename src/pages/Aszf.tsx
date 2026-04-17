import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Aszf() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Button
          variant="ghost"
          className="mb-8 -ml-2 text-muted-foreground"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">ÁLTALÁNOS SZERZŐDÉSI FELTÉTELEK</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Üdülőhasználati jogok adásvételére irányuló szolgáltatáshoz
        </p>

        <section className="space-y-4 mb-8">
          <p className="text-foreground/80 leading-relaxed">
            Az Általános Szerződési Feltételek szövege hamarosan elérhető.
          </p>
        </section>
      </div>
    </div>
  );
}
