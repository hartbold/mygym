"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acció que esborra o treu alguna cosa: el botó surt en vermell. */
  destructive?: boolean;
}

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((req: Request) => void) | null = null;

/**
 * Confirmació a l'estil de les alertes d'iOS, en lloc de `window.confirm`
 * (que a l'app instal·lada a la pantalla d'inici de l'iPhone no és fiable).
 * Torna `true` si l'usuari confirma.
 */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  if (!show) {
    return Promise.resolve(window.confirm(opts.message ? `${opts.title}\n\n${opts.message}` : opts.title));
  }
  return new Promise((resolve) => show!({ ...opts, resolve }));
}

/** S'ha de muntar un cop (a `AppShell`). */
export function ConfirmHost() {
  const ref = useRef<HTMLDialogElement>(null);
  const [req, setReq] = useState<Request | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    show = (r) => setReq(r);
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (req && d && !d.open) d.showModal();
  }, [req]);

  function finish(ok: boolean) {
    req?.resolve(ok);
    setReq(null);
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={req?.message ? messageId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
      className="m-auto w-[17rem] max-w-[calc(100vw-4rem)] overflow-hidden rounded-[14px] bg-surface p-0 text-center text-label shadow-float backdrop:bg-black/30"
    >
      {req && (
        <>
          <div className="px-4 pt-5 pb-4">
            <h2 id={titleId} className="text-headline text-balance">
              {req.title}
            </h2>
            {req.message && (
              <p id={messageId} className="mt-1 text-footnote text-pretty text-label-2">
                {req.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 border-t-[0.5px] border-separator">
            <button
              type="button"
              autoFocus
              onClick={() => finish(false)}
              className="h-11 border-r-[0.5px] border-separator text-body active:bg-fill-4"
            >
              {req.cancelLabel ?? "Cancel·la"}
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              className={`h-11 text-body font-semibold active:bg-fill-4 ${req.destructive ? "text-danger-ink" : "text-label"}`}
            >
              {req.confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
