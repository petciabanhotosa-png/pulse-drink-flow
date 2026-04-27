import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Button } from "@/components/ui/button";

export function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const isPreviewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");

    if (isInIframe || isPreviewHost) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60_000);
        }
      },
    });
    setUpdateSW(() => update);
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = async () => {
    if (updateSW) {
      await updateSW(true);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium truncate">
            Nova versão disponível!
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          className="shrink-0 font-semibold"
        >
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}
