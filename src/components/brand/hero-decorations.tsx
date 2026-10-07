import { cn } from "@/lib/utils";

// Decoraciones de marca compartidas (landing, login, signup): ramas con
// hojas y destellos. Son puramente ornamentales: aria-hidden y
// pointer-events-none, y el contenedor que las use debe ser `relative`.

// Hojas de las ramas decorativas: [x, y, rotación] sobre el tallo.
const BRANCH_LEAVES: [number, number, number][] = [
  [24, 166, -115],
  [26, 160, -20],
  [33, 136, -120],
  [36, 130, -25],
  [45, 108, -125],
  [49, 102, -30],
  [59, 82, -128],
  [63, 77, -35],
  [73, 57, -130],
  [77, 52, -40],
  [85, 32, -80],
];

export function Branch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 200"
      fill="none"
      stroke="#4E6A5A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("pointer-events-none absolute", className)}
    >
      <path d="M20 200 C 24 150, 50 100, 85 30" />
      {BRANCH_LEAVES.map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d="M0 0 C 6 -7, 16 -7, 24 0 C 16 7, 6 7, 0 0Z"
          transform={`translate(${x} ${y}) rotate(${r})`}
        />
      ))}
    </svg>
  );
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="#A38ED2"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("pointer-events-none absolute size-8 sm:size-10", className)}
    >
      <path d="M6 14 L14 18" />
      <path d="M12 4 L17 12" />
      <path d="M26 2 L26 11" />
    </svg>
  );
}
