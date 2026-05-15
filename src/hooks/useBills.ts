import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bill } from "@/types/database";
import { toast } from "@/hooks/use-toast";

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .order("due_date");
      
      if (error) throw error;
      return data as Bill[];
    },
  });
}

export function usePendingBills() {
  return useQuery({
    queryKey: ["bills", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("is_paid", false)
        .order("due_date");
      
      if (error) throw error;
      return data as Bill[];
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: Omit<Bill, "id" | "created_at" | "updated_at" | "is_paid" | "paid_at">) => {
      const { data, error } = await supabase
        .from("bills")
        .insert(bill)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Conta cadastrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar conta", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkBillAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("bills")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Registrar saída no caixa
      const { error: cfError } = await supabase.from("cash_flow").insert({
        type: "saida",
        category: "conta",
        description: `Pagamento: ${data.description}`,
        amount: data.amount,
        reference_id: id,
        reference_type: "bill",
      });
      if (cfError) console.error("Erro ao registrar saída no caixa (conta paga):", cfError);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Conta marcada como paga!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao marcar conta como paga", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; description?: string; amount?: number; due_date?: string }) => {
      const { data, error } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      toast({ title: "Conta atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar conta", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      toast({ title: "Conta excluída com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir conta", description: error.message, variant: "destructive" });
    },
  });
}
