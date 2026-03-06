import { Link } from "react-router-dom";
import { Shield, FileCheck, ArrowRight, CheckCircle, Clock, Users, Building2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: FileCheck, title: "Adja meg az üdülési jog adatait", description: "Mondja el nekünk az üdülési hetéről, üdülőhelyéről és tulajdonjog típusáról." },
  { icon: Shield, title: "Dokumentumok ellenőrzése", description: "Ellenőrizzük tulajdonjogi dokumentumait, és előkészítünk mindent az átruházáshoz." },
  { icon: Users, title: "Vevő keresés és tárgyalás", description: "Összekapcsoljuk Önt ellenőrzött vevőkkel, és lebonyolítjuk a tárgyalási folyamatot." },
  { icon: CheckCircle, title: "Biztonságos átruházás és fizetés", description: "A jogi átruházás befejeződik, és az összeg biztonságosan kifizetésre kerül." },
];

const trustItems = [
  { value: "2 500+", label: "Befejezett átruházás" },
  { value: "98%", label: "Ügyfél-elégedettség" },
  { value: "Engedélyes", label: "Jogi szakemberek" },
  { value: "Biztosított", label: "Letéti fizetések" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigáció */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-primary">TimeshareXfer</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#hogyan-mukodik" className="hover:text-foreground transition-colors">Hogyan működik</a>
            <a href="#miert-mi" className="hover:text-foreground transition-colors">Miért mi</a>
            <Link to="/auth">
              <Button variant="outline" size="sm">Bejelentkezés</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Kezdés</Button>
            </Link>
          </div>
          <Link to="/auth" className="md:hidden">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Kezdés</Button>
          </Link>
        </div>
      </nav>

      {/* Főszekció */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsla(174,84%,40%,0.15),_transparent_60%)]" />
        <div className="container mx-auto px-4 py-24 md:py-36 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-foreground/20 text-primary-foreground/80 text-sm mb-8">
              <Shield className="h-4 w-4" />
              Több ezer üdülési jog tulajdonos bízik bennünk
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Adja el üdülési hetét egyszerűen és biztonságosan
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
              Jogi-technológiai platformunk kezeli a dokumentumok érvényesítését, a vevők keresését és a biztonságos átruházást — hogy Önnek ne kelljen.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base px-8 py-6 rounded-xl shadow-lg">
                Üdülési jog eladásának indítása
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bizalmi mutatók */}
      <section id="miert-mi" className="border-b border-border">
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
      <section id="hogyan-mukodik" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Hogyan működik</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Négy egyszerű lépés az üdülési jog biztonságos és legális átruházásához.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.title} className="relative glass rounded-2xl p-6 text-center group hover:shadow-lg transition-shadow">
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
                <Shield className="h-6 w-6 text-secondary" />
                <span className="text-lg font-bold text-primary-foreground">TimeshareXfer</span>
              </div>
              <p className="text-sm">Biztonságos üdülési jog átruházás jogi technológiával.</p>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Jogi információk</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Adatvédelmi irányelvek</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Felhasználási feltételek</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Visszatérítési szabályzat</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Vállalat</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Rólunk</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Karrier</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-foreground mb-3 text-sm">Kapcsolat</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@timesharexfer.com</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> 1-800-555-0199</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 mt-8 pt-8 text-center text-sm">
            © {new Date().getFullYear()} TimeshareXfer. Minden jog fenntartva.
          </div>
        </div>
      </footer>
    </div>
  );
}