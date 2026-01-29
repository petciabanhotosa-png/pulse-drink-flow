import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItem, SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";

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
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, payment_method, customer_id }: CreateSaleInput) => {
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

      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customer_id || null,
          total_amount: totalAmount,
          total_profit: totalProfit,
          payment_method,
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

      // Registrar entrada no caixa
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
