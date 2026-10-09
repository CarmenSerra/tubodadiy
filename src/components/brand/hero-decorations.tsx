import { Watercolor } from "@/components/brand/watercolor";
import type { WatercolorName } from "@/components/brand/watercolor-assets";
import { cn } from "@/lib/utils";

// Decoraciones de marca compartidas (landing, login, signup): ramas en acuarela
// y destellos. Son puramente ornamentales: aria-hidden y
// pointer-events-none, y el contenedor que las use debe ser `relative`.

// Rama de acuarela (public/decor): eucalipto de hoja redonda por defecto, o la variante
// que se indique. Se coloca con las clases del llamador (`h-[48%] w-auto`, `-scale-x-100`...).
export function Branch({
  className,
  name = "branch-eucalyptus-round",
}: {
  className?: string;
  name?: WatercolorName;
}) {
  return <Watercolor name={name} className={cn("absolute", className)} />;
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("pointer-events-none absolute size-8 sm:size-10", className)}
      style={{ stroke: "var(--deco-line-bright)" }}
    >
      <path d="M6 14 L14 18" />
      <path d="M12 4 L17 12" />
      <path d="M26 2 L26 11" />
    </svg>
  );
}
