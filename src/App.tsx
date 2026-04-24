import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import VendaDetalhe from "./pages/VendaDetalhe";
import EditarVenda from "./pages/EditarVenda";
import Estoque from "./pages/Estoque";
import NovoProduto from "./pages/NovoProduto";
import ProdutoDetalhe from "./pages/ProdutoDetalhe";
import Financeiro from "./pages/Financeiro";
import NovaConta from "./pages/NovaConta";
import NovaCompra from "./pages/NovaCompra";
import HistoricoEstoque from "./pages/HistoricoEstoque";
import Relatorios from "./pages/Relatorios";
import Backup from "./pages/Backup";
import Instalar from "./pages/Instalar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/vendas/nova" element={<NovaVenda />} />
          <Route path="/vendas/:id" element={<VendaDetalhe />} />
          <Route path="/vendas/:id/editar" element={<EditarVenda />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/novo" element={<NovoProduto />} />
          <Route path="/estoque/:id" element={<ProdutoDetalhe />} />
          <Route path="/estoque/compra" element={<NovaCompra />} />
          <Route path="/estoque/historico" element={<HistoricoEstoque />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/financeiro/nova-conta" element={<NovaConta />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/instalar" element={<Instalar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
