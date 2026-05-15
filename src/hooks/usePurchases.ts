import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PaymentMethod } from "@/types/database";
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

export function usePurchaseBatches(productId?: string) {
  return useQuery({
    queryKey: ["purchase_batches", productId],
    queryFn: async () => {
      let query = supabase
        .from("purchase_batches")
        .select("*, products(name)")
        .order("created_at", { ascending: true });
      
      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
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
  supplier?: string;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, quantity, unit_cost, payment_method, supplier }: CreatePurchaseInput) => {
      const total_amount = quantity * unit_cost;

      // 1. Criar compra (registro histórico)
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({ product_id, quantity, unit_cost, total_amount, payment_method })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // 2. Criar lote PEPS (FIFO)
      const { data: batch, error: batchError } = await supabase
        .from("purchase_batches")
        .insert({
          product_id,
          initial_quantity: quantity,
          remaining_quantity: quantity,
          purchase_price: unit_cost,
          purchase_id: purchase.id,
          supplier: supplier || null,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 3. Estoque é sincronizado automaticamente via trigger no banco
      //    quando um novo lote é inserido. Apenas lemos o valor atualizado.
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", product_id)
        .single();

      const newStock = product?.stock_quantity ?? quantity;

      // 4. Registrar movimentação de estoque
      const { error: mvError } = await supabase.from("inventory_movements").insert({
        product_id,
        batch_id: batch.id,
        movement_type: "entrada",
        quantity,
        unit_price: unit_cost,
        origin: "compra",
        reference_id: purchase.id,
        resulting_stock: newStock,
      });
      if (mvError) console.error("Erro ao registrar movimentação de estoque:", mvError);

      // 5. Registrar saída no caixa
      const { error: cfError } = await supabase.from("cash_flow").insert({
        type: "saida",
        category: "compra",
        description: `Compra de estoque`,
        amount: total_amount,
        reference_id: purchase.id,
        reference_type: "purchase",
      });
      if (cfError) console.error("Erro ao registrar saída no caixa:", cfError);

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Compra registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar compra", description: error.message, variant: "destructive" });
    },
  });
}
