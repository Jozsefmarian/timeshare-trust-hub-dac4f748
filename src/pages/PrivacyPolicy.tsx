import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-bold text-foreground mb-2">ADATVÉDELMI TÁJÉKOZTATÓ</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Üdülőhasználati jogok adásvételére irányuló regisztrációhoz és ügyintézéshez
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Bevezetés</h2>
          <p className="text-foreground/80 leading-relaxed">
            A jelen Tájékoztató célja, hogy közérthető módon tájékoztassa Önt (a továbbiakban: Felhasználó) arról, miként kezeli a Zaleo Consulting Kft. (a továbbiakban: Adatkezelő) a weboldalon történő regisztráció és az üdülőhasználati jog adásvételi folyamata során megadott személyes adatait. Az Adatkezelő elkötelezett a Felhasználók magánszférájának védelme és a hatályos európai (GDPR) és magyar (Infotv.) jogszabályok betartása mellett.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. Az adatkezelés jogalapja és célja</h2>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó a weboldalon történő regisztrációval kifejezett hozzájárulását adja az adatai kezeléséhez. Az adatkezelés célja:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>az üdülőhasználati jog adásvételére irányuló szerződés előkészítése, a Felhasználó tulajdonjogának és tartozásmentességének és érvényességének ellenőrzése (GDPR 6. cikk (1) b)).</li>
            <li>a szolgáltatási szerződés teljesítése és átírás: az üdülőhasználati jog átruházásához szükséges jogi és adminisztratív lépések megtétele az érintett szervezeteknél (GDPR 6. cikk (1) b)).</li>
            <li>Az adatkezelés alapja továbbá a számviteli kötelezettségek teljesítése és az Adatkezelő jogos érdeke a szerzett jogok hiteles igazolására (Számviteli tv. 169. §).</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. A kezelt adatok köre</h2>
          <p className="text-foreground/80 leading-relaxed">
            Az Adatkezelő kizárólag a cél eléréséhez elengedhetetlenül szükséges adatokat kezeli:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Személyes adatok:</strong> teljes név, születési név, születési hely és idő, anyja neve, személyi igazolvány száma.</li>
            <li><strong>Elérhetőségek:</strong> lakcím, e-mail cím, telefonszám.</li>
            <li><strong>Vagyoni adatok:</strong> Az üdülőhasználati jogot rögzítő eredeti szerződés adatai, tagsági azonosító, az üdülőegység paraméterei, valamint a közös költség/fenntartási díj egyenlege. Az üdülőhasználati joghoz köthető részvény / részjegy esetén az értékpapír megnevezése, névértéke, darabszáma, értékpapírszámla számlaszáma, számlavezető intézet neve, ügyfélazonosító.</li>
            <li><strong>Technikai adatok:</strong> A regisztráció időpontja, IP-cím és a süti-beállítások (a visszaélések megelőzése érdekében).</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. Az adatok megőrzésének ideje</h2>
          <p className="text-foreground/80 leading-relaxed">
            Az Adatkezelő a regisztráció során megadott adatokat a szerződéses kapcsolat fennállása alatt, illetve az adásvételi szerződés teljesítését követő 5 évig (általános polgári jogi elévülési idő) őrzi meg. A számviteli bizonylatokat (amennyiben sor kerül pénzügyi teljesítésre) a törvényi előírásoknak megfelelően 8 évig köteles megőrizni az Adatkezelő. Amennyiben a regisztrációt követően nem jön létre szerződés, az adatokat a Felhasználó kérésére vagy az üzleti kapcsolat meghiúsulását követő 6 hónapon belül töröljük.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Adattovábbítás és adatfeldolgozók</h2>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó tudomásul veszi, hogy az üdülőhasználati jog átírásának és a kötelezettségátvállalásnak elengedhetetlen feltétele az adatok továbbítása az érintett üdülőhely üzemeltetője, az üdülőszövetkezet vagy a klubkezelő szervezet felé, az üdülőhasználati joghoz köthető részvény / részjegy esetén pedig az értékpapírszámlát vezető szervezet felé is. Az Adatkezelő szavatolja, hogy ezen partnerek felé kizárólag az átruházáshoz minimálisan szükséges adatokat továbbítja.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Az Adatkezelő adatmegőrzési helyei: székhely, DotRoll Kft. (1148 Budapest, Fogarasi út 3-5., tárhelyszolgáltatás) és Supabase Inc. (Németország, Frankfurt - AWS eu-central-1 régió, tárhelyszolgáltatás, adatbázis kezelés).
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Adatbiztonsági intézkedések</h2>
          <p className="text-foreground/80 leading-relaxed">
            Az Adatkezelő kijelenti, hogy az adatokat jelszóval védett, titkosított szervereken tárolja. A papír alapú szerződéseket elzárt helyen őrzi. A weboldalon SSL titkosítást és biztonságos fizetési átjárót alkalmaz.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. Elektronikus kapcsolattartás és Sütik</h2>
          <p className="text-foreground/80 leading-relaxed">
            A weboldal (www.tsrmegoldasok.hu) a Felhasználó azonosítása és a biztonságos munkamenet érdekében sütiket (cookie) használ. Az elektronikus kapcsolattartás kizárólag az adásvételi folyamat gördülékenységét szolgálja.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">8. A Felhasználó jogai</h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li><strong>Hozzáférés joga:</strong> Joga van tájékoztatást kapni arról, hogy adatainak kezelése folyamatban van-e.</li>
            <li><strong>Helyesbítés joga:</strong> Kérheti a pontatlan adatok kijavítását.</li>
            <li><strong>Törlés joga ("elfeledtetés"):</strong> Kérheti adatai törlését, ha az adatkezelés célja megszűnt, vagy ha visszavonja hozzájárulását (kivéve a 8 éves számviteli megőrzést).</li>
            <li><strong>Adathordozhatóság:</strong> Jogosult arra, hogy adatait tagolt, géppel olvasható formátumban megkapja.</li>
            <li><strong>Tiltakozáshoz való jog:</strong> Tiltakozhat személyes adatai jogos érdekből történő kezelése ellen.</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">9. Jogorvoslati lehetőségek</h2>
          <p className="text-foreground/80 leading-relaxed">
            Kérdés esetén: <a href="mailto:kapcsolat@tsrmegoldasok.hu" className="text-secondary hover:underline">kapcsolat@tsrmegoldasok.hu</a>
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)<br />
            Cím: 1055 Budapest, Falk Miksa utca 9-11.<br />
            E-mail: <a href="mailto:ugyfelszolgalat@naih.hu" className="text-secondary hover:underline">ugyfelszolgalat@naih.hu</a><br />
            Web: <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">www.naih.hu</a>
          </p>
        </section>
      </div>
    </div>
  );
}
