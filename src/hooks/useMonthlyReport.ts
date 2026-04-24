import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyProductSale {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

export interface MonthlyReportData {
  monthLabel: string;
  totalSold: number;
  totalProfit: number;
  totalSales: number;
  totalExpenses: number;
  totalInvestment: number;
  productSales: MonthlyProductSale[];
}

/**
 * Get a complete monthly report for a given year/month.
 * month is 0-indexed (0 = January).
 */
export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ["monthly_report", year, month],
    queryFn: async (): Promise<MonthlyReportData> => {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 1, 0, 0, 0, 0);

      const monthLabel = start.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      // 1. Sales in the month (only paid count for revenue/profit accuracy)
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, total_amount, total_profit, status")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      if (salesError) throw salesError;

      const paidSales = (salesData || []).filter((s) => s.status === "pago");
      const totalSold = paidSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
      const totalProfit = paidSales.reduce((acc, s) => acc + Number(s.total_profit), 0);
      const totalSales = paidSales.length;

      const saleIds = paidSales.map((s) => s.id);

      // 2. Items per product
      let productSales: MonthlyProductSale[] = [];
      if (saleIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select("product_id, quantity, subtotal, profit, products:product_id (name)")
          .in("sale_id", saleIds);
        if (itemsError) throw itemsError;

        const map = new Map<string, MonthlyProductSale>();
        for (const item of itemsData || []) {
          const pid = item.product_id;
          const name = (item.products as { name: string } | null)?.name || "Produto removido";
          const cur = map.get(pid);
          if (cur) {
            cur.total_quantity += item.quantity;
            cur.total_revenue += Number(item.subtotal);
            cur.total_profit += Number(item.profit);
          } else {
            map.set(pid, {
              product_id: pid,
              product_name: name,
              total_quantity: item.quantity,
              total_revenue: Number(item.subtotal),
              total_profit: Number(item.profit),
            });
          }
        }
        productSales = Array.from(map.values()).sort(
          (a, b) => b.total_quantity - a.total_quantity
        );
      }

      // 3. Expenses (cash_flow saidas) in the month
      const { data: cashOut, error: cashError } = await supabase
        .from("cash_flow")
        .select("amount, category")
        .eq("type", "saida")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      if (cashError) throw cashError;

      const totalExpenses = (cashOut || []).reduce((acc, c) => acc + Number(c.amount), 0);

      // 4. Investment (purchases) in the month
      const { data: purchases, error: purchaseError } = await supabase
        .from("purchases")
        .select("total_amount")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      if (purchaseError) throw purchaseError;

      const totalInvestment = (purchases || []).reduce(
        (acc, p) => acc + Number(p.total_amount),
        0
      );

      return {
        monthLabel,
        totalSold,
        totalProfit,
        totalSales,
        totalExpenses,
        totalInvestment,
        productSales,
      };
    },
  });
}
