import {
  Caveat,
  Cormorant_Garamond,
  DM_Serif_Display,
  Fraunces,
  Gaegu,
  Great_Vibes,
  Jost,
  Libre_Baskerville,
  Lora,
  Manrope,
  Patrick_Hand,
  Playfair_Display,
  Young_Serif,
} from "next/font/google";

/**
 * Fuentes de Google (gratuitas, autoalojadas por next/font) del modo «Desde cero».
 * Cada una define una variable CSS `--font-cc-*`; las que ya carga el layout para las
 * plantillas (Birthstone, Newsreader, DM Sans, Delicious Handrawn, Caprasimo) se
 * reutilizan con sus variables de siempre. Ninguna se precarga: el navegador solo
 * descarga el archivo de la que se usa en pantalla. El catálogo (ids, grupos,
 * variables) vive en `custom-fonts.ts`, que no importa next/font.
 */
const greatVibes = Great_Vibes({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-great-vibes", weight: "400", fallback: ["cursive"] });
const jost = Jost({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-jost", fallback: ["system-ui", "sans-serif"] });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-manrope", fallback: ["system-ui", "sans-serif"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-cormorant", fallback: ["Georgia", "serif"] });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-playfair", fallback: ["Georgia", "serif"] });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-fraunces", fallback: ["Georgia", "serif"] });
const gaegu = Gaegu({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-gaegu", weight: ["400", "700"], fallback: ["cursive"] });
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-caveat", fallback: ["cursive"] });
const patrickHand = Patrick_Hand({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-patrick-hand", weight: "400", fallback: ["cursive"] });
const youngSerif = Young_Serif({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-young-serif", weight: "400", fallback: ["Georgia", "serif"] });
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-dm-serif-display", weight: "400", fallback: ["Georgia", "serif"] });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-lora", fallback: ["Georgia", "serif"] });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-cc-libre-baskerville", fallback: ["Georgia", "serif"] });

/** Clases que definen todas las variables `--font-cc-*`: van en <html> (layout raíz). */
export const CUSTOM_FONT_VARIABLES = [
  greatVibes,
  jost,
  manrope,
  cormorant,
  playfair,
  fraunces,
  gaegu,
  caveat,
  patrickHand,
  youngSerif,
  dmSerifDisplay,
  lora,
  libreBaskerville,
]
  .map((font) => font.variable)
  .join(" ");
