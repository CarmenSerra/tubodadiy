"use client";

import {
  Asterisk,
  Baby,
  Bean,
  CandyOff,
  Droplet,
  Egg,
  Fish,
  Flower2,
  Heart,
  Leaf,
  Milk,
  MilkOff,
  Moon,
  Nut,
  Salad,
  Shell,
  Shrimp,
  Squirrel,
  Star,
  Vegan,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { type DietId } from "@/lib/diets";

// Iconos de lucide: sencillos y legibles a 16-20 px. El significado nunca va
// solo en el icono: cada uno lleva título y aria-label traducidos.
const ICONS: Record<DietId, LucideIcon> = {
  gluten: Wheat,
  crustaceans: Shrimp,
  egg: Egg,
  fish: Fish,
  peanut: Nut,
  soy: Bean,
  dairy: Milk,
  treeNuts: Squirrel,
  celery: Salad,
  mustard: Droplet,
  sesame: Asterisk,
  sulfites: Wine,
  lupin: Flower2,
  molluscs: Shell,
  vegetarian: Leaf,
  vegan: Vegan,
  lactoseFree: MilkOff,
  diabetes: CandyOff,
  pregnancy: Heart,
  halal: Moon,
  kosher: Star,
  kids: Baby,
};

/** Nombre traducido de un id (para listas, filtros y textos). */
export function useDietLabel() {
  const { t } = useTranslation("diets");
  return (id: DietId) => t(`items.${id}.label`);
}

interface DietIconProps {
  id: DietId;
  /** Lado en px (por defecto 16). */
  size?: number;
  className?: string;
  /** Con `true` el icono es decorativo (el nombre ya está en el texto de al lado). */
  decorative?: boolean;
}

/** Icono de un alérgeno o dieta, con `<title>` y `aria-label` traducidos. */
export function DietIcon({ id, size = 16, className, decorative = false }: DietIconProps) {
  const { t } = useTranslation("diets");
  const Icon = ICONS[id];
  if (!Icon) return null;
  const label = t(`items.${id}.label`);
  if (decorative) {
    return <Icon width={size} height={size} aria-hidden="true" focusable="false" className={className} />;
  }
  return (
    <Icon width={size} height={size} role="img" aria-label={label} focusable="false" className={className}>
      <title>{label}</title>
    </Icon>
  );
}

interface DietBadgesProps {
  ids: readonly DietId[];
  /** Lado de los iconos en px (por defecto 16). */
  size?: number;
  /** Máximo de badges visibles; el resto se resume en «+N». Sin límite por defecto. */
  max?: number;
  className?: string;
}

/**
 * Fila de iconos (cada uno en una pastilla lila pequeña) para una lista de ids.
 * Si no hay ids no pinta nada.
 */
export function DietBadges({ ids, size = 16, max, className }: DietBadgesProps) {
  const { t } = useTranslation("diets");
  if (ids.length === 0) return null;
  const shown = max !== undefined ? ids.slice(0, max) : ids;
  const hidden = ids.length - shown.length;
  return (
    <ul className={cn("flex flex-wrap items-center gap-1", className)} aria-label={t("badgesAria")}>
      {shown.map((id) => (
        <li
          key={id}
          className="inline-flex items-center justify-center rounded-full bg-lilac-soft p-1 text-ink ring-1 ring-lilac-edge"
          style={{ width: size + 10, height: size + 10 }}
        >
          <DietIcon id={id} size={size} />
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-xs font-medium text-ink-muted">{t("more", { count: hidden })}</li>
      )}
    </ul>
  );
}
