"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

/**
 * Registra el service worker (només en producció) i avisa quan hi ha una
 * versió nova de l'app. Sense això, a l'iPhone l'app instal·lada continuava
 * servint la versió antiga de la memòria cau fins que es tancava del tot:
 * ara es comprova en tornar a l'app i es pot actualitzar amb un toc.
 */
export function SwRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);
  const userAsked = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;

    function watch(reg: ServiceWorkerRegistration) {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          // Amb un controlador actiu és una actualització (no la primera instal·lació).
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
    }

    function register() {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(watch)
        .catch(() => {
          // Sense xarxa o servidor no disponible: la propera càrrega ho reintenta.
        });
    }

    // Una app instal·lada gairebé mai es torna a carregar: es busquen
    // versions noves cada cop que es torna a obrir.
    function onVisible() {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    }

    function onControllerChange() {
      // Només després de prémer «Actualitza» (la primera instal·lació també
      // canvia de controlador i allà no s'ha de recarregar).
      if (!userAsked.current || reloading.current) return;
      reloading.current = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("load", register);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl bg-surface py-2.5 pr-2.5 pl-4 shadow-float"
    >
      <p className="min-w-0 flex-1 text-subhead">Hi ha una versió nova de MY GYM.</p>
      <Button
        size="sm"
        onClick={() => {
          userAsked.current = true;
          waiting.postMessage("SKIP_WAITING");
        }}
      >
        Actualitza
      </Button>
    </div>
  );
}
