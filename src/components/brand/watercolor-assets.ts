// Generado por scripts/watercolor/generate.mjs: no editar a mano.
// Dimensiones (px) de los WebP de public/decor y su familia.
export type WatercolorKind = "branch" | "leaf" | "flower" | "ring" | "heart" | "wash" | "mini";

export const WATERCOLOR = {
  "branch-eucalyptus-round": { w: 276, h: 396, kind: "branch" },
  "branch-eucalyptus-willow": { w: 238, h: 387, kind: "branch" },
  "branch-olive": { w: 230, h: 405, kind: "branch" },
  "branch-berries": { w: 260, h: 400, kind: "branch" },
  "branch-fern": { w: 202, h: 361, kind: "branch" },
  "leaf-large": { w: 210, h: 340, kind: "leaf" },
  "leaf-slender": { w: 170, h: 340, kind: "leaf" },
  "flower-blossoms": { w: 258, h: 335, kind: "flower" },
  "flower-lavender": { w: 226, h: 335, kind: "flower" },
  "flower-bloom": { w: 257, h: 352, kind: "flower" },
  "rings": { w: 330, h: 260, kind: "ring" },
  "ring-stone": { w: 230, h: 290, kind: "ring" },
  "heart-lilac": { w: 210, h: 200, kind: "heart" },
  "hearts-pair": { w: 250, h: 210, kind: "heart" },
  "wash-lilac": { w: 280, h: 238, kind: "wash" },
  "wash-sage": { w: 280, h: 238, kind: "wash" },
  "splash": { w: 266, h: 238, kind: "wash" },
  "sprig-mini": { w: 136, h: 68, kind: "mini" },
} as const satisfies Record<string, { w: number; h: number; kind: WatercolorKind }>;

export type WatercolorName = keyof typeof WATERCOLOR;
