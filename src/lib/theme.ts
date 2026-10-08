// Tema claro/oscuro ("modo noche"). El botón de la cabecera lo cambia; la
// elección se guarda en localStorage y un script en el <head> (THEME_INIT_SCRIPT)
// la aplica antes del primer pintado para evitar el parpadeo. No se sigue la
// preferencia del sistema a propósito: solo manda el botón.

export type Theme = "light" | "dark";

export const THEME_KEY = "tubodadiy-theme";

/** Lee la elección guardada (sin lanzar si localStorage no está disponible). */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Aplica el tema al <html> (y color-scheme, vía CSS). */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Cambia de tema y lo guarda. */
export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento: el cambio vale solo para esta visita.
  }
}

/**
 * Script en línea del <head>: corre mientras se analiza el HTML, antes de
 * pintar. Lee la elección guardada y fija data-theme en <html>. Cualquier otra
 * clave antigua en localStorage (p. ej. la de las variantes candidatas) se ignora.
 */
export const THEME_INIT_SCRIPT = `(function(){var t="light";try{if(localStorage.getItem("${THEME_KEY}")==="dark")t="dark"}catch(e){}document.documentElement.setAttribute("data-theme",t)})()`;
