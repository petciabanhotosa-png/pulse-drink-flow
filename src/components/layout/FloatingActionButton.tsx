import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function FloatingActionButton() {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate("/vendas/nova")}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg glow-neon animate-pulse-glow"
      size="icon"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
