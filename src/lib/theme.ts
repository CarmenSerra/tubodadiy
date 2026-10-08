// Tema claro/oscuro ("modo noche"). El botón de la cabecera lo cambia; la
// elección se guarda en localStorage y un script en el <head> (THEME_INIT_SCRIPT)
// la aplica antes del primer pintado para evitar el parpadeo. No se sigue la
// preferencia del sistema a propósito: solo manda el botón.

export type Theme = "light" | "dark";
/** TEMPORAL: dos candidatas de modo noche hasta que el cliente elija una. */
export type DarkVariant = "forest" | "plum";

export const THEME_KEY = "tubodadiy-theme";
export const DARK_VARIANT_KEY = "tubodadiy-dark";

/** Lee la elección guardada (sin lanzar si localStorage no está disponible). */
export function readStoredTheme(): { theme: Theme; variant: DarkVariant } {
  try {
    const theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    const variant = localStorage.getItem(DARK_VARIANT_KEY) === "plum" ? "plum" : "forest";
    return { theme, variant };
  } catch {
    return { theme: "light", variant: "forest" };
  }
}

/** Aplica el tema al <html> (y color-scheme, vía CSS). */
export function applyTheme(theme: Theme, variant: DarkVariant) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "dark") root.setAttribute("data-dark", variant);
  else root.removeAttribute("data-dark");
}

/** Cambia de tema y lo guarda. */
export function setTheme(theme: Theme) {
  const { variant } = readStoredTheme();
  applyTheme(theme, variant);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento: el cambio vale solo para esta visita.
  }
}

/**
 * Script en línea del <head>: corre mientras se analiza el HTML, antes de
 * pintar. Lee la elección guardada y fija data-theme / data-dark en <html>.
 * `?oscuro=bosque|ciruela` (solo para elegir candidata) activa el modo noche
 * con esa variante y la guarda.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,K="${THEME_KEY}",V="${DARK_VARIANT_KEY}",s;try{s=localStorage}catch(e){}var q=new URLSearchParams(location.search).get("oscuro"),m={bosque:"forest",forest:"forest",ciruela:"plum",plum:"plum"},v=m[q]||null,t;if(v){t="dark";try{s.setItem(K,"dark");s.setItem(V,v)}catch(e){}}else{try{t=s.getItem(K);v=s.getItem(V)}catch(e){}}if(t==="dark"){d.setAttribute("data-theme","dark");d.setAttribute("data-dark",v==="plum"?"plum":"forest")}else{d.setAttribute("data-theme","light");d.removeAttribute("data-dark")}}catch(e){}})()`;
