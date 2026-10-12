import "server-only";

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";

import { isBlockedHostname, isBlockedIp } from "./ip-guard";

export const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 4000;
// Muchas webs de proveedores devuelven 403 o una página vacía a bots; se identifica como un navegador normal.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface SafeFetchOptions {
  /** Solo para pruebas: permite IPs privadas (nunca se activa desde una ruta). */
  allowPrivate?: boolean;
  timeoutMs?: number;
}

export interface SafePage {
  html: string;
  finalUrl: URL;
}

/** Valida el esquema, el puerto, las credenciales y el nombre; lanza si no es seguro. */
export function assertPublicUrl(raw: string | URL, allowPrivate = false): URL {
  let url: URL;
  try {
    url = raw instanceof URL ? raw : new URL(raw);
  } catch {
    throw new Error("url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("scheme");
  if (url.username || url.password) throw new Error("credentials");
  if (!allowPrivate) {
    if (url.port && url.port !== "80" && url.port !== "443") throw new Error("port");
    if (isBlockedHostname(url.hostname)) throw new Error("host");
  }
  return url;
}

/** `lookup` para http(s).request: resuelve, comprueba TODAS las IPs y conecta solo a una validada (anti DNS rebinding). */
function guardedLookup(allowPrivate: boolean): net.LookupFunction {
  return (hostname, options, callback) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) return callback(err, "", 0);
      const list = addresses ?? [];
      if (!list.length || (!allowPrivate && list.some((a) => isBlockedIp(a.address)))) {
        return callback(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }), "", 0);
      }
      const pick = list.find((a) => a.family === 4) ?? list[0];
      if (options && (options as { all?: boolean }).all) {
        return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, [pick]);
      }
      callback(null, pick.address, pick.family);
    });
  };
}

function decoderFor(encoding: string | undefined): zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress | null {
  switch ((encoding ?? "").toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return zlib.createGunzip();
    case "deflate":
      return zlib.createInflate();
    case "br":
      return zlib.createBrotliDecompress();
    default:
      return null;
  }
}

function requestOnce(url: URL, deadline: number, allowPrivate: boolean) {
  return new Promise<{ status: number; location?: string; body: Buffer; contentType: string }>((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new Error("timeout"));
    const mod = url.protocol === "https:" ? https : http;
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const req = mod.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup(allowPrivate),
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "Upgrade-Insecure-Requests": "1",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === "string" ? res.headers.location : undefined;
        if (status >= 300 && status < 400) {
          res.resume();
          return done(() => resolve({ status, location, body: Buffer.alloc(0), contentType: "" }));
        }
        const type = String(res.headers["content-type"] ?? "").toLowerCase();
        if (type && !type.includes("html") && !type.includes("xml") && !type.startsWith("text/")) {
          res.destroy();
          return done(() => reject(new Error("content-type")));
        }
        const decoder = decoderFor(String(res.headers["content-encoding"] ?? ""));
        const source: NodeJS.ReadableStream = decoder ? res.pipe(decoder) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () =>
          done(() => {
            // Una web cortada por el límite de 1 MB (o con compresión truncada) vale con lo ya leído.
            if (chunks.length || (status >= 200 && status < 300)) resolve({ status, body: Buffer.concat(chunks), contentType: type });
            else reject(new Error("empty"));
          });
        source.on("data", (chunk: Buffer) => {
          const room = MAX_BYTES - size;
          if (chunk.length >= room) {
            chunks.push(chunk.subarray(0, room));
            size = MAX_BYTES;
            res.destroy();
            decoder?.destroy();
            finish();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        source.on("end", finish);
        source.on("error", finish);
        source.on("close", finish);
        res.on("error", finish);
      }
    );
    const timer = setTimeout(() => {
      req.destroy();
      done(() => reject(new Error("timeout")));
    }, remaining);
    req.on("error", (e) => done(() => reject(e)));
    req.end();
  });
}

/** Decodifica el cuerpo según el charset de la cabecera o del <meta>; utf-8 si no hay nada o no se reconoce. */
function decodeBody(body: Buffer, contentType: string): string {
  let charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1];
  if (!charset) charset = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(body.subarray(0, 4096).toString("latin1"))?.[1];
  const label = charset?.toLowerCase();
  if (!label || label === "utf-8" || label === "utf8") return body.toString("utf8");
  try {
    return new TextDecoder(label).decode(body);
  } catch {
    return body.toString("utf8");
  }
}

/** Sigue hasta 3 redirecciones validando cada salto. */
async function fetchChain(start: URL, deadline: number, allowPrivate: boolean): Promise<SafePage> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url, deadline, allowPrivate);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new Error("redirect");
      url = assertPublicUrl(new URL(res.location, url), allowPrivate);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`status ${res.status}`);
    return { html: decodeBody(res.body, res.contentType), finalUrl: url };
  }
  throw new Error("too many redirects");
}

/**
 * Descarga el HTML de una web pública con salvaguardas: solo http/https, sin IPs internas
 * (también tras redirecciones, máx. 3), 4 s en total y 1 MB como máximo.
 * Si una dirección http falla se reintenta una sola vez la misma por https (nunca al revés).
 * Lanza ante cualquier problema; quien llama decide qué devolver.
 */
export async function fetchPublicHtml(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafePage> {
  const allowPrivate = options.allowPrivate === true;
  const deadline = Date.now() + (options.timeoutMs ?? TOTAL_TIMEOUT_MS);
  const url = assertPublicUrl(rawUrl, allowPrivate);
  try {
    return await fetchChain(url, deadline, allowPrivate);
  } catch (err) {
    if (url.protocol !== "http:") throw err;
    const secure = new URL(url.href);
    secure.protocol = "https:";
    // Mismas comprobaciones (puerto, nombre, IP en el lookup) y mismo plazo total que el primer intento.
    return fetchChain(assertPublicUrl(secure, allowPrivate), deadline, allowPrivate);
  }
}
