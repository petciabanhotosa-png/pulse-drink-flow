import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, AlertTriangle, Check, Database } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BackupData {
  version: string;
  created_at: string;
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  sale_items: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  purchase_batches: Record<string, unknown>[];
  inventory_movements: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  cash_flow: Record<string, unknown>[];
}

export default function Backup() {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Buscar todos os dados (incluindo purchase_batches e inventory_movements para FIFO)
      const [products, customers, sales, saleItems, purchases, purchaseBatches, inventoryMovements, bills, cashFlow] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("sales").select("*"),
        supabase.from("sale_items").select("*"),
        supabase.from("purchases").select("*"),
        supabase.from("purchase_batches").select("*"),
        supabase.from("inventory_movements").select("*"),
        supabase.from("bills").select("*"),
        supabase.from("cash_flow").select("*"),
      ]);

      const backup: BackupData = {
        version: "1.1",
        created_at: new Date().toISOString(),
        products: products.data || [],
        customers: customers.data || [],
        sales: sales.data || [],
        sale_items: saleItems.data || [],
        purchases: purchases.data || [],
        purchase_batches: purchaseBatches.data || [],
        inventory_movements: inventoryMovements.data || [],
        bills: bills.data || [],
        cash_flow: cashFlow.data || [],
      };

      // Criar arquivo para download
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Backup exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({ title: "Erro ao exportar backup", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.version || !backup.created_at) {
        throw new Error("Arquivo de backup inválido");
      }

      // Limpar dados existentes (na ordem correta por causa das foreign keys)
      await supabase.from("inventory_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("sale_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("purchase_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("purchases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("cash_flow").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("bills").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Importar dados (na ordem correta) usando type assertions
      if (backup.products.length > 0) {
        await supabase.from("products").insert(backup.products as never[]);
      }
      if (backup.customers.length > 0) {
        await supabase.from("customers").insert(backup.customers as never[]);
      }
      if (backup.bills.length > 0) {
        await supabase.from("bills").insert(backup.bills as never[]);
      }
      if (backup.purchase_batches && backup.purchase_batches.length > 0) {
        await supabase.from("purchase_batches").insert(backup.purchase_batches as never[]);
      }
      if (backup.sales.length > 0) {
        await supabase.from("sales").insert(backup.sales as never[]);
      }
      if (backup.sale_items.length > 0) {
        await supabase.from("sale_items").insert(backup.sale_items as never[]);
      }
      if (backup.purchases.length > 0) {
        await supabase.from("purchases").insert(backup.purchases as never[]);
      }
      if (backup.inventory_movements && backup.inventory_movements.length > 0) {
        await supabase.from("inventory_movements").insert(backup.inventory_movements as never[]);
      }
      if (backup.cash_flow.length > 0) {
        await supabase.from("cash_flow").insert(backup.cash_flow as never[]);
      }

      toast({ title: "Backup restaurado com sucesso!" });
      navigate("/");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast({ 
        title: "Erro ao restaurar backup", 
        description: error instanceof Error ? error.message : "Arquivo inválido",
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const handleClearAll = async () => {
    if (!confirm("ATENÇÃO: Isso irá apagar TODOS os dados do aplicativo. Deseja continuar?")) {
      return;
    }
    if (!confirm("Tem certeza? Esta ação não pode ser desfeita!")) {
      return;
    }

    setIsImporting(true);
    try {
      // Limpar dados existentes (na ordem correta por causa das foreign keys)
      await supabase.from("inventory_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("sale_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("purchase_batches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("purchases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("cash_flow").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("bills").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      toast({ title: "Dados limpos com sucesso!" });
      navigate("/");
    } catch (error) {
      console.error("Erro ao limpar:", error);
      toast({ title: "Erro ao limpar dados", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Backup & Restauração" showBack />

      <div className="p-4 space-y-4 pb-24">
        <Alert>
          <Database className="w-4 h-4" />
          <AlertTitle>Backup de Dados</AlertTitle>
          <AlertDescription>
            Faça backup dos seus dados regularmente para evitar perdas. O arquivo de backup contém 
            todos os produtos, vendas, clientes e registros financeiros.
          </AlertDescription>
        </Alert>

        {/* Exportar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Exportar Backup
            </CardTitle>
            <CardDescription>
              Baixe um arquivo com todos os dados do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? "Exportando..." : "Exportar Dados"}
            </Button>
          </CardContent>
        </Card>

        {/* Importar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Restaurar Backup
            </CardTitle>
            <CardDescription>
              Restaure dados de um arquivo de backup anterior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Atenção: Restaurar um backup irá substituir todos os dados atuais!
              </AlertDescription>
            </Alert>
            <div className="relative">
              <Input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="cursor-pointer"
              />
            </div>
            {isImporting && (
              <p className="text-sm text-muted-foreground text-center">
                Restaurando backup...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Limpar dados */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zerar Aplicativo
            </CardTitle>
            <CardDescription>
              Apaga todos os dados e começa do zero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={isImporting}
              className="w-full"
            >
              Apagar Todos os Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
