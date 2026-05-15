import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "daily_sales_goal";

export function useDailyGoal() {
  return useQuery({
    queryKey: ["app_settings", KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();
      if (error) throw error;
      const value = data?.value as { amount?: number } | null;
      return Number(value?.amount ?? 0);
    },
  });
}

export function useSetDailyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: KEY, value: { amount } satisfies { amount: number } }, { onConflict: "key" });
      if (error) throw error;
      return amount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app_settings", KEY] });
    },
  });
}
