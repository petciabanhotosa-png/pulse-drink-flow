import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItem, SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";

interface SaleItemWithProduct {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  created_at: string;
  product_name: string;
}

interface SaleWithDetails extends Sale {
  customer: { name: string } | null;
  items: SaleItemWithProduct[];
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useSaleById(saleId: string) {
  return useQuery({
    queryKey: ["sales", saleId],
    queryFn: async () => {
      // Buscar venda com cliente
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`
          *,
          customers:customer_id (name)
        `)
        .eq("id", saleId)
        .single();

      if (saleError) throw saleError;

      // Buscar itens da venda
      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          *,
          products:product_id (name)
        `)
        .eq("sale_id", saleId);

      if (itemsError) throw itemsError;

      const saleWithDetails: SaleWithDetails = {
        id: sale.id,
        customer_id: sale.customer_id,
        total_amount: sale.total_amount,
        total_profit: sale.total_profit,
        discount_amount: sale.discount_amount,
        payment_method: sale.payment_method as "dinheiro" | "pix" | "credito" | "debito",
        status: sale.status as "pago" | "pendente",
        created_at: sale.created_at,
        customer: sale.customers as { name: string } | null,
        items: items.map((item) => ({
          ...item,
          product_name: (item.products as { name: string })?.name || "Produto removido",
        })),
      };

      return saleWithDetails;
    },
    enabled: !!saleId,
  });
}

export function useTodaySales() {
  return useQuery({
    queryKey: ["sales", "today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useMonthSales() {
  return useQuery({
    queryKey: ["sales", "month"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });
}

interface CreateSaleInput {
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  customer_id?: string | null;
  discount_amount?: number;
  status?: "pago" | "pendente";
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, payment_method, customer_id, discount_amount = 0, status = "pago" }: CreateSaleInput) => {
      // Calcular totais
      let totalAmount = 0;
      let totalProfit = 0;
      
      const saleItems = items.map((item) => {
        const subtotal = item.product.sale_price * item.quantity;
        const profit = (item.product.sale_price - item.product.cost_price) * item.quantity;
        totalAmount += subtotal;
        totalProfit += profit;
        
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          unit_cost: item.product.cost_price,
          subtotal,
          profit,
        };
      });

      // Aplicar desconto
      totalAmount -= discount_amount;
      totalProfit -= discount_amount;
      if (totalProfit < 0) totalProfit = 0;

      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customer_id || null,
          total_amount: totalAmount,
          total_profit: totalProfit,
          payment_method,
          discount_amount,
          status,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Criar itens da venda
      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems.map((item) => ({ ...item, sale_id: sale.id })));

      if (itemsError) throw itemsError;

      // Atualizar estoque
      for (const item of items) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq("id", item.product.id);

        if (stockError) throw stockError;
      }

      // Registrar entrada no caixa APENAS se não for pendente
      if (status === "pago") {
        const { error: cashError } = await supabase
          .from("cash_flow")
          .insert({
            type: "entrada",
            category: "venda",
            description: `Venda #${sale.id.slice(0, 8)}`,
            amount: totalAmount,
            reference_id: sale.id,
            reference_type: "sale",
          });

        if (cashError) throw cashError;
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkSaleAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // Buscar venda
      const { data: sale, error: fetchError } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (fetchError) throw fetchError;
      if (sale.status === "pago") throw new Error("Venda já está paga");

      // Atualizar status
      const { error: updateError } = await supabase
        .from("sales")
        .update({ status: "pago" })
        .eq("id", saleId);

      if (updateError) throw updateError;

      // Registrar entrada no caixa
      const { error: cashError } = await supabase
        .from("cash_flow")
        .insert({
          type: "entrada",
          category: "venda",
          description: `Venda #${saleId.slice(0, 8)} (pago)`,
          amount: sale.total_amount,
          reference_id: saleId,
          reference_type: "sale",
        });

      if (cashError) throw cashError;

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Venda marcada como paga!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao marcar venda como paga", description: error.message, variant: "destructive" });
    },
  });
}
