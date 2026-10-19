// Tipos comunes de las exportaciones a hoja de cálculo (CSV y XLSX). Puro: sin
// React ni Firebase, para poder probarlo y reutilizarlo desde cualquier pestaña.

/**
 * Valor de una celda. Los textos van tal cual; los números, como números
 * (Excel puede sumarlos); `null`/`undefined`/"" = celda vacía. Las fechas son
 * cadenas `yyyy-MM-dd` en una columna de tipo `date`.
 */
export type Cell = string | number | null | undefined;

/** `money` = euros con dos decimales; `date` = `yyyy-MM-dd`; `number` = entero o decimal; `text` = el resto. */
export type ColumnKind = "text" | "number" | "money" | "date";

export interface ExportColumn {
  header: string;
  kind?: ColumnKind;
  /** Ancho aproximado en caracteres (solo XLSX). Si falta, se ajusta al contenido. */
  width?: number;
}

/** Una tabla: en XLSX es una hoja; en CSV, un bloque. */
export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  rows: Cell[][];
}

export type ExportFormat = "xlsx" | "csv";
