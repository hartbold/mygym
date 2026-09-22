"use client";

import { useEffect } from "react";

/**
 * Només en producció; comprova `document.readyState` abans d'esperar
 * l'esdeveniment `load` (que pot haver disparat abans que aquest efecte
 * s'executi si la pàgina ve d'una càrrega calenta de cache).
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    function register() {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Sense xarxa o servidor no disponible: la propera càrrega ho reintenta.
        });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
