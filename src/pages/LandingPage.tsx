import { Link } from "react-router-dom";
import {
  Shield,
  FileCheck,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  Building2,
  Mail,
  Phone,
  FileSignature,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import tsrLogoDark from "@/assets/tsr-logo-dark.png";
import tsrLogo from "@/assets/tsr-logo-white.png";

const steps = [
  {
    icon: FileCheck,
    title: "Üdülési jog regisztrálása",
    description: "Adja meg üdülőhelyének, üdülési hetének, és az átruházáshoz szükséges egyéb adatait.",
  },
  {
    icon: Shield,
    title: "Dokumentumok ellenőrzése",
    description: "Ellenőrizzük a jogosultságra vonatkozó dokumentumait és előkészítjük az átruházást.",
  },
  {
    icon: FileSignature,
    title: "Adásvételi szerződés",
    description:
      "Az Ön által megadott adatok alapján a rendszerünk elkészíti az adásvételhez szükséges dokumentumokat.",
  },
  {
    icon: CreditCard,
    title: "Átruházással kapcsolatos ügyintézés",
    description:
      "Szolgáltatási szerződésünk keretében elvégezzük az átruházás teljes adminisztrációját, az ezzel kapcsolatos ügyintézést, hogy Önnek ne kelljen.",
  },
];

const trustItems = [
  { value: "20+ év", label: "Idegenforgalmi tapasztalat" },
  { value: "100%", label: "Egyedi konstrukció" },
  { value: "Professzionális", label: "Jogi és szakmai háttér" },
  { value: "​Gyors", label: "Ügyintézés" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigáció */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={tsrLogoDark} alt="TSR Megoldások" className="h-10" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              Hogyan működik
            </a>
            <a href="#trust" className="hover:text-foreground transition-colors">
              Miért minket
            </a>
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Bejelentkezés
              </Button>
            </Link>
            <Link to="/auth?mode=register">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Regisztráció
              </Button>
            </Link>
          </div>
          <Link to="/auth?mode=register" className="md:hidden">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Regisztráció
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsla(174,84%,40%,0.15),_transparent_60%)]" />
        <div className="container mx-auto px-4 py-24 md:py-36 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-foreground/20 text-primary-foreground/80 text-sm mb-8">
              <Shield className="h-4 w-4" />
              Valós megoldás üdülési jog tulajdonosoknak
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Eladná üdülési hetét? Mi megvásároljuk.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
              Jogi-technológiai platformunk kezeli a dokumentumok ellenőrzését, a szerződéskészítést és a biztonságos
              átruházást — Önnek nincs más dolga.
            </p>
            <Link to="/auth?mode=register">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base px-8 py-6 rounded-xl shadow-lg"
              >
                Üdülési jog eladásának indítása
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bizalmi mutatók */}
      <section id="trust" className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustItems.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{item.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hogyan működik */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Hogyan működik?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Négy egyszerű lépésben ruházhatja át üdülési jogát biztonságosan és jogilag szabályosan.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative glass rounded-2xl p-6 text-center group hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 text-secondary mb-4">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lábléc */}
      <footer className="bg-primary text-primary-foreground/70">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={tsrLogo} alt="TSR Megoldások" className="h-10" />
              </div>
              <p className="text-sm">Biztonságos digitális platform üdülési jogok eladásához.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Jogi</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    Adatvédelmi szabályzat
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    Általános szerződési feltételek
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    Visszatérítési szabályzat
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Cég</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    Rólunk
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    Impresszum
                  </a>
                </li>
                <li>
                  <a href="" className="hover:text-primary-foreground transition-colors">
                    ​
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Kapcsolat</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> kapcsolat@tsrmegoldasok.hu
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> +36 1 234 5678
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 mt-8 pt-8 text-center text-sm flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>© {new Date().getFullYear()} TSR Megoldások. Minden jog fenntartva.</span>
            <button
              onClick={() => {
                localStorage.removeItem("tsr_cookie_consent");
                window.location.reload();
              }}
              className="text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors text-xs underline"
            >
              🍪 Süti-beállítások
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
