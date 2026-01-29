import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSale } from "@/hooks/useSales";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function NovaVenda() {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();

  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = items.reduce((acc, item) => 
    acc + item.product.sale_price * item.quantity, 0
  );

  const totalProfit = items.reduce((acc, item) => 
    acc + (item.product.sale_price - item.product.cost_price) * item.quantity, 0
  );

  const addItem = (product: typeof products[0]) => {
    if (product.stock_quantity === 0) {
      toast({ title: "Produto sem estoque!", variant: "destructive" });
      return;
    }

    const existingIndex = items.findIndex((i) => i.product.id === product.id);
    
    if (existingIndex >= 0) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty >= product.stock_quantity) {
        toast({ title: "Estoque insuficiente!", variant: "destructive" });
        return;
      }
      const newItems = [...items];
      newItems[existingIndex].quantity++;
      setItems(newItems);
    } else {
      setItems([...items, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      newItems.splice(index, 1);
    } else if (newQty > item.product.stock_quantity) {
      toast({ title: "Estoque insuficiente!", variant: "destructive" });
      return;
    } else {
      newItems[index].quantity = newQty;
    }
    
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    let customerId: string | null = null;

    // Criar cliente se necessário
    if (customerName.trim()) {
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === customerName.toLowerCase().trim()
      );
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await createCustomer.mutateAsync(customerName.trim());
        customerId = newCustomer.id;
      }
    }

    await createSale.mutateAsync({
      items,
      payment_method: paymentMethod,
      customer_id: customerId,
    });

    navigate("/vendas");
  };

  return (
    <AppLayout>
      <PageHeader title="Nova Venda" showBack />

      <div className="p-4 space-y-4 pb-32">
        {/* Busca de produtos */}
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Lista de produtos */}
        {search && (
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.slice(0, 6).map((product) => (
              <Card
                key={product.id}
                className={cn(
                  "cursor-pointer transition-all",
                  product.stock_quantity === 0 && "opacity-50"
                )}
                onClick={() => addItem(product)}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-primary font-bold">
                    {formatCurrency(product.sale_price)}
                  </p>
                  <Badge
                    variant={product.stock_quantity === 0 ? "destructive" : "secondary"}
                    className="text-xs mt-1"
                  >
                    {product.stock_quantity} un
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Itens do carrinho */}
        {items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Itens da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, index) => (
                <div key={item.product.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.product.sale_price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(index, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(index, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        const newItems = [...items];
                        newItems.splice(index, 1);
                        setItems(newItems);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Forma de pagamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-2 gap-3"
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
                <RadioGroupItem value="credito" id="credito" />
                <Label htmlFor="credito">Crédito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debito" id="debito" />
                <Label htmlFor="debito">Débito</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Cliente (opcional) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cliente (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Resumo fixo no bottom */}
      {items.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-40">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-display font-bold text-primary text-glow">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className="text-sm text-primary">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
            <Button
              className="w-full glow-neon"
              onClick={handleSubmit}
              disabled={createSale.isPending}
            >
              {createSale.isPending ? "Registrando..." : "Confirmar Venda"}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
