import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import NovaCompra from "@/pages/NovaCompra";
import { useCreatePurchaseOrder } from "@/hooks/usePurchases";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/layout/PageHeader", () => ({ PageHeader: () => <h1>Nova Compra</h1> }));
vi.mock("@/hooks/useProducts", () => ({ useProducts: () => ({ data: [{ id: "a", name: "Cerveja" }, { id: "b", name: "Água" }] }) }));
// Native select in unit tests; the production component remains Radix Select.
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) =>
    <select aria-label="Produto" value={value} onChange={event => onValueChange(event.target.value)}><option value="">Selecione</option>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
}));
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client()}>{children}</QueryClientProvider>;
function open() {
  return render(<MemoryRouter initialEntries={["/compras/nova"]}><Routes>
    <Route path="/compras/nova" element={<NovaCompra />} /><Route path="/estoque" element={<h1>Estoque</h1>} />
    <Route path="/financeiro" element={<h1>Contas a Pagar</h1>} />
  </Routes></MemoryRouter>, { wrapper });
}
function fill(index: number, product: string, quantity: string, cost: string) {
  const row = within(screen.getByRole("region", { name: `Item ${index}` }));
  fireEvent.change(row.getByRole("combobox"), { target: { value: product } });
  fireEvent.change(row.getByLabelText("Quantidade"), { target: { value: quantity } });
  fireEvent.change(row.getByLabelText("Custo Unitário"), { target: { value: cost } });
}
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: { purchases: [], total_amount: 25.45 }, error: null }); });
describe("compra com vários produtos", () => {
  it("envia todos os itens juntos, soma centavos e mantém um fornecedor", async () => {
    open(); fill(1, "a", "3", "5.15");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar produto" })); fill(2, "b", "2", "5");
    fireEvent.change(screen.getByLabelText("Fornecedor (opcional)"), { target: { value: "Distribuidora" } });
    expect(screen.getByText(/25,45/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Registrar Compra" }));
    await screen.findByRole("heading", { name: "Estoque" });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_purchase_order", { p_payload: {
      items: [{ product_id: "a", quantity: 3, unit_cost: 5.15 }, { product_id: "b", quantity: 2, unit_cost: 5 }],
      supplier: "Distribuidora", payment_method: "dinheiro", installment_count: 1, first_due_date: null,
    } });
  });
  it("remove somente a linha escolhida e atualiza o total", () => {
    open(); fill(1, "a", "3", "5.15"); fireEvent.click(screen.getByRole("button", { name: "Adicionar produto" })); fill(2, "b", "2", "5");
    fireEvent.click(screen.getByRole("button", { name: "Remover item 1" }));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.getByRole("combobox")).toHaveValue("b");
    expect(screen.getAllByText(/10,00/)).toHaveLength(2);
  });
  it("preserva todos os campos se o banco recusar a compra", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Falha na compra" } });
    open(); fill(1, "a", "3", "5.15"); fireEvent.click(screen.getByRole("button", { name: "Adicionar produto" })); fill(2, "b", "2", "5");
    fireEvent.click(screen.getByRole("button", { name: "Registrar Compra" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Registrar Compra" })).toBeEnabled());
    expect(screen.getAllByRole("combobox").map(el => (el as HTMLSelectElement).value)).toEqual(["a", "b"]);
    expect(screen.getAllByLabelText("Quantidade").map(el => (el as HTMLInputElement).value)).toEqual(["3", "2"]);
  });
  it("recusa item incompleto sem registrar os demais", async () => {
    const { result } = renderHook(useCreatePurchaseOrder, { wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ payment_method: "pix", items: [
      { product_id: "a", quantity: 1, unit_cost: 5 }, { product_id: "b", quantity: 0, unit_cost: 2 },
    ] })).rejects.toThrow("Confira"); });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("envia um único parcelamento sobre todos os produtos", async () => {
    open(); fill(1, "a", "3", "5.15"); fireEvent.click(screen.getByRole("button", { name: "Adicionar produto" })); fill(2, "b", "2", "5");
    fireEvent.click(screen.getByRole("radio", { name: "Crédito a prazo" }));
    fireEvent.change(screen.getByLabelText("Quantidade de parcelas"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Primeiro vencimento"), { target: { value: "2090-01-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar Compra" }));
    await screen.findByRole("heading", { name: "Contas a Pagar" });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0]).toEqual(["create_purchase_order", { p_payload: expect.objectContaining({
      items: expect.any(Array), payment_method: "credito", installment_count: 3, first_due_date: "2090-01-31",
    }) }]);
  });
});
