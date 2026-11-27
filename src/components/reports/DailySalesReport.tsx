import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReceivedSale } from "@/lib/receivedSales";
import { businessDay, dailySales } from "@/lib/dailySales";
import { sumMoney } from "@/lib/money";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const time = (value: string) => new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Manaus", hour: "2-digit", minute: "2-digit" });
const paymentNames: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", credito: "Crédito", debito: "Débito", cartao: "Cartão" };

export function DailySalesReport({ sales, loading, error }: { sales: ReceivedSale[]; loading: boolean; error: boolean }) {
  const [period, setPeriod] = useState(() => businessDay(new Date())!.slice(0, 7));
  const [year, month] = period.split("-").map(Number);
  const days = dailySales(sales, year, month - 1);
  const total = sumMoney(days.map(day => day.total));
  const profit = sumMoney(days.map(day => day.profit));
  const count = days.reduce((sum, day) => sum + day.sales.length, 0);

  return <section aria-label="Vendas por dia" className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="daily-sales-month">Mês das vendas diárias</Label>
      <Input id="daily-sales-month" type="month" value={period} onChange={event => {
        if (/^\d{4}-\d{2}$/.test(event.target.value)) setPeriod(event.target.value);
      }} />
    </div>
    <p className="text-xs text-muted-foreground">Vendas pagas agrupadas pelo dia do recebimento, no horário de Manaus. O lucro considera o custo da compra e os descontos da venda.</p>
    {error ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar as vendas diárias. Atualize a página para tentar novamente.</p> : loading ?
      <p role="status" className="text-sm text-muted-foreground">Carregando vendas diárias...</p> : <>
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Recebido no período</p><p className="font-bold text-primary">{currency(total)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Lucro do período</p><p className={`font-bold ${profit < 0 ? "text-destructive" : "text-primary"}`}>{currency(profit)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vendas por dia</CardTitle>
          <p className="text-xs text-muted-foreground">{count} {count === 1 ? "venda recebida" : "vendas recebidas"} · Abra um dia para ver cada venda.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma venda recebida neste mês.</p> : days.map(day => <details key={day.date} className="group rounded-lg border border-border bg-background/50">
            <summary className="cursor-pointer list-none p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-2 mb-2"><span className="text-sm font-semibold">{day.date.split("-").reverse().join("/")}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">{day.sales.length} {day.sales.length === 1 ? "venda" : "vendas"}<ChevronDown className="h-4 w-4 group-open:rotate-180" /></span></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="block text-xs text-muted-foreground">Vendas do dia</span><span className="font-semibold">{currency(day.total)}</span></div>
                <div className="text-right"><span className="block text-xs text-muted-foreground">Lucro do dia</span><span className={`font-semibold ${day.profit < 0 ? "text-destructive" : "text-primary"}`}>{currency(day.profit)}</span></div>
              </div>
            </summary>
            <div className="border-t px-3 divide-y">
              {day.sales.map(sale => <Link key={sale.id} to={`/vendas/${sale.id}`} className="block py-3 space-y-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex justify-between gap-3 text-sm"><span>Venda #{sale.id.slice(0, 8)}</span><span className="font-medium">{currency(sale.total_amount)}</span></div>
                <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{time(sale.received_at)} · {paymentNames[sale.payment_method] ?? sale.payment_method}</span>
                  <span className={sale.total_profit < 0 ? "text-destructive" : "text-primary"}>Lucro: {currency(sale.total_profit)}</span></div>
              </Link>)}
            </div>
          </details>)}
        </CardContent>
      </Card>
    </>}
  </section>;
}
