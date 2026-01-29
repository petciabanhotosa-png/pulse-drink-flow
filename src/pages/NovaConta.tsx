import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateBill } from "@/hooks/useBills";
import { toast } from "@/hooks/use-toast";

export default function NovaConta() {
  const navigate = useNavigate();
  const createBill = useCreateBill();
  
  const [form, setForm] = useState({
    description: "",
    amount: "",
    due_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.description.trim()) {
      toast({ title: "Informe a descrição", variant: "destructive" });
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: "Informe o valor", variant: "destructive" });
      return;
    }

    if (!form.due_date) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }

    await createBill.mutateAsync({
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      due_date: form.due_date,
    });

    navigate("/financeiro");
  };

  return (
    <AppLayout>
      <PageHeader title="Nova Conta" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Aluguel, Energia, Fornecedor..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createBill.isPending}>
          {createBill.isPending ? "Salvando..." : "Cadastrar Conta"}
        </Button>
      </form>
    </AppLayout>
  );
}
