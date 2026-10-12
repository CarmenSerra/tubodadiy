// Generado por scripts/watercolor/generate.mjs: no editar a mano.
// Dimensiones (px) de los WebP de public/decor/travel y su familia.
export type TravelKind = "wash" | "tall" | "low" | "small";

export const TRAVEL = {
  "wash-aqua": { w: 280, h: 238, kind: "wash" },
  "wash-sand": { w: 280, h: 238, kind: "wash" },
  "palm": { w: 261, h: 369, kind: "tall" },
  "umbrella": { w: 315, h: 378, kind: "tall" },
  "suitcase": { w: 243, h: 297, kind: "tall" },
  "sun": { w: 300, h: 300, kind: "low" },
  "wave": { w: 340, h: 250, kind: "low" },
  "shell": { w: 270, h: 240, kind: "low" },
  "coconut": { w: 280, h: 250, kind: "low" },
  "hibiscus": { w: 285, h: 285, kind: "low" },
  "passport": { w: 270, h: 350, kind: "small" },
  "id-card": { w: 340, h: 240, kind: "small" },
  "boarding-pass": { w: 380, h: 200, kind: "small" },
  "stamp": { w: 280, h: 320, kind: "small" },
  "compass": { w: 290, h: 300, kind: "small" },
  "camera": { w: 310, h: 250, kind: "small" },
  "map": { w: 350, h: 280, kind: "small" },
  "airplane": { w: 360, h: 280, kind: "small" },
} as const satisfies Record<string, { w: number; h: number; kind: TravelKind }>;

export type TravelName = keyof typeof TRAVEL;
