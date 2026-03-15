import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  FileText,
  FileSignature,
  CreditCard,
  User,
  Shield,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, getSessionAndProfile, type AppProfile } from "@/lib/auth";
import tsrLogo from "@/assets/tsr-logo.png";

const sellerNavItems = [
  { title: "Vezérlőpult", icon: LayoutDashboard, href: "/seller" },
  { title: "Ügyeim", icon: FolderOpen, href: "/seller/cases" },
  { title: "Új ügy indítása", icon: PlusCircle, href: "/seller/new-case" },
  { title: "Profil", icon: User, href: "/seller/profile" },
];

export default function SellerLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { profile } = await getSessionAndProfile();
        setProfile(profile);
      } catch (error) {
        console.error("SellerLayout profile load error:", error);
      }
    };

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Seller sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 md:w-16",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-4 h-16 border-b border-sidebar-border",
            !sidebarOpen && "md:justify-center",
          )}
        >
          {sidebarOpen ? (
            <img src={tsrLogo} alt="TSR Megoldások" className="h-6" />
          ) : (
            <img src={tsrLogo} alt="TSR" className="h-6 w-6 object-contain" />
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
          {sellerNavItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full rounded-lg"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{isSigningOut ? "Kijelentkezés..." : "Kijelentkezés"}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "ml-0 md:ml-16")}>
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-6 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-sm font-bold">
              {getInitials(profile)}
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
