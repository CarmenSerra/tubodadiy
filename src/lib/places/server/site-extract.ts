import "server-only";

const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const EMAIL_IN_TEXT_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const JUNK_EMAIL =
  /(^|[._-])(example|ejemplo|sentry|wixpress|test|noreply|no-reply|donotreply)([._@-]|$)|\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|map|woff2?|ttf|eot)$|^(user|usuario|name|nombre|email|tucorreo|tu-email|youremail)@|@(dominio|tudominio|tu-dominio|midominio|yourdomain|domain|email|correo|tucorreo)\.[a-z]+$|@(sentry\.io|wix\.com|wixpress\.com|squarespace\.com|godaddy\.com|wordpress\.(org|com)|schema\.org|w3\.org)$|@\d+x(\.|$)/i;

const MAX_URL_LENGTH = 2048;
/** Etiqueta HTML con comillas que pueden contener ">" (a diferencia de `<img[^>]*>`). */
const TAG_BODY = `(?:"[^"]*"|'[^']*'|[^'">])*`;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  commat: "@",
  period: ".",
  colon: ":",
  sol: "/",
  num: "#",
};

function safeChar(code: number): string {
  try {
    return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  } catch {
    return "";
  }
}

/** Una sola pasada, para que `&amp;lt;` no acabe convertido en `<`. */
function decodeEntities(value: string): string {
  return value.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (all, hex?: string, dec?: string, name?: string) => {
    if (hex) return safeChar(parseInt(hex, 16));
    if (dec) return safeChar(parseInt(dec, 10));
    return NAMED_ENTITIES[(name ?? "").toLowerCase()] ?? all;
  });
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  const body = tag.replace(/^<[\w:-]+/, "");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    attrs[m[1].toLowerCase()] ??= decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function tagsOf(html: string, names: string): string[] {
  return Array.from(html.matchAll(new RegExp(`<(?:${names})\\b${TAG_BODY}>`, "gi")), (m) => m[0]);
}

/* ------------------------------------------------------------------ correo */

function cleanEmail(raw: string): string | undefined {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // se usa tal cual
  }
  value = value
    .replace(/^mailto:/i, "")
    .split(/[?,;\s<>]/)[0]
    .trim()
    .replace(/^[._%+-]+/, "")
    .toLowerCase();
  if (!value || value.length > 120 || !EMAIL_RE.test(value) || JUNK_EMAIL.test(value)) return undefined;
  return value;
}

/** Cloudflare "email protection": el primer byte es la clave XOR del resto. */
function decodeCfEmail(hex: string): string | undefined {
  if (!/^(?:[0-9a-f]{2}){3,}$/i.test(hex)) return undefined;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

function emailsFromJsonLd(node: unknown, out: string[], depth = 0): void {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) emailsFromJsonLd(item, out, depth + 1);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === "email") {
      for (const v of Array.isArray(value) ? value : [value]) {
        const email = typeof v === "string" ? cleanEmail(v) : undefined;
        if (email) out.push(email);
      }
    } else if (typeof value === "object") {
      emailsFromJsonLd(value, out, depth + 1);
    }
  }
}

