import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsla(174,84%,40%,0.2),_transparent_60%)]" />
        <div className="relative z-10 max-w-md">
          <Shield className="h-12 w-12 text-secondary mb-8" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Üdvözöljük újra</h2>
          <p className="text-primary-foreground/70 text-lg">
            Kezelje üdülési jog átruházási ügyeit, kövesse nyomon dokumentumait és fizetéseit biztonságosan.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <Shield className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-primary">TimeshareRelease</span>
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-2">Bejelentkezés a fiókjába</h1>
          <p className="text-muted-foreground mb-8">Adja meg hitelesítő adatait a platform eléréséhez</p>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="pelda@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Jelszó</Label>
                <a href="#" className="text-sm text-secondary hover:underline">
                  Elfelejtett jelszó?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-5">
              Bejelentkezés
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">vagy</span>
            <Separator className="flex-1" />
          </div>

          {/* Magic link */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">Bejelentkezés mágikus linkkel</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Biztonságos linket küldünk az e-mail címére — jelszó nélkül.
            </p>
            <div className="flex gap-2">
              <Input type="email" placeholder="pelda@email.com" className="flex-1" />
              <Button variant="outline" size="sm">
                Link küldése
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-8">
            Még nincs fiókja?{" "}
            <a href="#" className="text-secondary font-medium hover:underline">
              Vegye fel velünk a kapcsolatot
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
