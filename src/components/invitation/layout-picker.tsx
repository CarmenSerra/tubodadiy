"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  LAYOUT_IDS,
  STATIONERY_LAYOUTS,
  cleanLayout,
  type InvitationLayout,
} from "@/components/invitation/invitation-layouts";
import { themeFor, type InvitationPalette, type InvitationTheme, type TemplateKind } from "@/components/invitation/invitation-theme";
import { cn } from "@/lib/utils";

/** Miniatura esquemática (50 × 70) de cada composición, con los colores de la paleta elegida. */
function Thumb({ id, theme }: { id: InvitationLayout; theme: InvitationTheme }) {
  const ink = theme.ink;
  const accent = theme.primary;
  const soft = theme.line;
  const bar = (x: number, y: number, w: number, h: number, fill = ink, o = 0.9) => (
    <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} opacity={o} />
  );
  const rule = (x1: number, y1: number, x2: number, y2: number) => (
    <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={0.7} opacity={0.8} />
  );
  const sprig = (x: number, y: number) => (
    <g key={`s${x}-${y}`} opacity={0.9}>
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke={theme.leaf} strokeWidth={0.8} />
      <ellipse cx={x - 2.5} cy={y - 1.4} rx={1.8} ry={0.9} fill={theme.leaf} />
      <ellipse cx={x + 2.5} cy={y + 1.4} rx={1.8} ry={0.9} fill={theme.leaf} />
    </g>
  );

  let body: React.ReactNode;
  switch (id) {
    case "classic":
      body = (
        <>
          {bar(11, 8, 28, 4)}
          {bar(17, 15, 16, 1.6, soft, 1)}
          {rule(6, 24, 44, 24)}
          {rule(6, 41, 44, 41)}
          {rule(18, 26, 18, 39)}
          {rule(32, 26, 32, 39)}
          {bar(8, 31, 8, 2, accent)}
          {bar(21, 28, 8, 7)}
          {bar(35, 31, 8, 2, accent)}
          {bar(14, 48, 22, 2.4)}
          {sprig(25, 58)}
        </>
      );
      break;
    case "bigDate":
      body = (
        <>
          {bar(11, 8, 28, 4)}
          {bar(17, 15, 16, 1.6, soft, 1)}
          {rule(6, 24, 44, 24)}
          {bar(19, 27, 12, 1.6, accent)}
          {bar(6, 32, 38, 8)}
          {rule(6, 44, 44, 44)}
          {bar(9, 49, 32, 2.4, accent)}
          {sprig(25, 59)}
        </>
      );
      break;
    case "calendar": {
      const cells: React.ReactNode[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          const on = r === 2 && c === 4;
          cells.push(
            on ? (
              <path
                key="on"
                d="M0 3.6C-4.200 0.600 -5.400 -1.400 -5.400 -3C-5.400 -4.800 -4 -5.800 -2.600 -5.800C-1.400 -5.800 -0.500 -5.200 0 -4.100C0.500 -5.200 1.400 -5.800 2.600 -5.800C4 -5.800 5.400 -4.800 5.400 -3C5.400 -1.400 4.200 0.600 0 3.600Z"
                transform={`translate(${10 + c * 5} ${27 + r * 4.2})`}
                fill={accent}
                opacity={0.95}
              />
            ) : (
              <circle key={`${r}-${c}`} cx={10 + c * 5} cy={27 + r * 4.2} r={0.9} fill={ink} opacity={0.5} />
            )
          );
        }
      }
      body = (
        <>
          {bar(11, 7, 28, 4)}
          {bar(17, 14, 16, 1.6, soft, 1)}
          {bar(10, 19.5, 14, 2, ink, 0.8)}
          {cells}
          {bar(11, 50, 28, 2.4, accent)}
          {bar(18, 56, 14, 1.8, ink, 0.6)}
        </>
      );
      break;
    }
    case "sidebar":
      body = (
        <>
          {bar(6, 7, 14, 1.8, accent)}
          {bar(6, 18, 15, 4)}
          {bar(6, 25, 5, 2, accent)}
          {bar(6, 30, 12, 4)}
          {rule(24, 16, 24, 48)}
          {bar(28, 17, 12, 1.6, accent)}
          {bar(28, 22, 9, 9)}
          {bar(28, 34, 14, 1.6, accent)}
          {bar(28, 40, 10, 2.2)}
          {bar(28, 45, 14, 2.4, ink, 0.7)}
          {bar(6, 54, 16, 1.6, soft, 1)}
          {bar(6, 60, 12, 2.4, accent)}
        </>
      );
      break;
    case "editorial":
      body = (
        <>
          {bar(6, 7, 12, 1.8, accent)}
          {bar(6, 14, 36, 6)}
          {bar(6, 23, 26, 6)}
          {rule(6, 34, 16, 34)}
          {bar(6, 38, 38, 2, ink, 0.55)}
          {bar(6, 43, 34, 2, ink, 0.55)}
          {bar(6, 48, 22, 2, ink, 0.55)}
          {bar(6, 56, 12, 1.6, accent)}
        </>
      );
      break;
    case "medallion":
      body = (
        <>
          {bar(16, 6, 18, 3.4)}
          {bar(23, 12, 4, 1.6, accent)}
          <path
            d="M14 41V30a11 11 0 0 1 22 0V41Z"
            transform="translate(0 -4)"
            fill="none"
            stroke={accent}
            strokeWidth={0.9}
          />
          {bar(20, 25, 10, 1.4, accent)}
          {bar(21, 29, 8, 7)}
          {bar(21, 39, 8, 1.4, ink, 0.6)}
          {bar(16, 46, 18, 3.4)}
          {bar(12, 55, 26, 2.4, accent)}
        </>
      );
      break;
    case "block":
      body = (
        <>
          {bar(6, 7, 14, 1.8, accent)}
          {bar(6, 13, 24, 4.4)}
          {bar(6, 20, 18, 4.4)}
          {rule(6, 30, 44, 30)}
          {bar(6, 35, 7, 1.6, accent)}
          {bar(17, 34.4, 26, 2.6)}
          {bar(6, 43, 7, 1.6, accent)}
          {bar(17, 42.4, 12, 2.6)}
          {bar(6, 51, 7, 1.6, accent)}
          {bar(17, 50.4, 22, 2.6)}
          {bar(6, 60, 12, 1.6, accent)}
        </>
      );
      break;
    case "vertical":
      body = (
        <>
          {bar(11, 7, 28, 4)}
          {bar(17, 14, 16, 1.6, soft, 1)}
          {rule(15, 22, 35, 22)}
          {bar(19, 25, 12, 1.6, accent)}
          {bar(19, 29, 12, 10)}
          {bar(18, 42, 14, 1.8, ink, 0.8)}
          {bar(20, 46, 10, 1.4, ink, 0.5)}
          {rule(15, 50, 35, 50)}
          {bar(19, 54, 12, 2.2, accent)}
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 50 70" focusable="false" aria-hidden="true" className="h-full w-auto">
      {body}
    </svg>
  );
}