/** Texto visible aproximado: sin scripts, estilos ni comentarios, con las etiquetas como espacios. */
function visibleText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[a-z/!][^>]*>/gi, " ");
  return decodeEntities(text)
    .replace(/\s*[[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@") // "info [at] dominio.es"
    .replace(/\s*[[(]\s*(?:dot|punto)\s*[\])]\s*/gi, ".");
}

function pickEmail(mailto: string[], jsonLd: string[], text: string[], host: string): string | undefined {
  const all = [...mailto, ...jsonLd, ...text];
  if (!all.length) return undefined;
  const base = host.replace(/^www\./, "");
  const sameSite = (e: string) => {
    const domain = e.split("@")[1];
    return domain === base || domain.endsWith(`.${base}`) || base.endsWith(`.${domain}`);
  };
  return all.find(sameSite) ?? all[0];
}

function extractEmail(html: string, jsonLdBlobs: unknown[], pageUrl: URL): string | undefined {
  const mailto: string[] = [];
  for (const tag of tagsOf(html, "a|area")) {
    const attrs = parseAttrs(tag);
    const href = attrs.href;
    if (href && /^\s*mailto:/i.test(href)) {
      const email = cleanEmail(href);
      if (email) mailto.push(email);
    }
  }
  const text: string[] = [];
  const cf = [
    ...Array.from(html.matchAll(/data-cfemail\s*=\s*["']?([0-9a-f]+)/gi), (m) => m[1]),
    ...Array.from(html.matchAll(/email-protection#([0-9a-f]+)/gi), (m) => m[1]),
  ];
  for (const hex of cf) {
    const decoded = decodeCfEmail(hex);
    const email = decoded ? cleanEmail(decoded) : undefined;
    if (email) mailto.push(email);
  }

  const jsonLd: string[] = [];
  for (const blob of jsonLdBlobs) emailsFromJsonLd(blob, jsonLd);

  for (const m of visibleText(html).matchAll(EMAIL_IN_TEXT_RE)) {
    const email = cleanEmail(m[0]);
    if (email) text.push(email);
  }
  return pickEmail(mailto, jsonLd, text, pageUrl.hostname);
}

/* ------------------------------------------------------------------ imagen */

function jsonLdBlobsOf(html: string): unknown[] {
  const blobs: unknown[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      // Algunos plugins envuelven el JSON en CDATA o comentarios.
      blobs.push(JSON.parse(m[1].replace(/^\s*(<!--|\/\*<!\[CDATA\[\*\/|<!\[CDATA\[)/, "").replace(/(-->|\/\*\]\]>\*\/|\]\]>)\s*$/, "").trim()));
    } catch {
      // JSON-LD mal formado
    }
  }
  return blobs;
}

type JsonObject = Record<string, unknown>;

function isObject(v: unknown): v is JsonObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Todos los nodos con @id (Yoast y similares enlazan `{"@id": "..."}` a un nodo del @graph). */
function indexById(node: unknown, map: Map<string, JsonObject>, depth = 0): void {
  if (depth > 10 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) indexById(item, map, depth + 1);
    return;
  }
  const obj = node as JsonObject;
  const id = obj["@id"];
  if (typeof id === "string" && Object.keys(obj).length > 1 && !map.has(id)) map.set(id, obj);
  for (const value of Object.values(obj)) indexById(value, map, depth + 1);
}

const JSONLD_SKIP_KEYS = new Set(["author", "review", "reviews", "reviewer", "comment", "creator", "employee", "member", "founder"]);
const JSONLD_IMAGE_KEYS = new Set(["image", "images", "photo", "photos", "primaryimageofpage", "thumbnailurl", "thumbnail"]);

/** Strings de imagen de un valor JSON-LD: string, array, ImageObject (`url`/`contentUrl`) o referencia por @id. */
function imageUrlsOf(value: unknown, ids: Map<string, JsonObject>, out: string[], depth = 0): void {
  if (depth > 6 || value === null || value === undefined) return;
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) imageUrlsOf(item, ids, out, depth + 1);
  } else if (isObject(value)) {
    const direct = value.url ?? value.contentUrl ?? value.contenturl;
    if (direct !== undefined) {
      imageUrlsOf(direct, ids, out, depth + 1);
      return;
    }
    const ref = typeof value["@id"] === "string" ? ids.get(value["@id"]) : undefined;
    if (ref && ref !== value) imageUrlsOf(ref.url ?? ref.contentUrl, ids, out, depth + 1);
  }
}

function collectJsonLdImages(node: unknown, ids: Map<string, JsonObject>, images: string[], logos: string[], depth = 0): void {
  if (depth > 10 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdImages(item, ids, images, logos, depth + 1);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    const k = key.toLowerCase();
    if (JSONLD_SKIP_KEYS.has(k)) continue;
    if (k === "logo") {
      imageUrlsOf(value, ids, logos);
    } else if (JSONLD_IMAGE_KEYS.has(k)) {
      const found: string[] = [];
      imageUrlsOf(value, ids, found);
      // Yoast pone el logo de la organización también como "image": va con los logos.
      for (const url of found) (LOGO_LIKE.test(safePath(url)) ? logos : images).push(url);
    } else if (typeof value === "object") {
      collectJsonLdImages(value, ids, images, logos, depth + 1);
    }
  }
}

function safePath(raw: string): string {
  try {
    const u = new URL(raw, "https://x.invalid/");
    return `${u.pathname}${u.search}`;
  } catch {
    return raw;
  }
}

/** Resuelve contra la base y deja solo http(s) razonables; sin data:, javascript: ni cadenas absurdas. */
function toAbsoluteUrl(raw: string | undefined, base: URL): string | undefined {
  if (!raw) return undefined;
  const value = raw.replace(/[\t\r\n]/g, "").trim();
  if (!value || value.length > MAX_URL_LENGTH || /^(data|javascript|blob|about|mailto|tel):/i.test(value)) return undefined;
  try {
    const abs = new URL(value, base);
    if ((abs.protocol !== "http:" && abs.protocol !== "https:") || abs.href.length > MAX_URL_LENGTH) return undefined;
    return abs.href;
  } catch {
    return undefined;
  }
}

/** Nombre de archivo o ruta que delata un logo, icono, sprite, píxel o marcador de carga. */
const JUNK_NAME =
  /(^|[/_.=-])(logo|logos|logotipo|logotype|icon|icons|icono|iconos|favicon|sprite|sprites|spacer|pixel|blank|placeholder|loading|loader|lazy|avatar|gravatar|emoji|emojis|badge|btn|button|arrow|flecha|social|whatsapp|facebook|instagram|twitter|youtube|tripadvisor|bodas-net|payment|captcha|tracking|counter|1x1)(\d*)([/_.=?&-]|$)/i;
const LOGO_LIKE = /(^|[/_.=-])(logo|logos|logotipo|logotype|brand)([/_.=?&-]|$)/i;
const JUNK_HOST = /(^|\.)(facebook\.com|doubleclick\.net|google-analytics\.com|googletagmanager\.com|gravatar\.com|pixel\.wp\.com|stats\.wp\.com|s\.w\.org)$/i;
const JUNK_ATTR = /(^|[\s_-])(logo|icon|avatar|emoji|sprite|brand|favicon|custom-logo|site-logo)([\s_-]|$)/i;

function hasJunkExtension(url: URL): boolean {
  return /\.(svg|gif|ico|cur|bmp|tiff?)$/i.test(url.pathname) || /[?&](format|fm)=(svg|gif)/i.test(url.search);
}

/** Anchura aproximada que insinúa el propio nombre/URL (WordPress `-300x200`, Wix `w_980`, `?w=300`). */
function widthHintFromUrl(url: URL): number | undefined {
  const wp = /-(\d{2,4})x(\d{2,4})\.[a-z]{3,4}$/i.exec(url.pathname);
  if (wp) return parseInt(wp[1], 10);
  const wix = /[/,]w_(\d{2,4})\b/.exec(url.pathname);
  if (wix) return parseInt(wix[1], 10);
  const q = /[?&](?:w|width)=(\d{2,4})\b/i.exec(url.search);
  if (q) return parseInt(q[1], 10);
  return undefined;
}

function pxValue(raw: string | undefined): number | undefined {
  if (!raw || /%|auto|em|vw|vh/i.test(raw)) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

interface SrcsetEntry {
  url: string;
  weight: number;
}

/** Parser de srcset que tolera comas dentro de la URL (Wix/Cloudinary: `w_800,h_600`). */
function parseSrcset(raw: string): SrcsetEntry[] {
  const out: SrcsetEntry[] = [];
  let rest = raw.trim();
  while (rest) {
    const m = /^(\S+)\s*/.exec(rest);
    if (!m) break;
    let url = m[1];
    rest = rest.slice(m[0].length);
    let weight = 0;
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      const d = /^(\d+(?:\.\d+)?)([wx])\s*(?:,\s*|$)/i.exec(rest);
      if (d) {
        weight = parseFloat(d[1]) * (d[2].toLowerCase() === "x" ? 1000 : 1);
        rest = rest.slice(d[0].length);
      } else {
        rest = rest.replace(/^,\s*/, "");
      }
    }
    if (url) out.push({ url, weight });
  }
  return out;
}

const LAZY_SRC_ATTRS = ["data-src", "data-lazy-src", "data-original", "data-lazy", "data-large_image", "data-orig-file", "data-full-url", "data-image", "src"];
const SRCSET_ATTRS = ["srcset", "data-srcset", "data-lazy-srcset"];

/** Candidata "de contenido" de una <img>/<source>, o undefined si es pequeña, decorativa o inutilizable. */
function contentImageOf(tag: string, base: URL): string | undefined {
  const a = parseAttrs(tag);
  const isSource = /^<source/i.test(tag);
  if (isSource && /svg/i.test(a.type ?? "")) return undefined;
  if (!isSource && (JUNK_ATTR.test(a.class ?? "") || JUNK_ATTR.test(a.id ?? "") || /\blogo\b/i.test(a.alt ?? ""))) return undefined;
  if (/^(presentation|none)$/i.test(a.role ?? "") && !isSource) return undefined;

  let chosen: string | undefined;
  let weight = 0;
  for (const attr of SRCSET_ATTRS) {
    const entries = parseSrcset(a[attr] ?? "");
    for (const e of entries) {
      const abs = toAbsoluteUrl(e.url, base);
      if (abs && (!chosen || e.weight > weight)) {
        chosen = abs;
        weight = e.weight;
      }
    }
  }
  if (!chosen && !isSource) {
    for (const attr of LAZY_SRC_ATTRS) {
      const abs = toAbsoluteUrl(a[attr], base);
      if (abs) {
        chosen = abs;
        break;
      }
    }
  }
  if (!chosen) return undefined;

  const url = new URL(chosen);
  if (hasJunkExtension(url) || JUNK_HOST.test(url.hostname) || JUNK_NAME.test(`${url.pathname}${url.search}`)) return undefined;

  const width = pxValue(a.width);
  const height = pxValue(a.height);
  if (width !== undefined && width < 200) return undefined;
  if (height !== undefined && height < 120) return undefined;
  if (width !== undefined && height !== undefined && (width * height < 40000 || width / height > 5 || height / width > 5)) return undefined;
  const hint = widthHintFromUrl(url);
  if (hint !== undefined && hint < 200 && !(weight >= 200)) return undefined;
  if (weight > 0 && weight < 200) return undefined; // srcset cuyo mayor tamaño es una miniatura
  return chosen;
}

/** Elimina lo que no es contenido principal: comentarios, scripts, estilos, plantillas, menús y pies de página. */
function contentHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(footer|nav)\b[\s\S]*?<\/\1\s*>/gi, " ");
}

function backgroundImageOf(html: string, base: URL): string | undefined {
  if (!/url\(/i.test(html)) return undefined;
  for (const tag of tagsOf(html, "[a-z][\\w:-]*")) {
    if (!/url\(/i.test(tag)) continue;
    const a = parseAttrs(tag);
    for (const value of [a.style, a["data-bg"], a["data-background"], a["data-background-image"], a["data-bg-url"]]) {
      if (!value) continue;
      const raw = /url\(\s*(["']?)([^"')]+)\1\s*\)/i.exec(value)?.[2] ?? (value === a.style ? undefined : value);
      const abs = raw && /\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(raw.trim()) ? toAbsoluteUrl(raw, base) : undefined;
      if (!abs) continue;
      const url = new URL(abs);
      if (JUNK_NAME.test(`${url.pathname}${url.search}`) || JUNK_HOST.test(url.hostname)) continue;
      const hint = widthHintFromUrl(url);
      if (hint !== undefined && hint < 200) continue;
      return abs;
    }
  }
  return undefined;
}

function isUsableMetaImage(abs: string | undefined): abs is string {
  if (!abs) return false;
  return !/\.(ico|cur)$/i.test(new URL(abs).pathname);
}

function extractImage(html: string, jsonLdBlobs: unknown[], pageUrl: URL): string | undefined {
  // <base href> cambia cómo se resuelven las rutas relativas.
  let base = pageUrl;
  const baseTag = tagsOf(html, "base")[0];
  if (baseTag) {
    const resolved = toAbsoluteUrl(parseAttrs(baseTag).href, pageUrl);
    if (resolved) base = new URL(resolved);
  }

  // 1. Open Graph / Twitter (con itemprop="image" de microdatos como último recurso del bloque).
  const metas = tagsOf(html, "meta").map(parseAttrs);
  for (const key of ["og:image", "og:image:secure_url", "og:image:url", "twitter:image", "twitter:image:src", "image"]) {
    for (const a of metas) {
      const prop = (a.property ?? a.name ?? a.itemprop ?? "").toLowerCase();
      if (prop !== key) continue;
      const abs = toAbsoluteUrl(a.content, base);
      if (isUsableMetaImage(abs)) return abs;
    }
  }

  // 2. JSON-LD: imágenes primero, logos solo si no hay otra cosa dentro de JSON-LD.
  const ids = new Map<string, JsonObject>();
  for (const blob of jsonLdBlobs) indexById(blob, ids);
  const images: string[] = [];
  const logos: string[] = [];
  for (const blob of jsonLdBlobs) collectJsonLdImages(blob, ids, images, logos);
  for (const raw of [...images, ...logos]) {
    const abs = toAbsoluteUrl(raw, base);
    if (isUsableMetaImage(abs)) return abs;
  }

  // 3. <link rel="image_src" href="...">
  for (const tag of tagsOf(html, "link")) {
    const a = parseAttrs(tag);
    if (/(^|\s)image_src(\s|$)/i.test(a.rel ?? "")) {
      const abs = toAbsoluteUrl(a.href, base);
      if (isUsableMetaImage(abs)) return abs;
    }
  }

  // 4. Primera imagen "grande" del contenido (lazy-load y srcset incluidos), y si no, un fondo CSS.
  const content = contentHtml(html);
  for (const tag of tagsOf(content, "img|source")) {
    const found = contentImageOf(tag, base);
    if (found) return found;
  }
  // Los apple-touch-icon / favicon se descartan a propósito: son iconos, no fotos del proveedor.
  return backgroundImageOf(content, base);
}

/** Email (mailto, JSON-LD, texto) e imagen principal absolutizada de una página; best effort. */
export function extractSiteInfo(html: string, pageUrl: URL): { email?: string; image?: string } {
  const result: { email?: string; image?: string } = {};
  const blobs = jsonLdBlobsOf(html);
  try {
    const email = extractEmail(html, blobs, pageUrl);
    if (email) result.email = email;
  } catch {
    // un HTML raro no debe impedir la imagen
  }
  try {
    const image = extractImage(html, blobs, pageUrl);
    if (image) result.image = image;
  } catch {
    // ídem
  }
  return result;
}
