import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductInvestment {
  product_id: string;
  product_name: string;
  total_invested: number;
  total_quantity: number;
}

export interface InvestmentData {
  totalInvested: number;
  byProduct: ProductInvestment[];
}

/**
 * Total amount invested in current stock, based on remaining quantities
 * of purchase batches multiplied by their original purchase price (FIFO).
 */
export function useCurrentInvestment() {
  return useQuery({
    queryKey: ["investment", "current"],
    queryFn: async (): Promise<InvestmentData> => {
      const { data: batches, error } = await supabase
        .from("purchase_batches")
        .select("product_id, remaining_quantity, purchase_price, products:product_id (name)")
        .gt("remaining_quantity", 0);
      if (error) throw error;

      const map = new Map<string, ProductInvestment>();
      let totalInvested = 0;

      for (const b of batches || []) {
        const value = Number(b.remaining_quantity) * Number(b.purchase_price);
        totalInvested += value;
        const name = (b.products as { name: string } | null)?.name || "Produto";
        const cur = map.get(b.product_id);
        if (cur) {
          cur.total_invested += value;
          cur.total_quantity += Number(b.remaining_quantity);
        } else {
          map.set(b.product_id, {
            product_id: b.product_id,
            product_name: name,
            total_invested: value,
            total_quantity: Number(b.remaining_quantity),
          });
        }
      }

      const byProduct = Array.from(map.values()).sort(
        (a, b) => b.total_invested - a.total_invested
      );

      return { totalInvested, byProduct };
    },
  });
}