/**
 * Composición de la tarjeta: cómo se colocan la fecha, la hora, el lugar y los
 * nombres. Se guarda en el estilo compartido, así que «Reserva la fecha» usa la
 * misma cuando sabe dibujarla (ver `STATIONERY_LAYOUTS`).
 */
export function LayoutEditor({
  template,
  palette,
  layout,
  onChange,
  idPrefix = "style",
}: {
  template: TemplateKind;
  palette: InvitationPalette | undefined;
  layout: InvitationLayout | undefined;
  onChange: (layout: InvitationLayout) => void;
  idPrefix?: string;
}) {
  const { t } = useTranslation("invitation");
  const theme = React.useMemo(() => themeFor(palette, template), [palette, template]);
  const selected = cleanLayout(layout);
  const stationeryToo = STATIONERY_LAYOUTS.includes(selected);

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label={t("editor.layout.label")} className="grid grid-cols-4 gap-2">
        {LAYOUT_IDS.map((id) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              id={`${idPrefix}-layout-${id}`}
              aria-checked={active}
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border-2 bg-raised p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                active ? "border-lilac bg-lilac-soft/60" : "border-line hover:border-lilac"
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-24 items-center justify-center rounded-lg border border-black/10 py-2"
                style={{ background: "var(--inv-app-table)" }}
              >
                <span
                  className="flex aspect-[5/7] h-full items-center justify-center overflow-hidden rounded-[3px] border"
                  style={{ background: theme.paper, borderColor: theme.line }}
                >
                  <Thumb id={id} theme={theme} />
                </span>
              </span>
              <span className="flex min-h-8 items-start gap-0.5 px-0.5 text-[13px] font-medium leading-tight text-ink-strong">
                {active && <CheckIcon aria-hidden="true" className="mt-px size-3.5 shrink-0 text-green" />}
                {t(`layouts.${id}`)}
              </span>
            </button>
          );
        })}
      </div>
      {!stationeryToo && (
        <p role="status" className="text-[13px] leading-snug text-ink-muted">
          {t("editor.layout.invitationOnly")}
        </p>
      )}
    </div>
  );
}
