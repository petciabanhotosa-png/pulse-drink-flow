import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { to: "/estoque", icon: Package, label: "Estoque" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || 
            (to !== "/" && location.pathname.startsWith(to));
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                )} 
              />
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive && "text-glow"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
