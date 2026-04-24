import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { consumeBatchesFIFO, restoreBatchesFromSale } from "./useFifoSale";

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
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`*, customers:customer_id (name)`)
        .eq("id", saleId)
        .single();
      if (saleError) throw saleError;

      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`*, products:product_id (name)`)
        .eq("sale_id", saleId);
      if (itemsError) throw itemsError;

      const saleWithDetails: SaleWithDetails = {
        id: sale.id,
        customer_id: sale.customer_id,
        total_amount: sale.total_amount,
        total_profit: sale.total_profit,
        discount_amount: sale.discount_amount,
        payment_method: sale.payment_method as PaymentMethod,
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
      // Create sale first to get the ID
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: customer_id || null,
          total_amount: 0,
          total_profit: 0,
          payment_method,
          discount_amount,
          status,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      let totalAmount = 0;
      let totalCost = 0;

      // Process each item using FIFO batch consumption
      const saleItems = [];
      for (const item of items) {
        const subtotal = item.product.sale_price * item.quantity;
        
        // Consume batches FIFO — this updates batches, stock, and creates movements
        const { totalCost: itemCost } = await consumeBatchesFIFO(
          item.product.id,
          item.quantity,
          sale.id
        );

        const unitCost = itemCost / item.quantity;
        const profit = subtotal - itemCost;

        saleItems.push({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          unit_cost: unitCost,
          subtotal,
          profit,
        });

        totalAmount += subtotal;
        totalCost += itemCost;
      }

      // Apply discount
      totalAmount -= discount_amount;
      const totalProfit = Math.max(0, totalAmount - totalCost);

      // Insert sale items
      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);
      if (itemsError) throw itemsError;

      // Update sale totals
      const { error: updateError } = await supabase
        .from("sales")
        .update({ total_amount: totalAmount, total_profit: totalProfit })
        .eq("id", sale.id);
      if (updateError) throw updateError;

      // Register cash flow only if paid
      if (status === "pago") {
        await supabase.from("cash_flow").insert({
          type: "entrada",
          category: "venda",
          description: `Venda #${sale.id.slice(0, 8)}`,
          amount: totalAmount,
          reference_id: sale.id,
          reference_type: "sale",
        });
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
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
      const { data: sale, error: fetchError } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();
      if (fetchError) throw fetchError;
      if (sale.status === "pago") throw new Error("Venda já está paga");

      const { error: updateError } = await supabase
        .from("sales")
        .update({ status: "pago" })
        .eq("id", saleId);
      if (updateError) throw updateError;

      await supabase.from("cash_flow").insert({
        type: "entrada",
        category: "venda",
        description: `Venda #${saleId.slice(0, 8)} (pago)`,
        amount: sale.total_amount,
        reference_id: saleId,
        reference_type: "sale",
      });

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

interface UpdatePendingSaleInput {
  saleId: string;
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  customer_id?: string | null;
  discount_amount?: number;
}

/**
 * Edit a pending sale: restore previous batches, recompute via FIFO with new items.
 * Only allowed for sales with status="pendente".
 */
export function useUpdatePendingSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, items, payment_method, customer_id, discount_amount = 0 }: UpdatePendingSaleInput) => {
      // 1. Verify sale is pending
      const { data: sale, error: fetchError } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();
      if (fetchError) throw fetchError;
      if (sale.status !== "pendente") {
        throw new Error("Apenas vendas pendentes podem ser editadas");
      }

      // 2. Restore stock from previous items
      await restoreBatchesFromSale(saleId);

      // 3. Delete previous sale_items
      const { error: deleteError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleId);
      if (deleteError) throw deleteError;

      // 4. Re-process new items via FIFO
      let totalAmount = 0;
      let totalCost = 0;
      const newSaleItems = [];

      for (const item of items) {
        const subtotal = item.product.sale_price * item.quantity;
        const { totalCost: itemCost } = await consumeBatchesFIFO(
          item.product.id,
          item.quantity,
          saleId
        );

        const unitCost = itemCost / item.quantity;
        const profit = subtotal - itemCost;

        newSaleItems.push({
          sale_id: saleId,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          unit_cost: unitCost,
          subtotal,
          profit,
        });

        totalAmount += subtotal;
        totalCost += itemCost;
      }

      totalAmount -= discount_amount;
      const totalProfit = Math.max(0, totalAmount - totalCost);

      // 5. Insert new sale_items
      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(newSaleItems);
      if (itemsError) throw itemsError;

      // 6. Update sale header
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          customer_id: customer_id || null,
          payment_method,
          discount_amount,
          total_amount: totalAmount,
          total_profit: totalProfit,
        })
        .eq("id", saleId);
      if (updateError) throw updateError;

      return { ...sale, total_amount: totalAmount, total_profit: totalProfit };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Venda pendente atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar venda", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Delete a pending sale and restore its stock.
 */
export function useDeletePendingSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: sale, error: fetchError } = await supabase
        .from("sales")
        .select("status")
        .eq("id", saleId)
        .single();
      if (fetchError) throw fetchError;
      if (sale.status !== "pendente") {
        throw new Error("Apenas vendas pendentes podem ser excluídas");
      }

      await restoreBatchesFromSale(saleId);

      await supabase.from("sale_items").delete().eq("sale_id", saleId);
      const { error: deleteError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleId);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Venda pendente excluída!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir venda", description: error.message, variant: "destructive" });
    },
  });
}
