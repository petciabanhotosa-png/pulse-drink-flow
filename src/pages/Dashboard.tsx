import { useState } from "react";
import { DollarSign, TrendingUp, Wallet, ShoppingCart, Download, AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { InvestmentChart } from "@/components/dashboard/InvestmentChart";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { Button } from "@/components/ui/button";
import { useTodaySales, useMonthSales, useSales } from "@/hooks/useSales";
import { useCashBalance } from "@/hooks/useCashFlow";
import { useCurrentInvestment } from "@/hooks/useInvestment";
import { useProducts } from "@/hooks/useProducts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState("week");
  const { data: todaySales = [] } = useTodaySales();
  const { data: monthSales = [] } = useMonthSales();
  const { data: allSales = [] } = useSales();
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: investment } = useCurrentInvestment();
  const { data: products = [] } = useProducts();

  const zeroStockCount = products.filter((p) => p.stock_quantity <= 0).length;
  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock).length;
  const stockAlertCount = zeroStockCount + lowStockCount;

  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const todayTotal = todaySales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const monthTotal = monthSales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const totalProfit = monthSales.reduce((acc, sale) => acc + sale.total_profit, 0);

  // Gerar dados do gráfico baseado no período selecionado
  const getChartData = () => {
    let days = 7;
    let dateFormat: Intl.DateTimeFormatOptions = { weekday: "short" };
    let salesData = monthSales;

    if (chartPeriod === "day") {
      // Últimas 24 horas por hora
      const hours = Array.from({ length: 24 }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - (23 - i), 0, 0, 0);
        const hourStr = date.toISOString().slice(0, 13);
        
        const hourTotal = todaySales
          .filter((s) => s.created_at.slice(0, 13) === hourStr)
          .reduce((acc, s) => acc + s.total_amount, 0);

        return {
          date: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          value: hourTotal,
        };
      });
      return hours;
    }

    if (chartPeriod === "month") {
      days = 30;
      dateFormat = { day: "numeric" };
      salesData = allSales;
    }

    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split("T")[0];
      
      const dayTotal = salesData
        .filter((s) => s.created_at.startsWith(dateStr))
        .reduce((acc, s) => acc + s.total_amount, 0);

      return {
        date: date.toLocaleDateString("pt-BR", dateFormat),
        value: dayTotal,
      };
    });
  };

  const chartData = getChartData();

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />
      
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Banner */}
        <DashboardBanner />

        {/* Install Banner */}
        {!isStandalone && (
          <Button 
            variant="outline" 
            className="w-full border-primary/30 bg-primary/5 hover:bg-primary/10"
            onClick={() => navigate("/instalar")}
          >
            <Download className="w-4 h-4 mr-2 text-primary" />
            <span>Instalar App no Celular</span>
          </Button>
        )}

        {/* Alerta de estoque */}
        {stockAlertCount > 0 && (
          <button
            type="button"
            onClick={() => navigate("/estoque")}
            className="w-full flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-left text-sm hover:bg-warning/15 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="flex-1 text-warning-foreground/90">
              {zeroStockCount > 0 && (
                <span className="font-medium text-destructive">
                  {zeroStockCount} sem estoque
                </span>
              )}
              {zeroStockCount > 0 && lowStockCount > 0 && <span> · </span>}
              {lowStockCount > 0 && (
                <span className="text-warning">{lowStockCount} abaixo do mínimo</span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Vendas Hoje"
            value={formatCurrency(todayTotal)}
            icon={<ShoppingCart className="w-5 h-5" />}
            variant="primary"
          />
          <KPICard
            title="Vendas Mês"
            value={formatCurrency(monthTotal)}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPICard
            title="Lucro Total"
            value={formatCurrency(totalProfit)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="primary"
          />
          <KPICard
            title="Saldo Caixa"
            value={formatCurrency(cashBalance)}
            icon={<Wallet className="w-5 h-5" />}
            variant={cashBalance < 0 ? "destructive" : "default"}
          />
        </div>

        {/* Gráfico de vendas */}
        <SalesChart data={chartData} period={chartPeriod} onPeriodChange={setChartPeriod} />

        {/* Gráfico de valor investido */}
        <InvestmentChart
          totalInvested={investment?.totalInvested ?? 0}
          byProduct={investment?.byProduct ?? []}
        />
      </div>
    </AppLayout>
  );
}
