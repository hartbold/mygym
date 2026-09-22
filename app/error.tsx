"use client";

import { RetryIcon, WarningIcon } from "@/components/icons";
import { Button } from "@/components/ui";

/** Com el ContentUnavailableView d'iOS: icona, títol, explicació i una sola acció. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+4rem)] text-center">
      <WarningIcon size={48} strokeWidth={1.6} className="text-label-3" />
      <h1 className="mt-4 text-title2 font-bold text-balance">Alguna cosa ha fallat</h1>
      <p className="mt-2 max-w-xs text-subhead text-pretty text-label-2">
        Pot ser un problema temporal d&apos;accés a les dades desades (per exemple, si el navegador
        les ha bloquejat). Les teves dades no s&apos;han perdut.
      </p>
      <Button onClick={reset} className="mt-7">
        <RetryIcon size={18} strokeWidth={2.2} />
        Reintenta
      </Button>
    </main>
  );
}
