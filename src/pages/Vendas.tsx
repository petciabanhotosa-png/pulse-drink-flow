import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, History } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSales } from "@/hooks/useSales";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const paymentLabels = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
};

export default function Vendas() {
  const navigate = useNavigate();
  const { data: sales = [], isLoading } = useSales();

  return (
    <AppLayout>
      <PageHeader
        title="Vendas"
        subtitle="Histórico de vendas"
        action={
          <Button size="sm" onClick={() => navigate("/vendas/nova")}>
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma venda registrada</p>
            <Button className="mt-4" onClick={() => navigate("/vendas/nova")}>
              Registrar primeira venda
            </Button>
          </div>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id} className="transition-all hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-lg">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-primary mt-1">
                      Lucro: {formatCurrency(sale.total_profit)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {paymentLabels[sale.payment_method as keyof typeof paymentLabels]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
