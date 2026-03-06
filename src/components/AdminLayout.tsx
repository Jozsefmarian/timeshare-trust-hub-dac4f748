import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FolderOpen, FileText, BookOpen, Building2,
  Package, CreditCard, ClipboardList, Shield, LogOut, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const adminNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { title: "Cases", icon: FolderOpen, href: "/admin/cases" },
  { title: "Documents", icon: FileText, href: "/admin/documents" },
  { title: "Policies", icon: BookOpen, href: "/admin/policies" },
  { title: "Resorts", icon: Building2, href: "/admin/resorts" },
  { title: "Inventory", icon: Package, href: "/admin/inventory" },
  { title: "Payments", icon: CreditCard, href: "/admin/payments" },
  { title: "Audit logs", icon: ClipboardList, href: "/admin/audit" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 md:w-16"
      )}>
        <div className={cn("flex items-center gap-2 px-4 h-16 border-b border-sidebar-border", !sidebarOpen && "md:justify-center")}>
          <Shield className="h-6 w-6 text-sidebar-primary shrink-0" />
          {sidebarOpen && <span className="font-bold text-sm">Admin Portal</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
          {adminNavItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors w-full rounded-lg">
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sign out</span>}
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
            <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-sm font-bold">A</div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
