"use client";

import { useEffect } from "react";

const UPDATE_CHECK_INTERVAL_MS = 60_000;

export function SWRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let intervalId: number | undefined;
    let reloading = false;

    const triggerReload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // Quand un nouveau SW prend le controle, on recharge pour servir les nouveaux assets
        navigator.serviceWorker.addEventListener("controllerchange", triggerReload);

        // Detecte un nouveau SW en cours d'installation
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
              triggerReload();
            }
          });
        });

        // Polling: verifie regulierement si le serveur a un nouveau SW
        intervalId = window.setInterval(() => {
          reg.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);

        // Verifie aussi quand l'app revient au premier plan
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {});

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
