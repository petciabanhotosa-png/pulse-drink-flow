import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashFlow, useCashBalance, useAddCashEntry } from "@/hooks/useCashFlow";
import { useBills, useMarkBillAsPaid, usePendingBills } from "@/hooks/useBills";
import { format, isBefore, startOfToday } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, Check, Plus, DollarSign, Package, Clock } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Financeiro() {
  const navigate = useNavigate();
  const { data: cashFlow = [] } = useCashFlow();
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: bills = [] } = useBills();
  const { data: pendingBills = [] } = usePendingBills();
  const { data: sales = [] } = useSales();
  const pendingSalesTotal = sales
    .filter((s) => s.status === "pendente")
    .reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalProjected = cashBalance + pendingSalesTotal;
  const markAsPaid = useMarkBillAsPaid();
  const addCashEntry = useAddCashEntry();

  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashDescription, setCashDescription] = useState("");

  const today = startOfToday();
  const overdueBills = pendingBills.filter((b) => isBefore(new Date(b.due_date), today));

  const entries = cashFlow.filter((c) => c.type === "entrada");
  const exits = cashFlow.filter((c) => c.type === "saida");

  const totalEntries = entries.reduce((acc, c) => acc + c.amount, 0);
  const totalExits = exits.reduce((acc, c) => acc + c.amount, 0);

  const handleAddCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) return;

    await addCashEntry.mutateAsync({
      type: "entrada",
      category: "Aporte de Caixa",
      description: cashDescription.trim() || "Entrada manual de dinheiro",
      amount,
    });

    setCashAmount("");
    setCashDescription("");
    setCashDialogOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader title="Financeiro" subtitle="Controle financeiro" />

      <div className="p-4 space-y-4">
        {/* Saldo atual */}
        <Card className={cn(
          "border-2",
          cashBalance >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
        )}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Saldo Recebido (Caixa)</p>
            <p className={cn(
              "text-3xl font-display font-bold",
              cashBalance >= 0 ? "text-primary text-glow" : "text-destructive"
            )}>
              {formatCurrency(cashBalance)}
            </p>
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1 text-success">
                <ArrowUpCircle className="w-4 h-4" />
                {formatCurrency(totalEntries)}
              </div>
              <div className="flex items-center gap-1 text-destructive">
                <ArrowDownCircle className="w-4 h-4" />
                {formatCurrency(totalExits)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* A Receber + Projetado */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                A Receber
              </div>
              <p className="text-lg font-bold text-warning truncate">
                {formatCurrency(pendingSalesTotal)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Vendas pendentes
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-muted/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Saldo Projetado</p>
              <p className={cn(
                "text-lg font-bold truncate",
                totalProjected >= 0 ? "text-primary" : "text-destructive"
              )}>
                {formatCurrency(totalProjected)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Caixa + a receber
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-16 flex-col gap-1">
                <DollarSign className="w-5 h-5 text-success" />
                <span className="text-xs">Adicionar Caixa</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Valor ao Caixa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cashAmount">Valor (R$)</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashDescription">Descrição (opcional)</Label>
                  <Input
                    id="cashDescription"
                    value={cashDescription}
                    onChange={(e) => setCashDescription(e.target.value)}
                    placeholder="Ex: Troco inicial do dia"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddCash}
                  disabled={addCashEntry.isPending || !cashAmount}
                >
                  {addCashEntry.isPending ? "Adicionando..." : "Confirmar Entrada"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="h-16 flex-col gap-1"
            onClick={() => navigate("/estoque/compra")}
          >
            <Package className="w-5 h-5 text-primary" />
            <span className="text-xs">Comprar Produtos</span>
          </Button>
        </div>

        <Tabs defaultValue="fluxo" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="fluxo" className="flex-1">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="contas" className="flex-1">
              Contas a Pagar
              {overdueBills.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {overdueBills.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fluxo" className="space-y-3 mt-4">
            {cashFlow.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação registrada
              </p>
            ) : (
              cashFlow.slice(0, 20).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        entry.type === "entrada" ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        {entry.type === "entrada" ? (
                          <ArrowUpCircle className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.description && <span>{entry.description} • </span>}
                          {format(new Date(entry.created_at), "dd/MM HH:mm")}
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      "font-bold",
                      entry.type === "entrada" ? "text-success" : "text-destructive"
                    )}>
                      {entry.type === "entrada" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="contas" className="space-y-3 mt-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate("/financeiro/nova-conta")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta a Pagar
            </Button>

            {bills.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma conta cadastrada
              </p>
            ) : (
              bills.map((bill) => {
                const isOverdue = !bill.is_paid && isBefore(new Date(bill.due_date), today);
                
                return (
                  <Card key={bill.id} className={cn(
                    isOverdue && "border-destructive/50 bg-destructive/5"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{bill.description}</p>
                            {isOverdue && (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Vence: {format(new Date(bill.due_date), "dd/MM/yyyy")}
                          </p>
                          <p className="font-bold mt-1">{formatCurrency(bill.amount)}</p>
                        </div>
                        <div className="shrink-0">
                          {bill.is_paid ? (
                            <Badge className="bg-success text-success-foreground">
                              <Check className="w-3 h-3 mr-1" />
                              Pago
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsPaid.mutate(bill.id)}
                              disabled={markAsPaid.isPending}
                            >
                              Marcar Pago
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
