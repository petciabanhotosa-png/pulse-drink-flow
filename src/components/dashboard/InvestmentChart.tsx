import { Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductInvestment } from "@/hooks/useInvestment";

interface InvestmentChartProps {
  totalInvested: number;
  byProduct: ProductInvestment[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function InvestmentChart({ totalInvested, byProduct }: InvestmentChartProps) {
  const chartData = byProduct.slice(0, 8).map((p) => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + "…" : p.product_name,
    fullName: p.product_name,
    value: Number(p.total_invested.toFixed(2)),
    quantity: p.total_quantity,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Valor Investido em Estoque
          </CardTitle>
        </div>
        <p className="text-2xl font-display font-bold text-primary text-glow">
          {formatCurrency(totalInvested)}
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum estoque ativo no momento
          </p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(220, 10%, 60%)" }}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(220, 10%, 60%)" }}
                  tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 20%, 10%)",
                    border: "1px solid hsl(220, 15%, 20%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(0, 0%, 95%)" }}
                  formatter={(value: number, _name, props) => [
                    `${formatCurrency(value)} (${props.payload.quantity} un)`,
                    props.payload.fullName,
                  ]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="hsl(150, 100%, 50%)" fillOpacity={0.85 - i * 0.05} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
