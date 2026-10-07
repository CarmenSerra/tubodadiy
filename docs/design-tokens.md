# Tokens de diseño

Fuente de verdad: `src/app/globals.css` (colores + escala tipográfica) y
`src/app/layout.tsx` (carga de fuentes). Este documento describe las
decisiones; los valores reales siempre viven en el CSS.

## Color

Definido como variables OKLCH en `:root` / `.dark` dentro de
`globals.css`, mapeadas a los tokens de Tailwind (`--color-primary`,
`--color-background`, etc.) vía `@theme inline`. Ver ese archivo para la
paleta completa (primary, secondary, muted, accent, destructive, success,
warning + sus variantes `-foreground`).

## Tipografía

Tres familias, cada una con un rol fijo y sin solaparse:

| Rol | Familia | Variable CSS | Utilidad Tailwind |
|---|---|---|---|
| Cuerpo e interfaz (por defecto) | DM Sans | `--font-body` | `font-sans` (y por defecto, sin clase) |
| Títulos (h1–h4, títulos de tarjeta/sección) | Newsreader | `--font-display` | `font-display` |
| Acento decorativo | Birthstone | `--font-script` | `font-script` / `.text-script-accent` |

Las tres se cargan con `next/font/google` en `src/app/layout.tsx`
(`subsets: ["latin"]`, `display: "swap"`, con fallback de sistema para
evitar saltos de maquetación al cargar). `next/font` genera el CSS
`@font-face` y expone cada variable (`--font-body`, `--font-display`,
`--font-script`) en el elemento `<html>`; `globals.css` las reexpone bajo
los nombres de tema de Tailwind:

```css
--font-sans: var(--font-body);
--font-display: var(--font-display);
--font-script: var(--font-script);
```

Comprobado en `á é í ó ú ñ ¿ ¡ €`: las tres familias cubren el subset
`latin`/`latin-ext` de Google Fonts, que incluye los diacríticos y la ñ
del español y el signo €.

### Cambiar la fuente de títulos (punto único de cambio)

Todo lo relacionado con "títulos" en el resto de la app referencia la
variable `--font-display` y la utilidad `font-display` — nunca el nombre
"Newsreader" directamente. Para cambiar la tipografía de títulos (p. ej.
a Young Serif):

1. En `src/app/layout.tsx`, cambia el import (`Newsreader` → `Young_Serif`)
   y la llamada que genera la variable `--font-display`.
2. Ajusta las opciones a lo que soporte la fuente nueva. Young Serif solo
   tiene el peso 400 y no tiene cursiva, así que habría que:
   - quitar `axes: ["opsz"]` y `style: ["normal", "italic"]` (no aplican),
   - cambiar `font-weight: 500` a `400` en las reglas `h1–h4` y en
     `CardTitle` (`src/components/ui/card.tsx`),
   - revisar los puntos que usan cursiva de títulos (ver más abajo) y
     sustituirlos por otro recurso (color, tamaño, el acento Birthstone),
     ya que Young Serif no tiene estilo itálico.

Ningún otro archivo necesita tocarse: `globals.css`, `card.tsx` y el resto
de componentes consumen la variable, no el nombre de la fuente.

### Escala

Definida como valores por defecto para `h1`–`h4` en `@layer base` de
`globals.css` (se aplica automáticamente a cualquier encabezado que no
fije su propio tamaño; las páginas pueden seguir ajustando el tamaño con
una utilidad de Tailwind si necesitan un encabezado de interfaz más
compacto — la familia/peso/optical-sizing se mantienen igual).

| Nivel | Familia | Peso | Tamaño | Interlineado |
|---|---|---|---|---|
| Cuerpo | DM Sans | 400 | 16px (1rem) | 1.6 |
| Etiquetas y botones | DM Sans | 500 | heredado del componente (14–16px) | — |
| h1 | Newsreader | 500 | `clamp(2.5rem, 2rem + 2vw, 3rem)` → 40–48px según viewport | 1.2 |
| h2 | Newsreader | 500 | 32px (2rem) | 1.2 |
| h3 | Newsreader | 500 | 24px (1.5rem) | 1.2 |
| h4 | Newsreader | 500 | 20px (1.25rem) | 1.2 |
| Títulos de tarjeta (`CardTitle`) | Newsreader | 500 | según `className` del uso (normalmente `text-base`–`text-xl`) | — |

`font-optical-sizing: auto` está activado en `h1`–`h4` para que
Newsreader use el corte óptico correspondiente a cada tamaño en vez de
escalar siempre el mismo corte de texto.

Ajuste sobre la propuesta original: se cambió "h1 ~40–48px" fijo por un
`clamp()` responsivo entre esos dos valores (en vez de un salto brusco
entre un tamaño mobile y otro desktop con breakpoints manuales), y el
peso de `CardTitle` bajó de 600 (semibold) a 500 (medium) para que
coincida con el resto de la escala de títulos en vez de tener un peso
distinto solo para tarjetas.

### Cursiva de Newsreader

Reservada para acentos puntuales: una frase destacada bajo un titular
(ver el subtítulo de la portada, `src/app/page.tsx`), nunca el estilo por
defecto de un encabezado. Se activa a mano con `italic` + `font-display`
en el elemento concreto, no hay una regla global que la aplique.

### Birthstone (acento caligráfico)

Un único peso (400), sin variantes. Reglas de uso, exigidas por el
utilitario `.text-script-accent` (`globals.css`) y a respetar en
cualquier uso manual:

- **Tamaño mínimo ~36px.** `.text-script-accent` usa
  `clamp(2.25rem, 2rem + 1vw, 3rem)` (36–48px), nunca por debajo del
  mínimo.
- **Color:** `#2E3D34` o `#6B7C5E` únicamente. `.text-script-accent` trae
  `#6B7C5E` por defecto; para el tono más oscuro, añadir `text-[#2E3D34]`
  al elemento.
- **Dónde sí:** nombres de la pareja (título de un plan concreto, ver
  `plan-shell.tsx`), la cabecera principal de la portada (acento sobre el
  h1, ver `page.tsx`), alguna frase de apertura de sección puntual.
- **Dónde nunca:** botones, formularios, tablas, etiquetas, navegación, ni
  ningún texto que se necesite leer con rapidez (listas, texto de estado,
  contenido escaneable). El logotipo de marca en las barras de navegación
  sigue usando Newsreader en tamaño pequeño, no Birthstone.
