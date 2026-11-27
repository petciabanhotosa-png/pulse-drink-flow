import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { dailySales } from "@/lib/dailySales";
import { receivedSales, type ReceivedSale } from "@/lib/receivedSales";
import { DailySalesReport } from "@/components/reports/DailySalesReport";
import type { Sale, CashFlow } from "@/types/database";

const sale = (id: string, received_at: string, amount: number, profit: number): ReceivedSale => ({
  id, received_at, total_amount: amount, total_profit: profit, status: "pago", payment_method: "pix",
  customer_id: null, created_at: "2026-09-01T12:00:00Z", paid_at: received_at,
});
const fixture = [sale("sale-a", "2026-11-02T03:59:59Z", 0.1, -0.02), sale("sale-b", "2026-11-01T15:00:00Z", 0.2, 0.05),
  sale("sale-c", "2026-11-02T04:00:00Z", 20, 8), sale("previous-month", "2026-11-01T03:59:59Z", 100, 40),
  sale("next-month", "2026-12-01T04:00:00Z", 200, 80)];

describe("vendas e lucro por dia", () => {
  it("separa dias no horário de Manaus e fecha os centavos com prejuízos", () => {
    const days = dailySales(fixture, 2026, 10);
    expect(days.map(day => ({ date: day.date, count: day.sales.length, total: day.total, profit: day.profit }))).toEqual([
      { date: "2026-11-02", count: 1, total: 20, profit: 8 }, { date: "2026-11-01", count: 2, total: 0.3, profit: 0.03 },
    ]);
    expect(days[1].sales.map(s => s.id)).toEqual(["sale-a", "sale-b"]);
  });
  it("usa o recebimento vinculado para vendas antigas e exclui pendentes", () => {
    const oldSale = { ...sale("legacy", "2026-09-01T12:00:00Z", 50, 15), paid_at: null };
    const pending = { ...oldSale, id: "pending", status: "pendente" } as Sale;
    const receipt = { id: "receipt", type: "entrada", reference_type: "venda", reference_id: "legacy", created_at: "2026-11-03T15:00:00Z", amount: 50 } as CashFlow;
    const result = dailySales(receivedSales([oldSale, pending], [receipt]), 2026, 10);
    expect(result).toMatchObject([{ date: "2026-11-03", total: 50, profit: 15, sales: [{ id: "legacy" }] }]);
    expect(dailySales(receivedSales([oldSale], []), 2026, 10)).toEqual([]);
  });
  it("ignora datas inválidas e status pendente mesmo com data preenchida", () => {
    expect(dailySales([sale("bad", "inválida", 10, 2), { ...fixture[0], status: "pendente" }], 2026, 10)).toEqual([]);
  });
  it("abre cada dia com as vendas e permite consultar outro mês", () => {
    render(<MemoryRouter><DailySalesReport sales={fixture} loading={false} error={false} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Mês das vendas diárias"), { target: { value: "2026-11" } });
    expect(screen.getByText("02/11/2026")).toBeVisible();
    const summary = screen.getByText("02/11/2026").closest("summary")!;
    fireEvent.click(summary);
    // JSDOM does not toggle <details> natively; verify the rendered destination.
    expect(screen.getByRole("link", { name: /Venda #sale-c/, hidden: true })).toHaveAttribute("href", "/vendas/sale-c");
    expect(screen.getByText(/3 vendas recebidas/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Mês das vendas diárias"), { target: { value: "2026-09" } });
    expect(screen.getByText("Nenhuma venda recebida neste mês.")).toBeVisible();
  });
  it("não apresenta zero como resultado quando ainda carrega ou ocorre erro", () => {
    const { rerender } = render(<DailySalesReport sales={[]} loading error={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(screen.queryByText("Recebido no período")).not.toBeInTheDocument();
    rerender(<DailySalesReport sales={[]} loading={false} error />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível");
    expect(screen.queryByText("Nenhuma venda recebida neste mês.")).not.toBeInTheDocument();
  });
});
