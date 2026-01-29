import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

interface CreatePurchaseInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
  payment_method: PaymentMethod;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, quantity, unit_cost, payment_method }: CreatePurchaseInput) => {
      const total_amount = quantity * unit_cost;

      // Criar compra
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({ product_id, quantity, unit_cost, total_amount, payment_method })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Atualizar estoque
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity, cost_price")
        .eq("id", product_id)
        .single();

      if (product) {
        await supabase
          .from("products")
          .update({ 
            stock_quantity: product.stock_quantity + quantity,
            cost_price: unit_cost 
          })
          .eq("id", product_id);
      }

      // Registrar saída no caixa
      await supabase.from("cash_flow").insert({
        type: "saida",
        category: "compra",
        description: `Compra de estoque`,
        amount: total_amount,
        reference_id: purchase.id,
        reference_type: "purchase",
      });

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Compra registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar compra", description: error.message, variant: "destructive" });
    },
  });
}
