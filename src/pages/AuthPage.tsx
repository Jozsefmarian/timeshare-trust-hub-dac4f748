import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import tsrLogo from "@/assets/tsr-logo-white.png";
import tsrLogoDark from "@/assets/tsr-logo-dark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRouteForRole, getSessionAndProfile } from "@/lib/auth";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
        if (mounted) setIsCheckingSession(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Hiányzó adatok", description: "Add meg az e-mail címet és a jelszót.", variant: "destructive" });
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { profile } = await getSessionAndProfile();
      toast({ title: "Sikeres bejelentkezés", description: "Átirányítás folyamatban..." });
      navigate(getDefaultRouteForRole(profile?.role), { replace: true });
    } catch (error: any) {
      toast({ title: "Sikertelen bejelentkezés", description: error?.message || "Ismeretlen hiba történt.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !privacyAccepted) {
      toast({ title: "Hiányzó adatok", description: "Kérjük, töltse ki az összes mezőt és fogadja el az adatkezelési tájékoztatót.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Túl rövid jelszó", description: "A jelszónak legalább 8 karakter hosszúnak kell lennie.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "A jelszavak nem egyeznek", description: "Kérjük, adja meg újra a jelszót.", variant: "destructive" });
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) throw error;

      // Log privacy policy acceptance (silent fail)
      if (data.user?.id) {
        try {
          await supabase.from("privacy_policy_acceptances").insert({
            user_id: data.user.id,
            policy_version: "2026-03-28",
            user_agent: navigator.userAgent,
            accepted_at: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Privacy policy acceptance insert failed:", e);
        }
      }

      toast({ title: "Regisztráció sikeres!", description: "Kérjük, erősítse meg e-mail címét a küldött levélben." });
      setIsRegister(false);
      setName("");
      setPassword("");
      setConfirmPassword("");
      setPrivacyAccepted(false);
    } catch (error: any) {
      toast({ title: "Sikertelen regisztráció", description: error?.message || "Ismeretlen hiba történt.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {isRegister ? "Csatlakozzon hozzánk" : "Üdvözöljük újra"}
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            Kezelje üdülési jog átruházási ügyeit, kövesse nyomon dokumentumait és fizetéseit biztonságosan.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <img src={tsrLogoDark} alt="TSR Megoldások" className="h-8" />
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isRegister ? "Új fiók létrehozása" : "Bejelentkezés a fiókjába"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isRegister
              ? "Töltse ki az alábbi mezőket a regisztrációhoz"
              : "Adja meg hitelesítő adatait a platform eléréséhez"}
          </p>

          {isRegister ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Teljes név</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Teljes név"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">E-mail cím</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="pelda@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Jelszó</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Legalább 8 karakter"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Jelszó megerősítése</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Jelszó újra"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                  disabled={isLoading}
                />
                <label htmlFor="privacy" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  Kijelentem, hogy az{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-secondary font-medium hover:underline">
                    adatkezelési tájékoztatót
                  </a>{" "}
                  elolvastam és az abban leírtakat elfogadom.
                </label>
              </div>

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-5" disabled={isLoading || !privacyAccepted}>
                {isLoading ? "Regisztráció..." : "Regisztráció"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
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
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Jelszó</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-5" disabled={isLoading}>
                {isLoading ? "Bejelentkezés..." : "Bejelentkezés"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          <p className="text-sm text-muted-foreground text-center mt-8">
            {isRegister ? (
              <>
                Már van fiókja?{" "}
                <button onClick={() => setIsRegister(false)} className="text-secondary font-medium hover:underline">
                  Bejelentkezés
                </button>
              </>
            ) : (
              <>
                Még nincs fiókja?{" "}
                <button onClick={() => setIsRegister(true)} className="text-secondary font-medium hover:underline">
                  Regisztráljon most
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
