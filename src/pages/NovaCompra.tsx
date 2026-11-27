import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchaseOrder } from "@/hooks/usePurchases";
import { PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { InstallmentFields } from "@/components/InstallmentFields";
import { buildInstallments } from "@/lib/installments";
import { cents } from "@/lib/money";
import { addDays, addMonths, format } from "date-fns";

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function NovaCompra() {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const createPurchase = useCreatePurchaseOrder();
  const nextItemId = useRef(2);
  const [items, setItems] = useState([{ id: 1, product_id: "", quantity: "", unit_cost: "" }]);
  const [installmentCount, setInstallmentCount] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(() => format(addMonths(new Date(), 1), "yyyy-MM-dd"));
  const [form, setForm] = useState({ payment_method: "dinheiro" as PaymentMethod, supplier: "" });
  const updateItem = (id: number, field: "product_id" | "quantity" | "unit_cost", value: string) =>
    setItems(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
  const purchaseItems = items.map(item => ({ product_id: item.product_id, quantity: Number(item.quantity), unit_cost: cents(item.unit_cost) / 100 }));
  const totalCents = purchaseItems.reduce((sum, item) => sum + (Number.isFinite(item.unit_cost) ? cents(item.unit_cost) * item.quantity : 0), 0);
  const totalAmount = totalCents / 100;
  const isCredit = form.payment_method === "credito";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createPurchase.isPending) return;
    for (const [index, item] of purchaseItems.entries()) {
      if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_cost) || item.unit_cost <= 0) {
        toast({ title: `Confira o item ${index + 1}`, description: "Selecione o produto e informe quantidade inteira e custo maiores que zero.", variant: "destructive" });
        return;
      }
    }
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
      toast({ title: "Confira o total da compra", variant: "destructive" });
      return;
    }
    if (isCredit) {
      try {
        buildInstallments(totalAmount, Number(installmentCount), firstDueDate);
        if (firstDueDate <= format(new Date(), "yyyy-MM-dd")) throw new Error("O primeiro vencimento deve ser uma data futura.");
      } catch (error) {
        toast({ title: "Confira o parcelamento", description: (error as Error).message, variant: "destructive" });
        return;
      }
    }
    try {
      await createPurchase.mutateAsync({ items: purchaseItems, payment_method: form.payment_method,
        supplier: form.supplier || undefined, installment_count: isCredit ? Number(installmentCount) : undefined,
        first_due_date: isCredit ? firstDueDate : undefined });
      navigate(isCredit ? "/financeiro?aba=contas" : "/estoque");
    } catch { /* Keep the complete form for retry; the mutation displays the error. */ }
  };

  return <AppLayout>
    <PageHeader title="Nova Compra" subtitle="Adicione os produtos e registre tudo de uma vez" showBack />
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <Card><CardContent className="p-4 space-y-4">
        <fieldset disabled={createPurchase.isPending} className="space-y-4 min-w-0">
          {items.map((item, index) => <section key={item.id} aria-label={`Item ${index + 1}`} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Item {index + 1}</h2>
              {items.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remover item ${index + 1}`}
                onClick={() => setItems(current => current.filter(row => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`product-${item.id}`}>Produto</Label>
              <Select value={item.product_id} onValueChange={value => updateItem(item.id, "product_id", value)} disabled={createPurchase.isPending}>
                <SelectTrigger id={`product-${item.id}`}><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`quantity-${item.id}`}>Quantidade</Label>
                <Input id={`quantity-${item.id}`} type="number" min="1" step="1" required placeholder="0"
                  value={item.quantity} onChange={event => updateItem(item.id, "quantity", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cost-${item.id}`}>Custo Unitário</Label>
                <Input id={`cost-${item.id}`} type="number" min="0.01" step="0.01" required placeholder="0,00"
                  value={item.unit_cost} onChange={event => updateItem(item.id, "unit_cost", event.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{formatCurrency((Number(item.quantity) || 0) * (cents(item.unit_cost) || 0) / 100)}</span></p>
          </section>)}
          <Button type="button" variant="outline" className="w-full" disabled={items.length >= 100}
            onClick={() => { const id = nextItemId.current++; setItems(current => [...current, { id, product_id: "", quantity: "", unit_cost: "" }]); }}>
            <Plus className="h-4 w-4 mr-2" />Adicionar produto
          </Button>
          {items.length >= 100 && <p className="text-sm text-muted-foreground">Limite de 100 itens por compra.</p>}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor (opcional)</Label>
            <Input id="supplier" placeholder="Nome do fornecedor" value={form.supplier} onChange={event => setForm({ ...form, supplier: event.target.value })} />
          </div>
          <div className="p-3 rounded-lg bg-muted" aria-live="polite">
            <p className="text-sm text-muted-foreground">Total da Compra</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <RadioGroup value={form.payment_method} onValueChange={value => setForm({ ...form, payment_method: value as PaymentMethod })} className="grid grid-cols-2 gap-3">
              {([['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['credito', 'Crédito a prazo'], ['debito', 'Débito']] as const).map(([value, label]) =>
                <div key={value} className="flex items-center space-x-2"><RadioGroupItem value={value} id={value} /><Label htmlFor={value}>{label}</Label></div>)}
            </RadioGroup>
          </div>
          {isCredit && <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Os produtos entram no estoque agora. As parcelas são calculadas sobre o total da compra e ficam em Contas a Pagar. Só saem do caixa quando você marcar cada uma como paga.</p>
            <InstallmentFields total={totalAmount} count={installmentCount} firstDue={firstDueDate} onCountChange={setInstallmentCount}
              onFirstDueChange={setFirstDueDate} minDate={format(addDays(new Date(), 1), "yyyy-MM-dd")} />
          </div>}
        </fieldset>
      </CardContent></Card>
      <Button type="submit" className="w-full" disabled={createPurchase.isPending}>{createPurchase.isPending ? "Registrando..." : "Registrar Compra"}</Button>
    </form>
  </AppLayout>;
}
