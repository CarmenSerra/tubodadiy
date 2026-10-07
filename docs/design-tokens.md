# Tokens de diseño

Fuente de verdad: `src/app/globals.css` (colores + escala tipográfica) y
`src/app/layout.tsx` (carga de fuentes). Este documento describe las
decisiones; los valores reales siempre viven en el CSS.

## Color

Paleta lila + verde salvia (sustituye a la anterior de rosas/crema, que se
parecía demasiado a Bodas.net). Definida como variables CSS en `:root`
dentro de `globals.css`, mapeadas a los tokens de Tailwind
(`--color-primary`, `--color-background`, etc.) vía `@theme inline`.
Ningún componente usa un hex suelto: todos consumen estos tokens
(`bg-primary`, `text-muted-foreground`, `bg-state-favorite`, etc.).

`globals.css` separa los neutros fijos (fondo, texto, superficie, bordes —
no cambian con el tema de la app) de los acentos (primary, secondary,
accent, success, warning, state-chosen). Esa separación es intencional: en
el futuro, un cambio de temporada podría añadir un selector
`[data-season="primavera"] { --primary: ...; --accent: ...; ... }` que
sobrescriba solo el bloque de acentos sin tocar los neutros. **No está
implementado** — es solo la preparación pedida, el selector no existe
todavía en el CSS.

### Tokens base

| Token | Hex | Rol |
|---|---|---|
| `--background` | `#F1EFE8` | Fondo general de la app |
| `--foreground` | `#2E3D34` | Texto principal |
| `--card` / `--popover` | `#DCCCF2` | Superficies suaves: tarjetas, cabeceras, secciones |
| `--card-foreground` / `--popover-foreground` | `#2E3D34` | Texto sobre esas superficies |
| `--muted` | `#E6E2D6` | Fondo neutro para zonas de baja prominencia |
| `--muted-foreground` | `#4E5D52` | Texto secundario (captions, descripciones) |
| `--border` / `--input` | `#D8CFE3` | Bordes y contornos de formularios (gris-lila suave, no estaba en la paleta indicada; derivado para separar superficies sin introducir un acento) |
| `--primary` | `#B6A5D0` | Botones y elementos destacados — ver "Ajustes de contraste" |
| `--secondary` | `#E8D9F7` | Superficie alternativa / botón secundario (lila muy claro, paleta de "toques") |
| `--accent` | `#647458` | Hover y estados interactivos — ver "Ajustes de contraste" |
| `--success` | `#8FAF8A` | Confirmaciones (pagado, confirmado, completado) |
| `--warning` | `= var(--primary)` | Alias intencional: ya no hay amarillo/naranja de alerta, ver más abajo |
| `--destructive` | sin cambios (rojo oklch existente) | Errores y acciones irreversibles reales — fuera del alcance de este rediseño |
| `--ring` | `= var(--primary)` | Foco de teclado/accesibilidad |

### Estados del flujo de venue/proveedores

| Token | Hex | Equivale a |
|---|---|---|
| `--state-exploring` | `#DCCCF2` | alias de `--card` |
| `--state-visited` | `#B6A5D0` | alias de `--primary` (ver ajuste de contraste) |
| `--state-favorite` | `#8FAF8A` | alias de `--success` |
| `--state-chosen` | `#3F5C4A` | color nuevo, sin alias |

Expuestos como utilidades Tailwind (`bg-state-exploring`,
`text-state-chosen-foreground`, etc.) para cuando exista una UI que
distinga estos cuatro pasos. Hoy no hay ningún tipo en `src/lib/types.ts`
con una etapa "favorita" distinta de "booked" (`VendorStatus` solo tiene
`considering | contacted | booked | declined`), así que estos tokens
están listos pero no forzados sobre ese enum — hacerlo sería un cambio de
producto, no de paleta. Mientras tanto, los badges de estado existentes
(`step-status-badge.tsx`, `vendors-list.tsx`, `guests-list.tsx`,
`budget-list.tsx`) ya heredan los nuevos colores sin tocar esos
componentes, porque solo usan clases `bg-success`/`bg-warning`/etc., no
hex propios.

`declined` (proveedor descartado) y `no asiste` (RSVP) siguen en
`--destructive` (rojo): son resultados negativos reales, no avisos de
dependencia entre secciones, así que quedan fuera de la petición de
"nada de alerta".

### Ajustes de contraste (AA, texto normal ≥4.5:1 / texto grande ≥3:1)

| Combinación real | Hex pedido | Ratio con el hex pedido | Ajuste | Hex final | Ratio final |
|---|---|---|---|---|---|
| Texto `#2E3D34` sobre botón primario | `#A894C7` | 4.22:1 (coincide con tu estimación de ~4,2:1) | Se aclaró ligeramente el mismo matiz (mismo tono/saturación HSL, +5% de luminosidad) | `#B6A5D0` | **5.06:1** ✅ |
| Texto blanco sobre acento secundario / hover | `#6B7C5E` | 4.50:1 (coincide con tu estimación de ~4,5:1, justo en el límite) | Se oscureció ligeramente el mismo matiz para dejar margen sobre el mínimo, en vez de quedarse justo en el borde | `#647458` | **5.03:1** ✅ |
| Texto `#2E3D34` sobre `--card` / `--state-exploring` | `#DCCCF2` (sin cambios) | — | ninguno | `#DCCCF2` | 7.62:1 ✅ |
| Texto `#2E3D34` sobre `--success` / `--state-favorite` | `#8FAF8A` (sin cambios) | — | ninguno | `#8FAF8A` | 4.73:1 ✅ |
| Texto blanco sobre `--state-chosen` | `#3F5C4A` (sin cambios) | — | ninguno | `#3F5C4A` | 7.39:1 ✅ |
| Texto `#2E3D34` sobre `--background` | `#F1EFE8` (sin cambios) | — | ninguno | `#F1EFE8` | 9.96:1 ✅ |
| `--muted-foreground` sobre `--card` | — | — | derivado para pasar AA sobre la superficie más oscura (`--card`, no solo `--background`) | `#4E5D52` sobre `#DCCCF2` | 4.64:1 ✅ (6.06:1 sobre `--background`) |
| `--secondary-foreground` sobre `--secondary` | `#E8D9F7` (sin cambios) | — | ninguno | `#2E3D34` sobre `#E8D9F7` | 8.57:1 ✅ |

Los dos ajustes reales (`--primary` y `--accent`) mantienen el matiz y la
familia de color pedidos — son el mismo lila y el mismo salvia, solo un
punto de luminosidad distinto — y por eso `--state-visited` (que alias a
`--primary`) también queda en 5.06:1 en vez del 4.22:1 original. El resto
de combinaciones ya cumplían con los hex exactos que diste.

### Color heredado sin tocar

`.dark` sigue con la paleta vieja de rosas (oklch). No hay ningún toggle
de tema oscuro ni `next-themes` integrado en la app — esa clase no se
aplica nunca hoy — así que no se han inventado valores oscuros para la
paleta lila/salvia sin que me los pidieras. Si se activa el modo oscuro,
hay que re-derivar `.dark` a partir de esta paleta.

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
