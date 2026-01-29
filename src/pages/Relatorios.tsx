import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useSales, useMonthSales } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useCashFlow } from "@/hooks/useCashFlow";
import { useBills } from "@/hooks/useBills";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, DollarSign, Package, Receipt, Trophy } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const COLORS = ["hsl(150, 100%, 50%)", "hsl(200, 100%, 50%)", "hsl(280, 100%, 50%)", "hsl(45, 100%, 50%)"];

export default function Relatorios() {
  const { data: allSales = [] } = useSales();
  const { data: monthSales = [] } = useMonthSales();
  const { data: products = [] } = useProducts();
  const { data: cashFlow = [] } = useCashFlow();
  const { data: bills = [] } = useBills();

  // Cálculos de vendas
  const totalSold = monthSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalProfit = monthSales.reduce((acc, s) => acc + s.total_profit, 0);
  const avgTicket = monthSales.length > 0 ? totalSold / monthSales.length : 0;

  // Vendas por forma de pagamento
  const salesByPayment = monthSales.reduce((acc, sale) => {
    const key = sale.payment_method;
    acc[key] = (acc[key] || 0) + sale.total_amount;
    return acc;
  }, {} as Record<string, number>);

  const paymentChartData = Object.entries(salesByPayment).map(([name, value]) => ({
    name: name === "dinheiro" ? "Dinheiro" : name === "pix" ? "PIX" : "Cartão",
    value,
  }));

  // Margem de lucro
  const profitMargin = totalSold > 0 ? (totalProfit / totalSold) * 100 : 0;

  // Produtos com estoque crítico
  const criticalStock = products.filter((p) => p.stock_quantity <= p.min_stock);

  // Financeiro
  const entries = cashFlow.filter((c) => c.type === "entrada");
  const exits = cashFlow.filter((c) => c.type === "saida");
  const totalEntries = entries.reduce((acc, c) => acc + c.amount, 0);
  const totalExits = exits.reduce((acc, c) => acc + c.amount, 0);

  const paidBills = bills.filter((b) => b.is_paid);
  const pendingBills = bills.filter((b) => !b.is_paid);
  const totalPaidBills = paidBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPendingBills = pendingBills.reduce((acc, b) => acc + b.amount, 0);

  // Top produtos por lucro (mock - normalmente viria do banco)
  const productsByProfit = products
    .map((p) => ({
      name: p.name.slice(0, 15),
      profit: p.sale_price - p.cost_price,
      margin: ((p.sale_price - p.cost_price) / p.sale_price) * 100,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  return (
    <AppLayout>
      <PageHeader title="Relatórios" subtitle="Análise do seu negócio" />

      <div className="p-4 pb-24">
        <Tabs defaultValue="vendas" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="vendas" className="text-xs py-2 px-1">
              <DollarSign className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="lucro" className="text-xs py-2 px-1">
              <TrendingUp className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="estoque" className="text-xs py-2 px-1">
              <Package className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs py-2 px-1">
              <Receipt className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs py-2 px-1">
              <Trophy className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* RELATÓRIO DE VENDAS */}
          <TabsContent value="vendas" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Vendido</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalSold)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Qtd. Vendas</p>
                  <p className="text-lg font-bold">{monthSales.length}</p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(avgTicket)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentChartData.length > 0 ? (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {paymentChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Sem dados no período
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO DE LUCRO */}
          <TabsContent value="lucro" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lucro Total</p>
                  <p className="text-lg font-bold text-primary text-glow">
                    {formatCurrency(totalProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Margem</p>
                  <p className="text-lg font-bold">{profitMargin.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lucro por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {productsByProfit.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productsByProfit} layout="vertical" margin={{ left: 0 }}>
                        <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="profit" fill="hsl(150, 100%, 50%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Cadastre produtos para ver o relatório
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO DE ESTOQUE */}
          <TabsContent value="estoque" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Produtos</p>
                  <p className="text-lg font-bold">{products.length}</p>
                </CardContent>
              </Card>
              <Card className={criticalStock.length > 0 ? "border-destructive/50" : ""}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Estoque Crítico</p>
                  <p className={`text-lg font-bold ${criticalStock.length > 0 ? "text-destructive" : ""}`}>
                    {criticalStock.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {criticalStock.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Produtos Críticos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalStock.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <span className="text-sm truncate">{product.name}</span>
                      <Badge variant={product.stock_quantity === 0 ? "destructive" : "outline"}>
                        {product.stock_quantity} un
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estoque por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(
                  products.reduce((acc, p) => {
                    acc[p.category] = (acc[p.category] || 0) + p.stock_quantity;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([category, qty]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm">{category}</span>
                    <Badge variant="secondary">{qty} un</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(totalEntries)}</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saídas</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(totalExits)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${totalEntries - totalExits >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(totalEntries - totalExits)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contas Pagas</span>
                  <span className="text-sm font-medium text-success">{formatCurrency(totalPaidBills)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contas Pendentes</span>
                  <span className="text-sm font-medium text-warning">{formatCurrency(totalPendingBills)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RANKINGS */}
          <TabsContent value="ranking" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Produtos Mais Lucrativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {productsByProfit.length > 0 ? (
                  productsByProfit.map((product, index) => (
                    <div key={product.name} className="flex items-center gap-3">
                      <Badge 
                        variant={index === 0 ? "default" : "secondary"}
                        className={index === 0 ? "glow-neon" : ""}
                      >
                        #{index + 1}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Margem: {product.margin.toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(product.profit)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Cadastre produtos para ver o ranking
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Categorias Mais Rentáveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(
                  products.reduce((acc, p) => {
                    const profit = p.sale_price - p.cost_price;
                    acc[p.category] = (acc[p.category] || 0) + profit;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, profit], index) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="text-sm">{category}</span>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
