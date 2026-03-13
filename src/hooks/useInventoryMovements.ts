import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InventoryMovement } from "@/types/database";

interface UseInventoryMovementsOptions {
  productId?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
}

export function useInventoryMovements(options: UseInventoryMovementsOptions = {}) {
  return useQuery({
    queryKey: ["inventory_movements", options],
    queryFn: async () => {
      let query = supabase
        .from("inventory_movements")
        .select("*, products(name), purchase_batches(purchase_price)")
        .order("movement_date", { ascending: false });

      if (options.productId) {
        query = query.eq("product_id", options.productId);
      }
      if (options.movementType) {
        query = query.eq("movement_type", options.movementType);
      }
      if (options.startDate) {
        query = query.gte("movement_date", options.startDate);
      }
      if (options.endDate) {
        query = query.lte("movement_date", options.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (InventoryMovement & {
        products: { name: string } | null;
        purchase_batches: { purchase_price: number } | null;
      })[];
    },
  });
}
