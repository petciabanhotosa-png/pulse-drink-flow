import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon" aria-label="Escolher aparência" title="Escolher aparência" className="shrink-0">
        <Palette className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel>Aparência</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={theme === "soft" ? "soft" : "dark"} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="dark">
          <div><p className="font-medium">Neon atual</p><p className="text-xs text-muted-foreground">Fundo escuro e verde vibrante</p></div>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="soft">
          <div><p className="font-medium">Suave</p><p className="text-xs text-muted-foreground">Tons claros de verde, tom sobre tom</p></div>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <p className="px-2 py-1.5 text-xs text-muted-foreground">Sua escolha fica salva neste aparelho.</p>
    </DropdownMenuContent>
  </DropdownMenu>;
}
