import { cents } from "@/lib/money";
import type { ReceivedSale } from "@/lib/receivedSales";

const businessDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" });
export function businessDay(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = businessDate.formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface DailySales {
  date: string;
  sales: ReceivedSale[];
  total: number;
  profit: number;
}

// Payment evidence is resolved by receivedSales before grouping. Never use the
// order creation date or today's product cost to recompute historical profit.
export function dailySales(sales: ReceivedSale[], year: number, month: number): DailySales[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const days = new Map<string, { sales: ReceivedSale[]; total: number; profit: number }>();
  for (const sale of sales) {
    const date = businessDay(sale.received_at);
    if (sale.status !== "pago" || !date?.startsWith(prefix)) continue;
    const day = days.get(date) ?? { sales: [], total: 0, profit: 0 };
    day.sales.push(sale);
    day.total += cents(sale.total_amount);
    day.profit += cents(sale.total_profit);
    days.set(date, day);
  }
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, day]) => ({
    date, sales: day.sales.sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || a.id.localeCompare(b.id)),
    total: day.total / 100, profit: day.profit / 100,
  }));
}
