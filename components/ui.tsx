"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "./icons";

/*
 * Peces compartides de la UI (estil iOS). Les vistes les componen; els
 * colors i la tipografia surten dels tokens de `app/globals.css`.
 */

export const CARD = "rounded-2xl bg-surface";

/** Camp de text «omplert» d'iOS (sobre targeta blanca). */
export const FIELD =
  "h-11 w-full min-w-0 rounded-[10px] bg-fill-3 px-3 text-body text-label tabular-nums outline-hidden transition-[box-shadow,background-color] duration-150 placeholder:font-normal placeholder:text-label-3 focus:bg-surface focus:ring-[1.5px] focus:ring-accent";

type ButtonVariant = "primary" | "secondary" | "plain" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[transform,opacity,background-color] duration-150 ease-ios active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-fill-3 text-label active:bg-fill-2",
  plain: "text-label active:opacity-50",
  destructive: "bg-danger/10 text-danger-ink active:bg-danger/15",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-subhead",
  md: "h-11 px-5 text-body",
  lg: "h-[3.25rem] w-full px-6 text-body",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

/**
 * Botó rodó només amb icona. `filled`: cercle gris de 36px (barres de
 * navegació, tancar). `ghost`: sense fons, 44px de zona tàctil (files).
 */
export function IconButton({
  label,
  variant = "filled",
  className = "",
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  variant?: "filled" | "ghost";
}) {
  const look =
    variant === "filled"
      ? "size-9 bg-fill-3 text-label active:bg-fill-2"
      : // Anell de focus a dins: les targetes (overflow-hidden) el retallarien.
        // label-2/75 ≈ 3,3:1 sobre blanc: el mínim per a una icona que és l'únic contingut del botó.
        "size-11 text-label-2/75 active:text-label focus-visible:-outline-offset-2";
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid shrink-0 place-items-center rounded-full transition-[transform,background-color,color] duration-150 ease-ios active:scale-[0.94] ${look} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Contenidor de cada vista: amplada de mòbil i marge per a la barra inferior. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+8.5rem)]">
      {children}
    </div>
  );
}

/**
 * Títol gran d'iOS. En fer scroll apareix una barra compacta, translúcida,
 * amb el títol centrat. `back` hi posa un botó enrere rodó a l'esquerra.
 */
export function NavHeader({
  title,
  eyebrow,
  back,
  trailing,
}: {
  title: string;
  eyebrow?: string;
  back?: { label: string; onClick: () => void };
  trailing?: ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), {
      rootMargin: "-52px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-20 border-b-[0.5px] pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-200 ${
          compact
            ? "border-separator bg-canvas/80 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto grid h-12 max-w-lg grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4">
          <div>
            {back && (
              <IconButton label={back.label} onClick={back.onClick}>
                <ChevronLeftIcon size={20} strokeWidth={2.2} />
              </IconButton>
            )}
          </div>
          <p
            aria-hidden="true"
            className={`truncate text-center text-headline transition-opacity duration-200 ${
              compact ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </p>
          <div className="justify-self-end">{trailing}</div>
        </div>
      </div>
      <header className="pt-[calc(env(safe-area-inset-top)+3.25rem)] pb-5">
        {eyebrow && (
          <p className="text-footnote font-semibold tracking-[0.02em] text-label-2 uppercase">{eyebrow}</p>
        )}
        <h1 className="text-largetitle text-balance">{title}</h1>
        <div ref={sentinel} />
      </header>
    </>
  );
}

/** Secció agrupada d'iOS: capçalera en versaletes, contingut i peu opcional. */
export function Section({
  header,
  footer,
  children,
  className = "",
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {header && (
        <h2 className="px-4 pb-2 text-footnote font-medium tracking-[0.02em] text-label-2 uppercase">
          {header}
        </h2>
      )}
      {children}
      {footer && <div className="px-4 pt-2 text-footnote text-label-2">{footer}</div>}
    </section>
  );
}

/** Llista agrupada (targeta blanca amb files i separadors interiors). */
export function List({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ul className={`list-inset overflow-hidden ${CARD} ${className}`}>{children}</ul>;
}

/**
 * Fila d'una `List`. Amb `onClick` és un botó sencer. `ariaLabel` fixa el
 * nom accessible quan el text visible inclou detalls secundaris.
 */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  chevron = false,
  onClick,
  ariaLabel,
  titleClassName = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  titleClassName?: string;
}) {
  const content = (
    <>
      {leading && <span className="mr-3 flex shrink-0 items-center py-2">{leading}</span>}
      <span className="cell flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2.5 pr-4">
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-body ${titleClassName}`}>{title}</span>
          {subtitle && <span className="mt-0.5 block text-subhead text-label-2">{subtitle}</span>}
        </span>
        {trailing && <span className="shrink-0 text-body text-label-2">{trailing}</span>}
        {chevron && <ChevronRightIcon size={16} strokeWidth={2.4} className="-mr-1 shrink-0 text-label-3" />}
      </span>
    </>
  );
  return (
    <li>
      {onClick ? (
        // Anell de focus a dins i arrodonit com la llista: `List` és overflow-hidden.
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className="flex w-full items-stretch pl-4 text-left transition-colors duration-150 focus-visible:-outline-offset-2 focus-visible:rounded-2xl active:bg-fill-4"
        >
          {content}
        </button>
      ) : (
        <div className="flex items-stretch pl-4">{content}</div>
      )}
    </li>
  );
}

