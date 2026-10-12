import { TRAVEL, type TravelKind, type TravelName } from "@/components/honeymoon/travel-assets";
import { buildDecorLayout, type DecorItem, type DecorKit } from "@/lib/decor-layout";

// Reparto de las acuarelas de viaje (public/decor/travel) por los márgenes de la Luna de
// miel. Usa el mismo motor que el fondo del resto de la app (src/lib/decor-layout.ts):
// semilla = ruta, así que cada página tiene su composición y no cambia al volver a ella.
// Papeles: manchas (wash), objetos altos que se anclan a los bordes (tall: palmera, sombrilla,
// maleta), piezas bajas para las esquinas de abajo (low: sol, ola, concha, coco, hibisco) y
// detalles sueltos (small: pasaporte, DNI, billete, sello, brújula, cámara, mapa, avión).

const names = (kind: TravelKind) => (Object.keys(TRAVEL) as TravelName[]).filter((n) => TRAVEL[n].kind === kind);

const TRAVEL_KIT: DecorKit<TravelName, TravelKind> = {
  catalog: TRAVEL,
  pools: { wash: names("wash"), plant: names("tall"), flower: names("low"), small: names("small") },
  size: { wash: [320, 440], tall: [140, 190], low: [120, 170], small: [130, 180] },
  opacity: { wash: [0.5, 0.75], tall: [0.62, 0.8], low: [0.62, 0.8], small: [0.62, 0.8] },
  washKind: "wash",
  free: ["small"],
  extra: { min: 3, spread: 3, order: ["small", "plant", "flower", "small", "flower", "plant", "small"] },
};

export type TravelItem = DecorItem<TravelName>;

export function travelLayout(seed: string): TravelItem[] {
  return buildDecorLayout(seed, TRAVEL_KIT);
}
