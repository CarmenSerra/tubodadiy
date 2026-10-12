import "server-only";

const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const JUNK_EMAIL = /(^|[._-])(example|ejemplo|sentry|wixpress|test|noreply|no-reply|donotreply)([._@-]|$)|\.(png|jpe?g|gif|webp|svg)$|^(user|usuario|name|nombre|email|tucorreo|tu-email|youremail)@/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeChar(parseInt(d, 10)));
}

function safeChar(code: number): string {
  try {
    return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  } catch {
    return "";
  }
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag.replace(/^<\w+/, "")))) {
    attrs[m[1].toLowerCase()] ??= decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function cleanEmail(raw: string): string | undefined {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // se usa tal cual
  }
  value = value.replace(/^mailto:/i, "").split(/[?,;\s]/)[0].trim().toLowerCase();
  if (!value || value.length > 120 || !EMAIL_RE.test(value) || JUNK_EMAIL.test(value)) return undefined;
  return value;
}

function emailsFromJsonLd(node: unknown, out: string[], depth = 0): void {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) emailsFromJsonLd(item, out, depth + 1);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.toLowerCase() === "email" && typeof value === "string") {
      const email = cleanEmail(value);
      if (email) out.push(email);
    } else if (typeof value === "object") {
      emailsFromJsonLd(value, out, depth + 1);
    }
  }
}

function pickEmail(candidates: string[], host: string): string | undefined {
  if (!candidates.length) return undefined;
  const base = host.replace(/^www\./, "");
  return candidates.find((e) => e.endsWith(`@${base}`) || base.endsWith(`.${e.split("@")[1]}`)) ?? candidates[0];
}

/** Email (mailto: o JSON-LD) y og:image absolutizada de una página; best effort. */
export function extractSiteInfo(html: string, pageUrl: URL): { email?: string; image?: string } {
  const result: { email?: string; image?: string } = {};

  const jsonLdEmails: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      emailsFromJsonLd(JSON.parse(m[1].trim()), jsonLdEmails);
    } catch {
      // JSON-LD mal formado
    }
  }
  const mailtoEmails: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = parseAttrs(m[0]).href;
    if (href && /^\s*mailto:/i.test(href)) {
      const email = cleanEmail(href);
      if (email) mailtoEmails.push(email);
    }
  }
  const email = pickEmail([...mailtoEmails, ...jsonLdEmails], pageUrl.hostname);
  if (email) result.email = email;

  let image: string | undefined;
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = parseAttrs(m[0]);
    const prop = (a.property ?? a.name ?? "").toLowerCase();
    if (!a.content) continue;
    if (prop === "og:image" || prop === "og:image:url" || prop === "og:image:secure_url") {
      image = a.content;
      break;
    }
    if (!image && prop === "twitter:image") image = a.content;
  }
  if (image) {
    try {
      const abs = new URL(image.trim(), pageUrl);
      if ((abs.protocol === "http:" || abs.protocol === "https:") && abs.href.length <= 2048) result.image = abs.href;
    } catch {
      // URL de imagen no válida
    }
  }
  return result;
}