/** Xifres del resum d'una sessió (etiqueta petita a dalt, número gran a sota). */
export function StatGrid({ items }: { items: { label: string; value: string; unit?: string }[] }) {
  return (
    <dl className={`${CARD} flex justify-between gap-3 px-4 py-3.5`}>
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption font-medium text-label-2">{it.label}</dt>
          <dd className="text-title2 font-semibold whitespace-nowrap tabular-nums">
            {it.value}
            {it.unit && <span className="ml-0.5 text-subhead font-medium text-label-2">{it.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Estat buit a l'estil de ContentUnavailableView d'iOS. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 pt-14 pb-6 text-center">
      <div className="mb-3 text-label-3">{icon}</div>
      <p className="text-title3 font-semibold">{title}</p>
      {children && <div className="mt-1.5 max-w-xs text-subhead text-label-2">{children}</div>}
    </div>
  );
}

/** UISegmentedControl. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  // Patró de grup de ràdio: només l'opció triada és al Tab; les fletxes canvien d'opció.
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col rounded-[9px] bg-fill-3 p-[2px]"
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`h-8 rounded-[7px] text-footnote transition-[background-color,box-shadow] duration-200 ease-ios ${
              selected
                ? "bg-surface font-semibold text-label shadow-thumb"
                : "font-medium text-label active:opacity-60"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Camp de cerca d'iOS (lupa + fons gris). El botó natiu per buidar-lo es
 * manté, però pintat com el cercle gris d'iOS (vegeu `app/globals.css`).
 */
export function SearchField(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className="flex h-10 items-center gap-1.5 rounded-[10px] bg-fill-3 px-2.5 text-label-2 transition-[box-shadow,background-color] duration-150 focus-within:bg-surface focus-within:ring-1 focus-within:ring-label-3">
      <SearchIcon size={18} strokeWidth={2} className="shrink-0" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-body text-label outline-hidden placeholder:text-label-2"
        {...props}
      />
    </label>
  );
}

/**
 * Mentre un full (`.sheet`) és obert, li passa l'àrea visible real
 * (`visualViewport`) com a --vvh/--vvtop: a l'iPhone, amb el teclat obert,
 * el viewport de layout no s'encongeix i la part de dalt quedaria amagada.
 */
export function useSheetViewport(dialogRef: React.RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const d = dialogRef.current;
    const vv = window.visualViewport;
    if (!open || !d || !vv) return;
    const viewport = vv;
    function sync() {
      d!.style.setProperty("--vvh", `${viewport.height}px`);
      d!.style.setProperty("--vvtop", `${viewport.offsetTop}px`);
    }
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [dialogRef, open]);
}
