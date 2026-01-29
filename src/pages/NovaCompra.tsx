import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchase } from "@/hooks/usePurchases";
import { PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function NovaCompra() {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const createPurchase = useCreatePurchase();
  
  const [form, setForm] = useState({
    product_id: "",
    quantity: "",
    unit_cost: "",
    payment_method: "dinheiro" as PaymentMethod,
  });

  const quantity = parseInt(form.quantity) || 0;
  const unitCost = parseFloat(form.unit_cost) || 0;
  const totalAmount = quantity * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.product_id) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    if (quantity <= 0) {
      toast({ title: "Informe a quantidade", variant: "destructive" });
      return;
    }

    if (unitCost <= 0) {
      toast({ title: "Informe o custo unitário", variant: "destructive" });
      return;
    }

    await createPurchase.mutateAsync({
      product_id: form.product_id,
      quantity,
      unit_cost: unitCost,
      payment_method: form.payment_method,
    });

    navigate("/estoque");
  };

  return (
    <AppLayout>
      <PageHeader title="Nova Compra" subtitle="Entrada de estoque" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Custo Unitário</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.unit_cost}
                  onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                />
              </div>
            </div>

            {totalAmount > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Total da Compra</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup
                value={form.payment_method}
                onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro">Dinheiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix">PIX</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cartao" id="cartao" />
                  <Label htmlFor="cartao">Cartão</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createPurchase.isPending}>
          {createPurchase.isPending ? "Registrando..." : "Registrar Compra"}
        </Button>
      </form>
    </AppLayout>
  );
}
