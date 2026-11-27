import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemePicker } from "@/components/ThemePicker";

const renderPicker = () => render(<ThemeProvider attribute="class" themes={["dark", "soft"]} defaultTheme="dark" enableSystem={false} storageKey="pulse-drink-theme"><ThemePicker /></ThemeProvider>);
afterEach(() => { localStorage.removeItem("pulse-drink-theme"); document.documentElement.className = ""; });
describe("escolha de aparência", () => {
  it("oferece tema suave, salva a escolha e permite voltar ao atual", async () => {
    localStorage.removeItem("pulse-drink-theme");
    renderPicker();
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    fireEvent.keyDown(screen.getByRole("button", { name: "Escolher aparência" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Suave/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass("soft"));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("pulse-drink-theme")).toBe("soft");
    fireEvent.keyDown(screen.getByRole("button", { name: "Escolher aparência" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Neon atual/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(document.documentElement).not.toHaveClass("soft");
  });
  it("restaura a escolha após reabrir o aplicativo", async () => {
    localStorage.setItem("pulse-drink-theme", "soft");
    renderPicker();
    await waitFor(() => expect(document.documentElement).toHaveClass("soft"));
  });
});
