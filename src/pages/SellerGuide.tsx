import SellerLayout from "@/components/SellerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, AlertTriangle, Lightbulb, Info } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    number: 1,
    title: "Regisztráció és bejelentkezés",
    description:
      'Ha még nincs fiókja, a főoldalon a "Regisztráció" gombra kattintva hozhatja létre fiókját. Adja meg e-mail címét és válasszon egy jelszót. A regisztráció után egy megerősítő e-mailt küldünk — kattintson a benne lévő linkre a fiók aktiválásához. Ezután a "Bejelentkezés" gombbal léphet be.',
    tips: [
      {
        type: "yellow" as const,
        text: "Jegyezze fel a megadott e-mail címét és jelszavát, mert ezekre legközelebb is szüksége lesz!",
      },
    ],
  },
  {
    number: 2,
    title: "Új ügy indítása",
    description:
      'Bejelentkezés után a bal oldali menüben kattintson az "Új ügy indítása" menüpontra. Ez egy 4 lépéses kitöltési folyamatot indít el. A kitöltés megkezdése előtt kérjük, olvassa el a Tájékoztatót és az ÁSZF-et. Minden lépésnél töltse ki a kért adatokat, majd kattintson a "Következő" gombra.',
    tips: [],
  },
  {
    number: 3,
    title: "1. oldal - Személyes adatok",
    description:
      "Töltse ki személyes adatait: nevét, lakcímét, e-mail címét, telefonszámát, születési adatait, anyja nevét, személyi igazolvány számát és adóazonosító jelét. Ezek az adatok kerülnek majd a szerződésbe, ezért pontosan adja meg őket, pontosan úgy, ahogy a személyi igazolványában szerepelnek.",
    tips: [
      {
        type: "red" as const,
        text: "Kérjük, ellenőrizze duplán a személyes adatokat mielőtt továbblép! Hibás adat esetén a szerződés érvénytelen lehet.",
      },
    ],
  },
  {
    number: 4,
    title: "2. oldal - Az üdülési jog adatai",
    description:
      'Válassza ki az üdülőhelyet a listából, majd adja meg az üdülési hetével kapcsolatos adatokat: a hét számát (ami az eredeti szerződésében szerepel), az apartman típusát és számát, az elhelyezhető személyek számát, a szezon megnevezését, a jogosultság kezdő és záró évét, az eredeti szerződés sorszámát és az idei évre vonatkozó fenntartási díjat. Ha üdülési jogához részvény is kapcsolódik (pl. Abbázia), jelölje be az "Igen" opciót és töltse ki a részvényadatokat is. Amennyiben az Ön üdülője nem szerepel az Üdülőhelyek listájában, kérjük válassza az "Egyéb szálláshely" lehetőséget.',
    tips: [
      {
        type: "blue" as const,
        text: "Tartsa kéznél az üdülési kogával kapcsolatos dokumentumokat - azokban az összes szükséges adat megtalálható.",
      },
    ],
  },
  {
    number: 5,
    title: "3. oldal - Nyilatkozatok",
    description:
      "Olvassa el az oldalon megjelenő nyilatkozatokat, majd pipálja ki mindhárom jelölőnégyzetet. Ezzel megerősíti, hogy az adott nyilatkozatokban foglaltakat elfogadja.",
    tips: [],
  },
  {
    number: 6,
    title: "4. oldal - Dokumentumok feltöltése",
    description:
      "Ezen az oldalon fel kell töltenie az üdülési joghoz kapcsolódó dokumentumokat. Minden dokumentumhoz egy külön feltöltési mezőt talál. A feltöltendő dokumentumok: az eredeti Üdülőhasználati szerződés, a Tájékoztató, vagy Klubrend, és a legutóbbi fenntartási díj befizetését igazoló bizonylat. Ha részvény is kapcsolódik az üdülési joghoz, akkor a Részvény adásvételi szerződést is fel kell töltenie. A feltöltéshez kattintson a szaggatott keretes mezőre, vagy húzza rá a fájlt. Elfogadott formátumok: PDF, JPG, PNG. Ha lefotózza a dokumentumot telefonnal, ügyeljen arra, hogy a szöveg jól olvasható és a kép ne legyen elmosódott.",
    tips: [
      {
        type: "blue" as const,
        text: "Ha nincs szkennere, telefonja kamerájával is lefotózhatja a dokumentumokat. Ügyeljen a jó megvilágításra és arra, hogy a teljes oldal látható legyen a fotón.",
      },
      {
        type: "yellow" as const,
        text: "A 'Beküldés' gomb csak akkor válik aktívvá, ha minden kötelező dokumentum sikeresen feltöltött.",
      },
    ],
  },
  {
    number: 7,
    title: "Feldolgozás és eredmény",
    description:
      "A beküldés után rendszerünk automatikusan ellenőrzi a feltöltött dokumentumokat. Ez általában néhány percet vesz igénybe. Az eredményről az ügy részletes oldalán kap tájékoztatást. Amennyiben a rendszerünk mindent rendben talál, akkor automatikusan folytathatja a folyamatot. Ha bármilyen adatnál eltérést, vagy hibát találunk, minden esetben részletes tájékoztatást kap a további teendőkről.",
    tips: [],
  },
  {
    number: 8,
    title: "Szerződések aláírása",
    description:
      "Ha zöld eredményt kapott, rendszerünk elkészíti az adásvételi szerződéseket és kapcsolódó dokumentumokat, melyket az ügy részletes oldalán tud letölteni. A letöltést követően nyomtassa ki a dokumentumokat, a megfelelő helyeken írja alá kézzel, majd szkennelje be vagy fotózza le, és töltse vissza az oldalon a megfelelő helyre. Minden dokumentumhoz külön feltöltési hely van.",
    tips: [],
  },
  {
    number: 9,
    title: "Szolgáltatási szerződés és fizetés",
    description:
      'Az aláírt dokumentumok visszatöltése után automatikusan megjelenik a Szolgáltatási szerződés. Olvassa el figyelmesen, pipálja ki mindkét jelölőnégyzetet, majd írja be a megerősítő szót: ELFOGADOM. Végül kattintson a "Fizetés megkezdése" gombra. A fizetés folyamata a fizetési szolgáltató biztonságos bankkártyás felületen történik.',
    tips: [],
  },
  {
    number: 10,
    title: "Lezárás",
    description:
      "A sikeres fizetést követően az adásvételi folyamat adminisztratív része lezárul. Ezt követően emailben küldjük meg Önnek az adásvétellel kapcsolatos további információkat és az aláírt dokumentumok egy példányát. A dokumentumok feldolgozását követően azonnal megkezdjük az átruházással kapcsolatos ügyintézést, melynek aktuális állásáról rendszeres időközönként tájékoztatást küldünk Önnek.",
    tips: [],
  },
];

function TipBox({ type, text }: { type: "yellow" | "red" | "blue"; text: string }) {
  const config = {
    yellow: {
      icon: Lightbulb,
      className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
    },
    red: {
      icon: AlertTriangle,
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
    blue: {
      icon: Info,
      className: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200",
    },
  }[type];

  const Icon = config.icon;

  return (
    <Alert className={config.className}>
      <Icon className="h-4 w-4" />
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}

export default function SellerGuide() {
  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Használati útmutató</h1>
          <p className="text-muted-foreground mt-1">Lépésről lépésre — hogyan adja el üdülési jogát</p>
        </div>

        {steps.map((step) => (
          <Card key={step.number}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.number}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              {step.tips.map((tip, i) => (
                <TipBox key={i} type={tip.type} text={tip.text} />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Help section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Elakadt? Segítünk!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ha bármilyen kérdése van a folyamat során, vegye fel velünk a kapcsolatot:
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:kapcsolat@tsrmegoldasok.hu" className="text-primary hover:underline">
                kapcsolat@tsrmegoldasok.hu
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <Link to="/seller/support" className="text-primary hover:underline">
                06 70 415 3337
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
