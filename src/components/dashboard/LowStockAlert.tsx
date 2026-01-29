import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/database";

interface LowStockAlertProps {
  products: Product[];
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  if (products.length === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
          <AlertTriangle className="w-4 h-4" />
          Estoque Baixo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {products.slice(0, 3).map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between py-1"
          >
            <span className="text-sm truncate flex-1">{product.name}</span>
            <Badge
              variant={product.stock_quantity === 0 ? "destructive" : "outline"}
              className="shrink-0 ml-2"
            >
              {product.stock_quantity} un
            </Badge>
          </div>
        ))}
        {products.length > 3 && (
          <p className="text-xs text-muted-foreground">
            +{products.length - 3} produtos com estoque baixo
          </p>
        )}
      </CardContent>
    </Card>
  );
}
