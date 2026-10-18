import * as React from "react";

import type { TableShape } from "@/components/banquet/banquet-model";

const SIZE = 72;
const C = SIZE / 2;

function seatPositions(shape: TableShape, count: number): { x: number; y: number }[] {
  if (shape === "round") {
    const radius = 29;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
    });
  }
  // Rectangular: la mitad de las sillas arriba y la otra mitad abajo.
  const top = Math.ceil(count / 2);
  const bottom = count - top;
  const row = (n: number, y: number) =>
    Array.from({ length: n }, (_, i) => ({ x: 8 + ((SIZE - 16) * (i + 0.5)) / n, y }));
  return [...row(top, 15), ...row(bottom, SIZE - 15)];
}

/** Dibujo pequeño de la mesa con una silla por plaza: llena si está ocupada, vacía si está libre. */
export function TableDiagram({
  shape,
  capacity,
  used,
  className,
}: {
  shape: TableShape;
  capacity: number;
  used: number;
  className?: string;
}) {
  const seats = seatPositions(shape, Math.max(1, capacity));
  const radius = capacity > 16 ? 2.2 : capacity > 10 ? 2.8 : 3.4;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false" className={className}>
      {shape === "round" ? (
        <circle cx={C} cy={C} r={19} style={{ fill: "var(--lilac-flat)", stroke: "var(--line-strong)" }} strokeWidth={1.5} />
      ) : (
        <rect x={8} y={22} width={SIZE - 16} height={28} rx={5} style={{ fill: "var(--lilac-flat)", stroke: "var(--line-strong)" }} strokeWidth={1.5} />
      )}
      {seats.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={radius}
          strokeWidth={1.5}
          style={{ fill: i < used ? "var(--lilac)" : "var(--surface)", stroke: "var(--lilac)" }}
        />
      ))}
    </svg>
  );
}
