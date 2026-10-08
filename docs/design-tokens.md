# Tokens de diseño

Fuente de verdad: `src/app/globals.css` (colores + escala tipográfica) y
`src/app/layout.tsx` (carga de fuentes). Este documento describe las
decisiones; los valores reales siempre viven en el CSS.

## Color

Paleta lila + verde salvia (sustituye a la anterior de rosas/crema, que se
parecía demasiado a Bodas.net). Definida como variables CSS en `:root`
dentro de `globals.css`, mapeadas a los tokens de Tailwind
(`--color-primary`, `--color-background`, etc.) vía `@theme inline`.
Los componentes consumen tokens, no hex (`bg-primary`,
`text-muted-foreground`, `bg-state-favorite`… y los de rol de más abajo).

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

### Tokens de rol y modo noche

Los componentes ya no llevan hex sueltos: usan variables CSS por **rol**
(`--page`, `--surface`, `--ink`, `--ink-muted`, `--line`, `--cta`,
`--lilac-soft`…) expuestas a Tailwind en `@theme inline`
(`bg-surface`, `text-ink`, `border-line`, `bg-cta text-on-cta`…). Hay dos
temas: el claro vive en `:root` de `globals.css` y el oscuro ("Gris
ciruela") en `html[data-theme="dark"]`, que sobrescribe las mismas variables.
El script del `<head>` (`src/lib/theme.ts`) fija `data-theme` antes de pintar
según `localStorage` (`tubodadiy-theme`: `"dark"` o ausente/cualquier otro valor
= claro); el botón luna/sol de las cabeceras lo cambia. No sigue la
preferencia del sistema. Cualquier otra clave antigua en `localStorage` se
ignora. Para SVG se usa `style={{ fill: "var(--…)" }}` (`var()` no vale en
atributos de presentación). `[data-theme="light"]` en un contenedor lo fija en
claro dentro del tema oscuro (página de impresión).

Los tokens shadcn de arriba (`--background`, `--card`, `--primary`…) siguen
en uso por `src/components/ui/*`; en modo noche se derivan de los de rol.
El antiguo bloque `.dark` (rosas, oklch) se eliminó.

#### Zonas lilas en oscuro

En claro, `--lilac-soft` (#ECE6F4) se distingue de las tarjetas (#F8F5F1). En
oscuro, un gris opaco igual que `--surface` (#474755) no destacaría, así que
`--lilac-soft` es **#D4C0EA translúcido al 12 %**: sobre la página da #4B4860 y
sobre una tarjeta #585667, siempre con matiz lila (y sirve igual para bandas,
avisos suaves, chips y el hover de filas). Dos tokens acompañan:

- `--lilac-flat`: el mismo relleno pero **opaco** (claro: `#ECE6F4`; oscuro:
  `#4B4860`). Para huecos de dibujos SVG (`Rings`) y avatares que se solapan,
  donde la transparencia dejaría ver lo de detrás.
- `--lilac-edge`: borde fino de las zonas lilas grandes (`ring-1 ring-lilac-edge`:
  banda de la landing y sus tarjetas, cuenta atrás, pestañas de fases, avisos
  suaves). Claro: `transparent`; oscuro: `#927AAC` al 50 %. Es un `ring`
  (box-shadow), no un `border`, para no cambiar el tamaño en claro.

El marcador de posición de proveedor usa `bg-lilac-soft`, por lo que en
oscuro se ve lila sobre el panel gris del proveedor.

#### Valores por tema

| Token | Claro | Oscuro | Rol |
|---|---|---|---|
| `--page` | `#F4F1EB` | `#38384D` | fondo de página |
| `--surface` | `#F8F5F1` | `#474755` | tarjetas, diálogos, menús |
| `--surface-alt` | `#F8F5F0` | `#474755` | cabecera, calendario, papel del sobre |
| `--field` | `#FFFFFF` | `#38384D` | fondo de inputs y casillas |
| `--panel` | `#FFFFFF` | `#474755` | panel grande claro sobre la página (Proveedores) |
| `--raised` | `#FFFFFF` | `#38384D` | chip, fila o tarjeta clara DENTRO de otra superficie |
| `--lilac-soft` | `#ECE6F4` | `rgb(212 192 234 / 0.12)` | banda/relleno lila suave, hover de filas |
| `--lilac-flat` | `#ECE6F4` | `#4B4860` | = --lilac-soft, siempre opaco (huecos SVG, avatares solapados) |
| `--lilac-edge` | `transparent` | `rgb(146 122 172 / 0.5)` | borde fino de las zonas lilas grandes (solo en oscuro) |
| `--lilac-mid` | `#DECDF1` | `#586C64` | avatar, icono, chip lila |
| `--btn-soft` | `#D4C0EA` | `#586C64` | botón secundario y su hover |
| `--track` | `#E5DDEC` | `#586C64` | carriles de progreso, esqueletos |
| `--rail` | `#D4C0EA` | `#586C64` | línea del cronograma, puntos inactivos |
| `--sage-pale` | `#D2D7CB` | `#586C64` | chip salvia, hover claro |
| `--sage-light` | `#BCC7B5` | `#586C64` | borde salvia |
| `--scrim` | `color-mix(in oklab, #26413c 40%, transparent)` | `color-mix(in oklab, #38384d 85%, transparent)` | velo tras diálogos |
| `--line` | `#E5DDEC` | `#586C64` | bordes y separadores |
| `--line-strong` | `#D4C0EA` | `#586C64` | bordes de campos y chips |
| `--ink` | `#26413C` | `#F4F1EB` | texto principal |
| `--ink-strong` | `#102D28` | `#F8F5F0` | texto sobre tarjetas, títulos |
| `--ink-muted` | `#586C64` | `#D2D7CB` | texto secundario |
| `--ink-placeholder` | `#677775` | `#D2D7CB` | placeholders |
| `--ink-ghost` | `#5E696B` | `#D2D7CB` | enlace fantasma de la cabecera (landing) |
| `--ink-on-tint` | `#474755` | `#F4F1EB` | iconos/iniciales sobre rellenos lila/salvia |
| `--ink-on-lilac` | `#38384D` | `#F4F1EB` | texto sobre botón suave y chips activos |
| `--on-sage` | `#26413C` | `#102D28` | texto sobre rellenos salvia |
| `--lilac` | `#927AAC` | `#D4C0EA` | iconos, bordes y subrayados lila |
| `--lilac-bright` | `#A38ED2` | `#D4C0EA` | lila vivo: foco, puntos, trazo del logo |
| `--brand` | `#907AB2` | `#D4C0EA` | logotipo |
| `--cta` | `#927AAC` | `#D4C0EA` | botón principal |
| `--on-cta` | `#FFFFFF` | `#38384D` | texto sobre botón principal |
| `--green` | `#4E6A5A` | `#BCC7B5` | verde de texto, trazo y enlaces |
| `--green-solid` | `#4E6A5A` | `#8FAF8A` | relleno verde (casilla marcada, paso hecho) |
| `--deep` | `#3F5C4A` | `#8FAF8A` | verde profundo: "Elegida", icono de éxito |
| `--sage` | `#8FAF8A` | `#8FAF8A` | salvia: confirmado, progreso completado |
| `--on-solid` | `#FFFFFF` | `#102D28` | texto sobre rellenos verdes y destructivo |
| `--danger` | `#9F3A38` | `#F2ADAA` | texto, borde y foco destructivos |
| `--danger-solid` | `#9F3A38` | `#F2ADAA` | fondo del botón destructivo |

Decoración (landing, bienvenida, onboarding):

| Token | Claro | Oscuro |
|---|---|---|
| `--deco-lilac-soft` | `#E5DDEC` | `#474755` |
| `--deco-lilac` | `#DECDF1` | `#474755` |
| `--deco-sage-soft` | `#D2D7CB` | `#474755` |
| `--deco-sage` | `#BCC7B5` | `#586C64` |
| `--deco-heart` | `#D4C0EA` | `#927AAC` |
| `--deco-line` | `#927AAC` | `#927AAC` |
| `--deco-line-bright` | `#A38ED2` | `#A38ED2` |
| `--deco-green` | `#4E6A5A` | `#4E6A5A` |
| `--deco-sage-line` | `#8FAF8A` | `#8FAF8A` |
| `--script-accent` | `#6B7C5E` | `#8FAF8A` |

Fondo fijo de la app autenticada (`src/components/brand/app-backdrop.tsx`,
montado en `src/app/(app)/layout.tsx`; no aparece en la landing ni en
`(print)`). Manchas lila/salvia y dibujos de línea fina con `position: fixed`
detrás del contenido; son semitransparentes para dejarse ver sobre `--page` y
quedar por debajo de las tarjetas (`bg-surface`). Bajo contraste a propósito:

| Token | Claro | Oscuro |
|---|---|---|
| `--bd-lilac` (mancha) | `rgb(222 205 241 / .42)` | `rgb(212 192 234 / .09)` |
| `--bd-sage` (mancha) | `rgb(188 199 181 / .36)` | `rgb(143 175 138 / .09)` |
| `--bd-line` (trazo lila) | `rgb(146 122 172 / .4)` | `rgb(163 142 210 / .3)` |
| `--bd-line-sage` (trazo salvia) | `rgb(111 145 106 / .5)` | `rgb(143 175 138 / .3)` |

#### Contraste del tema oscuro (texto normal ≥ 4,5:1)

| Combinación | Ratio |
|---|---|
| `--ink` #F4F1EB sobre `--page` / `--surface` | 10,12 / 8,10 |
| `--ink` sobre `--lilac-soft` (sobre página #4B4860 / sobre tarjeta #585667) | 7,78 / 6,33 |
| `--ink-strong` sobre `--lilac-soft` sobre página | 8,06 |
| `--ink-muted` #D2D7CB sobre `--lilac-soft` sobre página / sobre tarjeta | 5,98 / 4,87 |
| `--ink` sobre `--lilac-soft` apilado (fila con hover + chip, #676377) | 5,13 |
| `--ink-muted` sobre `--lilac-soft` apilado | 3,95 — por eso la insignia «No asiste» usa `dark:text-ink` |
| `--ink` sobre `--lilac-flat` (+N de avatares) | 7,78 |
| `--ink-muted` / `--ink-strong` sobre `--surface` (tarjetas de la landing) | 6,23 / 8,39 |

Los trazos decorativos (icono del marcador de proveedor, anillos) solo
necesitan 3:1 y no son texto.

## Tema «Luna de miel» (tropical)

La ruta `/plan/[planId]/honeymoon` tiene su propia piel: azules de mar, verdes de
palmera y blanco roto (claro) o noche tropical de mar profundo (oscuro). No es un
tema nuevo de la app, sino un **ámbito**: la clase `.theme-honeymoon` redefine los
**mismos tokens de rol** (`--page`, `--surface`, `--ink`, `--cta`, `--lilac`…), así que
cabecera, pestañas, diálogos, avisos y los componentes existentes se re-visten solos.

- **Dónde vive:** bloque delimitado «LUNA DE MIEL (tema tropical)» en `src/app/globals.css`
  (antes de `@theme inline`). `.theme-honeymoon` es el claro; `html[data-theme="dark"] .theme-honeymoon`
  el oscuro (sigue mandando `tubodadiy-theme` en `localStorage`). Un tercer selector
  re-deriva los tokens shadcn (`--background`, `--card`, `--primary`, `--ring`…) a partir
  de los de rol, porque el tema oscuro los resuelve en `<html>` y se heredarían ya calculados.
- **Quién lo aplica:** `src/components/brand/app-frame.tsx` (montado en `src/app/(app)/layout.tsx`).
  Por `usePathname` (`isHoneymoonPath`, en `src/lib/honeymoon-model.ts`) pone la clase al
  contenedor de la app y sustituye `AppBackdrop` por `HoneymoonBackdrop`; el resto de rutas
  no cambia. También la pone en `<body>` mientras se está en la ruta, para que lo que Radix
  pinta en un portal (diálogos, desplegables) y los avisos hereden la paleta.
- **Dibujos:** `src/components/honeymoon/motifs.tsx` (sol/luna, estrellas, nubes, palmera,
  hojas, hibisco, montañas, olas, avión con estela punteada y escenas para miniaturas) y
  `honeymoon-backdrop.tsx` (fondo fijo). SVG en línea con tokens `--hm-*`:

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--hm-sky-top` / `-mid` / `-bottom` | `#CFEAF1` / `#E3F3EF` / `#F3F2E9` | `#061A26` / `#0A2A38` / `#0E3A45` | degradado del cielo |
| `--hm-sun`, `--hm-sun-glow`, `--hm-sun-ray` | `#FFD37A`, ámbar translúcido | luna `#EEF3DC`, rayos transparentes | sol / luna |
| `--hm-star` | transparente | `rgb(230 245 240 / .75)` | estrellas (solo de noche) |
| `--hm-cloud` | blanco al 85 % | `rgb(160 205 210 / .12)` | nubes |
| `--hm-mtn-far`, `-near`, `-shade`, `--hm-hill` | `#B4D8D3`, `#94C9B8`, `#84BBA9`, `#7CC0A2` | `#134552`, `#0F3B46`, `#0C323C`, `#0B3A3B` | relieve |
| `--hm-sea`, `--hm-sea-deep`, `--hm-foam`, `--hm-sand` | `#9AD8DD`, `#6CC0CC`, blanco 80 %, `#EFE4C6` | `#0F4A58`, `#0B3D4A`, `rgb(160 220 215 / .28)`, `#1C4A4A` | mar y arena |
| `--hm-palm`, `-palm-dark`, `--hm-trunk`, `--hm-leaf`, `--hm-flower` | `#3B9A72`, `#26785A`, `#B59A6A`, `#5DB487`, `#F08A7E` | `#14604B`, `#0E4A3B`, `#3B4D45`, `#17694F`, `#D9786F` | vegetación |
| `--hm-trail`, `--hm-plane`, `--hm-plane-edge` | `rgb(11 111 140 / .55)`, `#FFFFFF`, `#0B6F8C` | `rgb(127 224 214 / .55)`, `#EAF6F2`, `#7FE0D6` | avión y estela |
| `--hm-hero-from` / `-to` | `#D4EEF0` / `#F1F3E4` | `#0F3A47` / `#123F49` | banner (lleva texto) |

Roles de rol que cambian (claro / oscuro): `--page` `#F3F2E9` / `#0A2630`; `--surface` `#FBFAF4` / `#10333F`;
`--ink` `#0D3B47` / `#F1F6EE`; `--ink-muted` `#44646B` / `#BCD8D5`; `--cta` `#0B6F8C` (texto blanco) / `#5CCFC4`
(texto `#06262C`); `--lilac` (acento de iconos y foco) `#0E7D97` / `#6FD6CC`; `--green` `#1A6B4C` / `#A4E0B8`;
`--deep` (destino «Elegido») `#16623F` / `#5FC58E`. En esta piel «lila» significa azul océano: los nombres de rol no cambian.

Contraste (texto normal ≥ 4,5:1; medido con los valores finales):

| Combinación | Claro | Oscuro |
|---|---|---|
| `--ink` sobre `--page` / `--surface` | 10,8 / 11,6 | 14,4 / 12,2 |
| `--ink-muted` sobre `--surface` / `--lilac-soft` / `--lilac-mid` | 6,1 / 5,4 / 4,8 | 8,9 / 6,7 / 5,5 |
| `--on-cta` sobre `--cta` | 5,7 | 8,5 |
| `--on-solid` sobre `--green-solid` | 5,3 | 7,9 |
| `--on-done` / `--on-done-muted` sobre `--done` | 6,2 / 5,5 | 6,2 / 5,6 |
| `--danger` sobre `--surface` | 6,5 | 7,8 |

Las tarjetas de la página son opacas y el texto nunca se apoya directamente en los dibujos del
fondo. Las animaciones suaves (`hm-sway`, `hm-drift`, `hm-bob`) solo corren con
`prefers-reduced-motion: no-preference`.

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
