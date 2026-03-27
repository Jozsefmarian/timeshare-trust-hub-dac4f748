import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import tsrLogo from "@/assets/tsr-logo-white.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRouteForRole, getSessionAndProfile } from "@/lib/auth";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { session, profile } = await getSessionAndProfile();

        if (!mounted) return;

        if (session && profile?.role) {
          navigate(getDefaultRouteForRole(profile.role), { replace: true });
          return;
        }
      } catch (error) {
        console.error("AuthPage session check error:", error);
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "SIGNED_IN") return;

      try {
        const { profile } = await getSessionAndProfile();
        navigate(getDefaultRouteForRole(profile?.role), { replace: true });
      } catch (error) {
        console.error("Auth state change error:", error);
        navigate("/auth", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({
        title: "Hiányzó adatok",
        description: "Add meg az e-mail címet és a jelszót.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPasswordLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const { profile } = await getSessionAndProfile();

      toast({
        title: "Sikeres bejelentkezés",
        description: "Átirányítás folyamatban...",
      });

      navigate(getDefaultRouteForRole(profile?.role), { replace: true });
    } catch (error: any) {
      toast({
        title: "Sikertelen bejelentkezés",
        description: error?.message || "Ismeretlen hiba történt.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!magicEmail.trim()) {
      toast({
        title: "Hiányzó e-mail cím",
        description: "Add meg az e-mail címedet a mágikus linkhez.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsMagicLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      toast({
        title: "Mágikus link elküldve",
        description: "Nézd meg az e-mail fiókodat, és kattints a bejelentkező linkre.",
      });
    } catch (error: any) {
      toast({
        title: "A link küldése sikertelen",
        description: error?.message || "Ismeretlen hiba történt.",
        variant: "destructive",
      });
    } finally {
      setIsMagicLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsla(174,84%,40%,0.2),_transparent_60%)]" />
        <div className="relative z-10 max-w-md">
          <img src={tsrLogo} alt="TSR Megoldások" className="h-12 mb-8" />
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
            <img src={tsrLogo} alt="TSR Megoldások" className="h-8" />
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-2">Bejelentkezés a fiókjába</h1>
          <p className="text-muted-foreground mb-8">Adja meg hitelesítő adatait a platform eléréséhez</p>

          <form onSubmit={handlePasswordLogin} className="space-y-5">
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
                  disabled={isPasswordLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Jelszó</Label>
                <a href="#" className="text-sm text-secondary hover:underline">
                  Supabase Auth
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
                  disabled={isPasswordLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-5" disabled={isPasswordLoading}>
              {isPasswordLoading ? "Bejelentkezés..." : "Bejelentkezés"}
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
              <Input
                type="email"
                placeholder="pelda@email.com"
                className="flex-1"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                disabled={isMagicLoading}
              />
              <Button variant="outline" size="sm" onClick={handleMagicLink} disabled={isMagicLoading}>
                {isMagicLoading ? "Küldés..." : "Link küldése"}
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
