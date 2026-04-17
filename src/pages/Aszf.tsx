import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Aszf() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Button variant="ghost" className="mb-8 -ml-2 text-muted-foreground" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">ÁLTALÁNOS SZERZŐDÉSI FELTÉTELEK</h1>
        <p className="text-muted-foreground mb-2 text-lg">TSR Megoldások Online Platform</p>
        <p className="text-muted-foreground mb-8 text-sm">Hatályos: 2026. január 1-jétől</p>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Fogalommeghatározások</h2>
          <p className="text-foreground/80 leading-relaxed">
            Jelen ÁSZF alkalmazásában az alábbi fogalmak az itt meghatározott jelentéssel bírnak:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['"Szolgáltató" / "Vevő"', "Zaleo Consulting Kft., a TSR Megoldások Platform üzemeltetője."],
                  [
                    '"Platform"',
                    "A Szolgáltató által üzemeltetett www.tsrmegoldasok.hu webalkalmazás, amely üdülőhasználati jogok adásvételével kapcsolatos adminisztratív folyamatot automatizálja.",
                  ],
                  [
                    '"Felhasználó" / "Eladó"',
                    "Az a természetes személy, aki a Platformon regisztrál, és az üdülőhasználati jogának adásvételével kapcsolatban veszi igénybe a szolgáltatást.",
                  ],
                  ['"Üdülőhasználati jog"', "Szálláshely időben megosztott használati jog (üdülési jog)."],
                  [
                    '"Ügy" / "Case"',
                    "Az Eladó által a Platformon indított, egy adott üdülőhasználati jogra vonatkozó adásvételi folyamat, egyedi azonosítóval ellátva.",
                  ],
                  [
                    '"AI-pipeline"',
                    "A Szolgáltató által működtetett, MI-alapú dokumentumellenőrzési és besorolási folyamat.",
                  ],
                  [
                    '"Besorolás"',
                    "Az AI-pipeline által adott értékelés: Zöld (azonnali folytatás), Sárga (javítás, ellenőrzés), Piros (elutasítás).",
                  ],
                  [
                    '"Szolgáltatási díj"',
                    "Az Eladó által, az adásvétellel kapcsolatban felmerülő adminisztratív és koordinációs szolgáltatásokért fizetendő, a szolgáltatás ellenértékeként meghatározott egyszeri díj.",
                  ],
                  [
                    '"Adásvételi szerződés"',
                    "A Platform által generált, a Vevő és az Eladó között létrejövő, az üdülőhasználati jog átruházásáról szóló okirat.",
                  ],
                  [
                    '"Szolgáltatási szerződés"',
                    "A Felhasználó által elektronikusan elfogadott, a Szolgáltató és a Felhasználó között létrejött, az adásvétellel kapcsolatban felmerülő adminisztratív és koordinációs szolgáltatásokra vonatkozó szerződés.",
                  ],
                  [
                    '"Aláírt dokumentum"',
                    "Az Eladó által kézzel aláírt, beszkennelt vagy lefotózott és a Platformra visszatöltött szerződésdokumentum.",
                  ],
                  [
                    '"Személyes adat"',
                    "Az EU 2016/679 rendelet (GDPR) 4. cikke szerinti bármely adat, amely azonosított vagy azonosítható természetes személyre vonatkozik.",
                  ],
                ].map(([term, def]) => (
                  <tr key={term} className="border border-border">
                    <td className="p-2 font-medium text-foreground align-top w-48">{term}</td>
                    <td className="p-2 text-foreground/80">{def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. A Szolgáltató adatai és elérhetőségei</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ["Cégnév:", "Zaleo Consulting Kft."],
                  ["Székhely:", "8864 Tótszerdahely, Kossuth Lajos u. 154."],
                  ["Cégjegyzékszám:", "20-09-079602"],
                  ["Adószám:", "32772584-1-20"],
                  ["EU adószám:", "HU32772584"],
                  ["Képviselő:", "Marián József, ügyvezető"],
                  ["E-mail:", "kapcsolat@tsrmegoldasok.hu"],
                  ["Weboldal:", "https://www.tsrmegoldasok.hu"],
                  ["Tárhelyszolgáltató (backend):", "Supabase (Supabase Inc., San Francisco, CA, USA)"],
                  ["Tárhelyszolgáltató (frontend):", "Dotroll Kft. (www.dotroll.com)"],
                  ["Panasz ügyintézés:", "kapcsolat@tsrmegoldasok.hu | ügyintézési idő: munkanapokon 10–16 óra"],
                ].map(([label, value]) => (
                  <tr key={label} className="border border-border">
                    <td className="p-2 font-medium text-foreground align-top w-48">{label}</td>
                    <td className="p-2 text-foreground/80">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. Az ÁSZF hatálya, elfogadása és módosítása</h2>
          <h3 className="text-base font-semibold text-foreground">3.1 Tárgyi és személyi hatály</h3>
          <p className="text-foreground/80 leading-relaxed">
            Jelen ÁSZF a Szolgáltató által üzemeltetett TSR Megoldások Platformon nyújtott, az üdülőhasználati jogok
            adásvételével kapcsolatos adminisztratív szolgáltatásra terjed ki. Hatálya kiterjed minden olyan természetes
            személyre, aki a Platformon regisztrál, ügyet indít, vagy a szolgáltatást bármilyen módon igénybe veszi.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Az ÁSZF személyi hatálya nem terjed ki jogi személyekre: a Platform kizárólag természetes személyek
            (fogyasztók) részére nyújt szolgáltatást.
          </p>
          <h3 className="text-base font-semibold text-foreground">3.2 Az ÁSZF elfogadása</h3>
          <p className="text-foreground/80 leading-relaxed">
            Az ÁSZF-t a Felhasználónak regisztráció során aktív checkbox-szal (jelölőnégyzettel) kell jóváhagynia; az
            elfogadás ténye, időpontja és a felhasználó IP-címe naplózásra kerül.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Kiskorú személy (18. életévét be nem töltött személy) nem regisztrálhat a Platformra és nem veheti igénybe a
            szolgáltatást.
          </p>
          <h3 className="text-base font-semibold text-foreground">3.3 Az ÁSZF módosítása</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató jogosult jelen ÁSZF-t egyoldalúan módosítani. A módosításokról a Felhasználókat a módosítás
            hatályba lépése előtt legalább 15 nappal értesíti a regisztrált e-mail-címre küldött értesítővel és a
            Platform főoldalán elhelyezett közleménnyel.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Ha a Felhasználó a módosítás hatályba lépéséig nem jelzi írásban ellenvetését, és a Platform használatát
            folytatja, az a módosított ÁSZF elfogadásának minősül. Az értesítéstől számított 30 napon belül a
            Felhasználó a szolgáltatást díjmentesen megszüntetheti, ha a módosítást nem fogadja el.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Folyamatban lévő ügyekre a módosítás nem alkalmazható visszamenőlegesen; ezekre a módosítás hatályba
            lépésekor érvényes ÁSZF vonatkozik.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. A szolgáltatás tárgya és tartalma</h2>
          <h3 className="text-base font-semibold text-foreground">4.1 A szolgáltatás leírása</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató a TSR Megoldások Platformon keresztül az üdülőhasználati jogok adásvételével kapcsolatos
            adminisztratív folyamatot automatizálja az alábbi tevékenységek ellátásával:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Az Eladó üdülőhasználati jogára vonatkozó adatok és dokumentumok elektronikus befogadása;</li>
            <li>
              Az AI-pipeline segítségével a feltöltött dokumentumok feldolgozása, mezőkinyerés, adategyezés-vizsgálat és
              tiltó klauzula keresés;
            </li>
            <li>A besorolás (Zöld/Sárga/Piros) meghatározása és közlése az Eladóval;</li>
            <li>
              Az értékesítési folyamathoz szükséges okiratok dinamikus generálása és az Eladónak való elektronikus
              kézbesítése;
            </li>
            <li>A Szolgáltatási szerződés elektronikus megkötésének és elfogadásának lebonyolítása;</li>
            <li>A Stripe fizetési rendszeren keresztüli online díjfizetés kezelése;</li>
            <li>A Felhasználó tájékoztatása az ügy aktuális státuszáról.</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">4.2 Amit a Szolgáltatás NEM tartalmaz</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató kifejezetten tájékoztatja az Eladót, hogy a Platform által nyújtott szolgáltatás:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>
              nem minősül ingatlanközvetítői tevékenységnek az ingatlan-közvetítői tevékenységről szóló 499/2017. (XII.
              29.) Korm. rendelet értelmében, Szolgáltató nem végez vevőkeresést;
            </li>
            <li>nem jogi tanácsadás és nem helyettesíti a független jogi szakértőhöz való fordulást;</li>
            <li>nem garantálja a Felhasználó által eladott üdülőhasználati jog tényleges átvezetését.</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">4.3 A szolgáltatás igénybevételének előfeltételei</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>érvényes e-mail-cím és jelszóval végzett regisztráció;</li>
            <li>az eladni kívánt üdülőhasználati jog teljes körű, valós adatainak megadása;</li>
            <li>az előírt dokumentumok elektronikus feltöltése;</li>
            <li>jelen ÁSZF és az adatkezelési tájékoztató elfogadása;</li>
            <li>cselekvőképes, 18. életévét betöltött természetes személy státusz.</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Regisztráció, fiókkezelés</h2>
          <h3 className="text-base font-semibold text-foreground">5.1 A regisztráció menete</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó a Platformon e-mail-cím és jelszó megadásával hozhat létre fiókot. A Felhasználó felelős
            azért, hogy a megadott adatok valósak, pontosak és naprakészek legyenek. Valótlan adatok megadása az ÁSZF
            súlyos megszegésének minősül, és a szolgáltatás felfüggesztését vonhatja maga után.
          </p>
          <h3 className="text-base font-semibold text-foreground">5.2 Fiókbiztonság</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó köteles jelszavát titokban tartani, és harmadik személlyel nem közölheti azt. A Felhasználó
            teljes felelősséggel tartozik a fiókjában elvégzett minden műveletért. Ha a Felhasználó tudomást szerez
            arról, hogy jelszavát illetéktelen személy ismerheti, köteles azt haladéktalanul megváltoztatni, és a
            Szolgáltatót értesíteni.
          </p>
          <h3 className="text-base font-semibold text-foreground">5.3 Egy felhasználó, egy fiók</h3>
          <p className="text-foreground/80 leading-relaxed">
            Minden természetes személy kizárólag egy fiókot hozhat létre a Platformon. Több fiók létrehozása tilos; a
            Szolgáltató jogosult a duplikált fiókokat törölni.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Az ügy indítása és a folyamat lépései</h2>
          <h3 className="text-base font-semibold text-foreground">6.1 Ügyindítás és adatmegadás</h3>
          <p className="text-foreground/80 leading-relaxed">
            Regisztrációt követően az Eladó a Platformon új ügyet indíthat az üdülőhasználati jogra vonatkozó adatok
            megadásával, négy lépésben: személyes adatok, üdülőhasználati jog adatai, nyilatkozatok,
            dokumentumfeltöltés.
          </p>
          <h3 className="text-base font-semibold text-foreground">6.2 Azonnali dokumentumfeltöltés</h3>
          <p className="text-foreground/80 leading-relaxed">
            A dokumentumfeltöltés a fájl kiválasztásának pillanatában azonnal megtörténik. Az elküldés gomb csak akkor
            aktív, ha minden kötelező dokumentum sikeresen lett feltöltve.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Kötelezően feltöltendő dokumentumok: üdülőhasználati szerződés, Tájékoztató vagy Klubrend, legutolsó
            fenntartási díj bizonylat, valamint Abbázia üdülő esetén részvény adásvételi szerződés.
          </p>
          <h3 className="text-base font-semibold text-foreground">6.3 Az ügy beküldése</h3>
          <p className="text-foreground/80 leading-relaxed">
            A kötelező dokumentumok sikeres feltöltése után az Eladó az „Ügy beküldése" gombra kattintva adja be az
            ügyét. Beküldés után az Eladó az adatokat és dokumentumokat nem módosíthatja, kivéve a javítási eljárás
            keretében.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. AI-alapú dokumentumellenőrzés és besorolás</h2>
          <h3 className="text-base font-semibold text-foreground">7.1 Az AI-pipeline működése</h3>
          <p className="text-foreground/80 leading-relaxed">
            Az ügy beküldése után a Szolgáltató automatizált dokumentumellenőrző folyamatot futtat: szövegkinyerés
            (OCR), dokumentumtípus-azonosítás, mezőkinyerés, adategyezés-vizsgálat, tiltó klauzula keresés, besorolás.
          </p>
          <h3 className="text-base font-semibold text-foreground">7.2 Besorolások és következményeik</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left border border-border font-semibold">Besorolás</th>
                  <th className="p-2 text-left border border-border font-semibold">Feltétel</th>
                  <th className="p-2 text-left border border-border font-semibold">Következmény</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border border-border">
                  <td className="p-2 text-foreground/80">🟢 ZÖLD</td>
                  <td className="p-2 text-foreground/80">Nem talált semmilyen hibát</td>
                  <td className="p-2 text-foreground/80">Azonnali továbblépés.</td>
                </tr>
                <tr className="border border-border">
                  <td className="p-2 text-foreground/80">🟡 SÁRGA (javítható)</td>
                  <td className="p-2 text-foreground/80">Eladó által javítható adateltérés</td>
                  <td className="p-2 text-foreground/80">Eladó javíthatja az adatokat.</td>
                </tr>
                <tr className="border border-border">
                  <td className="p-2 text-foreground/80">🟡 SÁRGA (admin)</td>
                  <td className="p-2 text-foreground/80">Egyedi elbírálás szükséges</td>
                  <td className="p-2 text-foreground/80">Manuális adminisztrátori felülvizsgálat.</td>
                </tr>
                <tr className="border border-border">
                  <td className="p-2 text-foreground/80">🔴 PIROS</td>
                  <td className="p-2 text-foreground/80">Egyértelmű kizáró ok</td>
                  <td className="p-2 text-foreground/80">Az ügy automatikusan lezárásra kerül.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 className="text-base font-semibold text-foreground">7.3 Javítási folyamat</h3>
          <p className="text-foreground/80 leading-relaxed">
            Ha az ügy „Sárga – javítható" besorolást kap, az Eladó legfeljebb 3 alkalommal kísérelheti meg a hiba
            javítását. Ha a 3. kísérlet sem eredményez Zöld besorolást, az ügy automatikusan manuális felülvizsgálatra
            kerül.
          </p>
          <h3 className="text-base font-semibold text-foreground">7.4 Az AI-pipeline korlátai</h3>
          <p className="text-foreground/80 leading-relaxed">
            Az AI-pipeline valószínűségi módszereken alapul, és az eredmény nem minősül jogi véleménynek. A Zöld
            besorolás nem jelenti az üdülőhasználati jog jogi hibátlanságának garantálását.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">8. A szerződéskötés folyamata</h2>
          <h3 className="text-base font-semibold text-foreground">8.1 Adásvételi szerződések generálása</h3>
          <p className="text-foreground/80 leading-relaxed">
            Zöld besorolást követően a Szolgáltató automatikusan generálja az okiratokat. Abbázia üdülő esetén 4 okirat,
            egyéb üdülő esetén 2 okirat készül, az Eladó adataival dinamikusan kitöltve.
          </p>
          <h3 className="text-base font-semibold text-foreground">8.2 Az okiratok aláírása és visszatöltése</h3>
          <p className="text-foreground/80 leading-relaxed">
            Az Eladó az okiratokat letölti, kinyomtatja, kézzel aláírja, majd beszkenneli vagy lefotózza, és visszatölti
            a Platformra. Az összes kötelező okirat sikeres visszatöltése után az Eladó folytathatja a folyamatot.
          </p>
          <h3 className="text-base font-semibold text-foreground">8.3 Szolgáltatási szerződés – online elfogadás</h3>
          <p className="text-foreground/80 leading-relaxed">
            Az aláírt okiratok visszatöltését követően az Eladónak el kell fogadnia a Szolgáltatási szerződést két
            jelölőnégyzet kitöltésével és az „ELFOGADOM" szöveg begépelésével. A Platform rögzíti az elfogadás
            időpontját, IP-címét, böngésző-azonosítóját és SHA-256 hash-t képez.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">9. Díjak és fizetési feltételek</h2>
          <h3 className="text-base font-semibold text-foreground">9.1 A Szolgáltatási díj</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltatási díj egyszeri, az ügy lezárásakor esedékes, a Stripe fizetési platformon keresztül
            bankkártyával fizethető, és az ÁFÁ-t tartalmazza.
          </p>
          <h3 className="text-base font-semibold text-foreground">9.2 A fizetés folyamata</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó a Platformon a „Fizetés megkezdése" gombra kattint, a Platform átirányítja a Stripe fizetési
            oldalára. A kártyaadatokról a Szolgáltató semmilyen információt nem kap. Sikeres fizetéskor az ügy „Fizetve"
            állapotba kerül.
          </p>
          <h3 className="text-base font-semibold text-foreground">9.3 A díj visszafizetése</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltatási díj visszafizetésére kizárólag akkor van lehetőség, ha a Szolgáltató a szolgáltatást saját
            hibájából nem tudja megkezdeni. Ha a fizetés megtörtént és a szolgáltatás teljesítése megkezdődött,
            visszatérítésre nincs lehetőség.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">10. Elállási és felmondási jog</h2>
          <h3 className="text-base font-semibold text-foreground">10.1 Az elállási jog korlátozása</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó tudomásul veszi és kifejezetten hozzájárul, hogy a szolgáltatás nyújtása a Szolgáltatási
            szerződés megkötésével haladéktalanul megkezdődik. Amennyiben a Felhasználó kéri a szolgáltatás azonnali
            megkezdését, a 45/2014. (II. 26.) Korm. rendelet alapján az elállási jog megszűnik.
          </p>
          <h3 className="text-base font-semibold text-foreground">10.2 Digitális tartalom</h3>
          <p className="text-foreground/80 leading-relaxed">
            A generált PDF okiratok digitális tartalomnak minősülnek. Az Eladó a letöltés megkezdésével a digitális
            tartalom tekintetében lemond az elállási jogáról.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">11. A Felek jogai és kötelezettségei</h2>
          <h3 className="text-base font-semibold text-foreground">11.1 A Felhasználó kötelezettségei</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>kizárólag valós, naprakész és pontos adatokat megadni;</li>
            <li>kizárólag olyan dokumentumot feltölteni, amelynek ő a jogosultja;</li>
            <li>az üdülőhasználati jogra vonatkozó összes lényeges körülményt feltüntetni;</li>
            <li>a Platformot kizárólag jogszerű célra használni;</li>
            <li>a Szolgáltatót haladéktalanul értesíteni, ha adatai megváltoztak.</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">11.2 A Szolgáltató kötelezettségei</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>a Platformot rendeltetésszerű, biztonságos módon üzemeltetni;</li>
            <li>az Eladó személyes adatait és dokumentumait bizalmasan kezelni;</li>
            <li>az ügy aktuális állapotáról az Eladót értesíteni;</li>
            <li>panasz esetén azt 30 napon belül megvizsgálni és érdemben megválaszolni.</li>
          </ul>
          <h3 className="text-base font-semibold text-foreground">11.3 A Szolgáltató jogai</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató jogosult az Eladó fiókját felfüggeszteni vagy törölni valótlan adatok, visszaélésszerű
            használat esetén; az AI-pipeline és Policy rendszer paramétereit módosítani; a Platformot karbantartás
            céljából ideiglenesen leállítani.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">12. Felelősségkorlátozás</h2>
          <h3 className="text-base font-semibold text-foreground">12.1 A Szolgáltató felelősségének korlátai</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató nem vállal felelősséget az AI-pipeline besorolás pontosságáért, OCR-hibákból fakadó helytelen
            mezőkinyerésért, az Eladó által valótlanul megadott adatokból eredő károkért, harmadik fél rendszerének
            meghibásodásából eredő károkért, illetve vis maior esetekért.
          </p>
          <h3 className="text-base font-semibold text-foreground">12.2 Felelősség mértéke</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató felelőssége az adott üggyel kapcsolatban megfizetett Szolgáltatási díj összegére korlátozódik.
            Ez a korlátozás nem vonatkozik szándékos károkozásra vagy fogyasztói jogok megsértéséből eredő esetekre.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">13. Adatvédelem és titoktartás</h2>
          <p className="text-foreground/80 leading-relaxed">
            Az adatkezeléssel kapcsolatos részleteket a Platformon külön dokumentumban elérhető{" "}
            <a href="/privacy" className="text-secondary hover:underline">
              Adatvédelmi tájékoztató
            </a>{" "}
            tartalmazza.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">14. Panaszkezelés és jogorvoslat</h2>
          <h3 className="text-base font-semibold text-foreground">14.1 Panasz benyújtása</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó panaszát a{" "}
            <a href="mailto:kapcsolat@tsrmegoldasok.hu" className="text-secondary hover:underline">
              kapcsolat@tsrmegoldasok.hu
            </a>{" "}
            címre küldött emailben tudja benyújtani, feltüntetve nevét, elérhetőségét, az ügy azonosítóját és a panasz
            leírását.
          </p>
          <h3 className="text-base font-semibold text-foreground">14.2 Panasz megválaszolása</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Szolgáltató a panaszt annak beérkezésétől számított 30 napon belül köteles írásban megvizsgálni és
            érdemben megválaszolni.
          </p>
          <h3 className="text-base font-semibold text-foreground">14.3 Alternatív vitarendezés</h3>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            <li>Zala Vármegyei Békéltető Testület (8900 Zalaegerszeg, Petőfi u. 24., e-mail: zmbekelteto@zmkik.hu);</li>
            <li>
              Online vitarendezési platform (OVF):{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              ;
            </li>
            <li>Fogyasztóvédelmi Hatóság; Zala Vármegyei Kormányhivatal.</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">15. Szellemi tulajdon</h2>
          <p className="text-foreground/80 leading-relaxed">
            A Platform, az algoritmusok, az AI-pipeline, a vizuális megjelenítés és minden egyéb tartalom a Zaleo
            Consulting Kft. szellemi tulajdonát képezi és szerzői jogi védelem alatt áll. Tilos a Platform másolása,
            visszafejtése, módosítása, automatizált adatgyűjtés, valamint a tartalom átadása versenytársaknak.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">16. Vegyes rendelkezések</h2>
          <h3 className="text-base font-semibold text-foreground">16.1 Alkalmazandó jog</h3>
          <p className="text-foreground/80 leading-relaxed">
            Jelen ÁSZF-re a magyar jog az irányadó, különösen: 2013. évi V. törvény (Ptk.), 2001. évi CVIII. törvény,
            45/2014. (II. 26.) Korm. rendelet, 1997. évi CLV. törvény, EU 2016/679 rendelet (GDPR), 2011. évi CXII.
            törvény (Infotv.), EU 910/2014 rendelet (eIDAS).
          </p>
          <h3 className="text-base font-semibold text-foreground">16.2 Részleges érvénytelenség</h3>
          <p className="text-foreground/80 leading-relaxed">
            Ha az ÁSZF valamely rendelkezése érvénytelen, az a többi rendelkezés érvényességét nem érinti.
          </p>
          <h3 className="text-base font-semibold text-foreground">16.3 Engedményezés</h3>
          <p className="text-foreground/80 leading-relaxed">
            A Felhasználó a szolgáltatásból eredő jogait nem engedményezheti. A Szolgáltató jogosult a szerződésből
            eredő jogait átruházni, erről a Felhasználókat előzetesen értesíti.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-foreground">17. Hatályba lépés</h2>
          <p className="text-foreground/80 leading-relaxed">
            Jelen ÁSZF 2026. január 1. napján lép hatályba, és visszavonásig érvényes. A hatályos ÁSZF szövege
            folyamatosan elérhető a{" "}
            <a
              href="https://www.tsrmegoldasok.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              www.tsrmegoldasok.hu
            </a>{" "}
            weboldalon.
          </p>
          <p className="text-foreground/80 leading-relaxed font-medium">Tótszerdahely, 2026. január</p>
          <p className="text-foreground/80 leading-relaxed font-bold">Zaleo Consulting Kft.</p>
        </section>
      </div>
    </div>
  );
}
