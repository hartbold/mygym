import type { SVGProps } from "react";

/**
 * Icones de traç en l'esperit de SF Symbols (graella de 24, puntes
 * arrodonides). Sempre decoratives: el nom accessible el posa el botó.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icon({ size = 24, strokeWidth = 1.8, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Icon>
  );
}

export function XmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M9.5 7V5.25c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V7M6.5 7l.75 11.6c.06 1.07.95 1.9 2.02 1.9h5.46c1.07 0 1.96-.83 2.02-1.9L17.5 7M10 11v5.5M14 11v5.5" />
    </Icon>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.75" y="6.5" width="3.5" height="11" rx="1.25" />
      <rect x="15.75" y="6.5" width="3.5" height="11" rx="1.25" />
      <path d="M8.25 12h7.5M2.5 9.75v4.5M21.5 9.75v4.5" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.75h17M8 3v3.5M16 3v3.5" />
    </Icon>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.28 5.11L10.55 2.86L13.45 2.86L13.72 5.11L15.66 5.91L17.44 4.52L19.48 6.56L18.09 8.34L18.89 10.28L21.14 10.55L21.14 13.45L18.89 13.72L18.09 15.66L19.48 17.44L17.44 19.48L15.66 18.09L13.72 18.89L13.45 21.14L10.55 21.14L10.28 18.89L8.34 18.09L6.56 19.48L4.52 17.44L5.91 15.66L5.11 13.72L2.86 13.45L2.86 10.55L5.11 10.28L5.91 8.34L4.52 6.56L6.56 4.52L8.34 5.91Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V10M10 3.5h4M18.5 6.5l-1.3 1.3" />
    </Icon>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 14V3.5M8.5 7 12 3.5 15.5 7M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5" />
    </Icon>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5V14M8.5 10.5 12 14l3.5-3.5M8.5 7H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 16.8v.2" />
    </Icon>
  );
}

export function InstallIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Icon>
  );
}

export function StorageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.75" />
      <path d="M4.5 6v12c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75V6M4.5 12c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75" />
    </Icon>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />
    </Icon>
  );
}
