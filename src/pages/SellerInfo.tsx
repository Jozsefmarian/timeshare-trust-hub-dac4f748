import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SellerInfo() {
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

        <h1 className="text-3xl font-bold text-foreground mb-8">TÁJÉKOZTATÓ</h1>

        <div className="space-y-6 text-foreground/80 leading-relaxed text-justify">
          <p>
            Ezt a platformot azért hoztuk létre, hogy az általunk megvásárolni kívánt üdülési jogok átruházásának adminisztrációját a lehető legegyszerűbbé tegyük, így Ön a hosszas utánajárás, telefonálgatás és utazás helyett kényelmesen intézheti az adásvételt.
          </p>

          <p>
            A teljes átruházási folyamat mindössze néhány egyszerű lépésből áll, melynek során hivatalos adásvételi szerződés megkötésével vásároljuk meg az Ön üdülési jogát.
          </p>

          <p>
            Az adásvétel során elkészített dokumentumok minden esetben - típustól függően - az oldalról letölthetőek, vagy kiküldésre kerülnek az Ön által megadott email címre. A szerződéses dokumentumok aláírása / elfogadása előtt lehetősége lesz azokat kényelmesen átolvasni.
          </p>

          <p>
            Az platformon keresztül történő adásvételi folyamat gördülékeny lebonyolításához az alábbiakra lesz szüksége:
          </p>

          <ol className="list-decimal pl-6 space-y-3">
            <li>
              az eladni kívánt üdülési jogához kapcsolódó dokumentumok:
              <ul className="list-disc pl-6 space-y-1 mt-1">
                <li>üdülőhasználati szerződés</li>
                <li>bérleti szerződés (konstrukciótól függően, ha van)</li>
                <li>tájékoztató és információs füzet/klubrend</li>
                <li>részvény adásvételi szerződés (konstrukciótól függően, ha van)</li>
                <li>a tárgyévre vonatkozó fenntartási díj, egyéb kötelezően fizetendő díj (ha van) befizetését igazoló bizonylat</li>
              </ul>
            </li>
            <li>egy hétköznapi nyomtató, amelyen ki tudja nyomtatni az üdülési jog adásvételéhez szükséges dokumentumokat.</li>
            <li>egy hétköznapi dokumentumolvasó (szkenner), vagy kamerás mobiltelefon.</li>
          </ol>

          <p>
            A bal oldali menüsorban található Használati útmutató részletes információkat tartalmaz az egyes lépéseknél szükséges teendőkkel kapcsolatban. Ha bármelyik lépésnél további segítségre van szüksége, kérjük hívja ügyfélszolgálatunkat.
          </p>

          <p>
            Az üdülési jogokat Társaságunk saját jövőbeni üzleti céljainak elérése érdekében kívánja hasznosítani. Ebből következően nem áll módunkban minden felkínált üdülési jogot automatikusan megvásárolni, így az adásvételi folyamat tényleges elindítása előtt az Ön által megadott részletes információk alapján rendszerünk egy gyors elemzést végez, melynek eredményéről azonnali visszajelzést adunk. Ezt követően azonnal folytathatja az adásvételi folyamatot.
          </p>

          <p>
            Tekintettel arra, hogy az üdülési jog a jövőbeni használati években is rendszeres díjakkal terhelt, így az általunk megvásárolt üdülési jogok vételárát jelképes 1,- Ft-ban határoztuk meg. Amennyiben az Ön üdülési jogához részvénycsomag is tartozik, annak vételára minden esetben szintén jelképes 1,- Ft.
          </p>

          <p>
            Az üdülési jog átruházásával kapcsolatos összes adminisztrációs és koordinációs feladatot Társaságunk külön Szolgáltatási szerződés alapján végzi. Ideértve az Ön üdülési jogával kapcsolatos dokumentumok előzetes áttekintését, a jogosultság ellenőrzését, a vonatkozó jogszabályokban foglalt formai és tartalmi követelményeknek megfelelő szerződéstervezetek, nyilatkozatok és szükséges kiegészítő okiratok előkészítését. Továbbá az érintett üdülő üzemeltetője felé szükséges bejelentéshez, adminisztratív átvezetéshez kapcsolódó dokumentumok előkészítését, kapcsolódó részvénycsomag esetén a transzfer-folyamat szervezését, illetve az adásvétel lebonyolításához szükséges online felület és informatikai rendszer működtetését. A teljes szolgáltatási csomag egyszeri díja üdülési hetenként 50.000 Ft. A Szolgáltatási szerződés megkötésére és a szolgáltatási díj kiegyenlítésére csak az adásvételi folyamat legvégén kerül sor.
          </p>

          <p>
            Felhívjuk szíves figyelmét, hogy mivel ez a platform egy teljesen új, kifejezetten erre a célra kifejlesztett egyedi rendszer, így a használat során esetlegesen előfordulhatnak az oldalon az átruházási folyamatot érdemben nem befolyásoló apróbb hibák. Amennyiben ilyet tapasztal, kérjük szíveskedjen jelezni azt ügyfélszolgálatunk felé.
          </p>
        </div>
      </div>
    </div>
  );
}
