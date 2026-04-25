import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Auto-update PWA: when a new version is detected, immediately activate it
// and reload the page so users always see the latest code on mobile.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New SW waiting → reload to apply
    window.location.reload();
  },
  onRegisteredSW(_swUrl, registration) {
    // Check for updates every 60s while app is open
    if (registration) {
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60_000);
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);
