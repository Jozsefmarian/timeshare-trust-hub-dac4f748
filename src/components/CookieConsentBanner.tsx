import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, BarChart3, Target, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent, type CookieConsent } from "@/hooks/useCookieConsent";

const categories = [
  {
    key: "necessary" as const,
    icon: Lock,
    name: "Szükséges sütik",
    description:
      "Ezek a sütik a weboldal alapvető működéséhez elengedhetetlenek, nem kapcsolhatók ki. Pl. munkamenet-kezelés, biztonsági tokenek.",
    locked: true,
  },
  {
    key: "analytics" as const,
    icon: BarChart3,
    name: "Analitikai sütik",
    description:
      "Anonim statisztikai adatokat gyűjtünk a weboldal használatáról a felhasználói élmény javítása érdekében.",
    locked: false,
  },
  {
    key: "marketing" as const,
    icon: Target,
    name: "Marketing sütik",
    description:
      "Releváns hirdetések megjelenítéséhez és a kampányok hatékonyságának méréséhez használjuk.",
    locked: false,
  },
  {
    key: "preferences" as const,
    icon: Settings,
    name: "Preferencia sütik",
    description:
      "Lehetővé teszik, hogy a weboldal megjegyezze az Ön beállításait (pl. nyelv, megjelenítési mód).",
    locked: false,
  },
];

export function CookieConsentBanner() {
  const { hasDecided, consent, acceptAll, rejectAll, saveCustom } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [customConsent, setCustomConsent] = useState<CookieConsent>(consent);

  if (hasDecided) return null;

  const handleToggle = (key: keyof CookieConsent) => {
    if (key === "necessary") return;
    setCustomConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveCustom = () => {
    saveCustom(customConsent);
  };

  const openSettings = () => {
    setCustomConsent(consent);
    setShowSettings(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] animate-slide-up">
      {!showSettings ? (
        /* Layer 1 — Banner */
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 text-white px-4 py-5 md:px-8 md:py-6">
          <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1">🍪 Sütiket használunk</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Weboldalunk sütiket (cookie-kat) alkalmaz a jobb felhasználói élmény érdekében,
                statisztikai célokra és releváns tartalmak megjelenítéséhez. Az Elfogad gombra
                kattintva hozzájárul az összes süti használatához. Részletekért olvassa el{" "}
                <Link to="/privacy" className="underline text-blue-400 hover:text-blue-300">
                  Adatkezelési Tájékoztatónkat
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
              <Button
                variant="outline"
                onClick={rejectAll}
                className="border-slate-500 text-slate-200 hover:bg-slate-800 hover:text-white bg-transparent w-full sm:w-auto"
              >
                Mindet elutasít
              </Button>
              <Button
                variant="secondary"
                onClick={openSettings}
                className="w-full sm:w-auto"
              >
                Beállítások
              </Button>
              <Button onClick={acceptAll} className="w-full sm:w-auto">
                Mindet elfogad
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Layer 2 — Settings panel */
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 text-white px-4 py-5 md:px-8 md:py-6 max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto">
            <h3 className="text-lg font-semibold mb-1">Süti-beállítások</h3>
            <p className="text-sm text-slate-300 mb-5">
              Az alábbi kategóriák szerint személyre szabhatja a süti-hozzájárulást.
            </p>

            <div className="space-y-3 mb-6">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const checked = cat.key === "necessary" ? true : customConsent[cat.key];
                return (
                  <div
                    key={cat.key}
                    className="flex items-start gap-3 bg-slate-800/60 rounded-lg p-4"
                  >
                    <Icon className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cat.name}</div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={() => handleToggle(cat.key)}
                      disabled={cat.locked}
                      className={cat.locked ? "opacity-50 cursor-not-allowed" : ""}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSettings(false)}
                className="border-slate-500 text-slate-200 hover:bg-slate-800 hover:text-white bg-transparent w-full sm:w-auto"
              >
                Visszalépés
              </Button>
              <Button onClick={handleSaveCustom} className="w-full sm:w-auto">
                Beállítások mentése
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
