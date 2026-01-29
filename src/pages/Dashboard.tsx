import { DollarSign, TrendingUp, Wallet, ShoppingCart } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { useTodaySales, useMonthSales } from "@/hooks/useSales";
import { useLowStockProducts } from "@/hooks/useProducts";
import { useCashBalance } from "@/hooks/useCashFlow";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Dashboard() {
  const { data: todaySales = [] } = useTodaySales();
  const { data: monthSales = [] } = useMonthSales();
  const { data: lowStockProducts = [] } = useLowStockProducts();
  const { data: cashBalance = 0 } = useCashBalance();

  const todayTotal = todaySales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const monthTotal = monthSales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const totalProfit = monthSales.reduce((acc, sale) => acc + sale.total_profit, 0);

  // Gerar dados do gráfico (últimos 7 dias)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    
    const dayTotal = monthSales
      .filter((s) => s.created_at.startsWith(dateStr))
      .reduce((acc, s) => acc + s.total_amount, 0);

    return {
      date: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      value: dayTotal,
    };
  });

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />
      
      <div className="p-4 space-y-4 animate-fade-in">
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

        {/* Alerta de estoque baixo */}
        <LowStockAlert products={lowStockProducts} />

        {/* Gráfico de vendas */}
        <SalesChart data={chartData} />
      </div>
    </AppLayout>
  );
}
