import "server-only";

import net from "node:net";

/** Parsea IPv6 (con o sin sufijo IPv4) a 8 grupos de 16 bits; null si no es válida. */
function parseIPv6(ip: string): number[] | null {
  const clean = ip.split("%")[0].toLowerCase();
  if (net.isIP(clean) !== 6) return null;
  let head = clean;
  const tail: number[] = [];
  const lastColon = clean.lastIndexOf(":");
  const maybeV4 = clean.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const o = maybeV4.split(".").map(Number);
    tail.push((o[0] << 8) | o[1], (o[2] << 8) | o[3]);
    head = clean.slice(0, lastColon + 1) + "0:0";
  }
  const [left, right] = head.split("::");
  const l = left ? left.split(":") : [];
  const r = right !== undefined && right ? right.split(":") : [];
  const fill = head.includes("::") ? 8 - l.length - r.length : 0;
  const groups = [...l, ...Array(fill).fill("0"), ...r].map((g) => parseInt(g, 16));
  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g))) return null;
  if (tail.length) {
    groups[6] = tail[0];
    groups[7] = tail[1];
  }
  return groups;
}

function isPrivateIPv4(a: number, b: number, c: number): boolean {
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local y metadatos (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24
    (a === 192 && b === 0 && c === 2) || // TEST-NET-1
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, reservado y broadcast
  );
}

/** true si la IP es privada, loopback, link-local, de metadatos o no enrutable públicamente. */
export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip.split("%")[0]);
  if (family === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return isPrivateIPv4(a, b, c);
  }
  if (family === 6) {
    const g = parseIPv6(ip);
    if (!g) return true;
    const embeddedV4 = (hi: number, lo: number) => isPrivateIPv4(hi >> 8, hi & 255, lo >> 8);
    if (g.every((x) => x === 0)) return true; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return embeddedV4(g[6], g[7]); // ::ffff:a.b.c.d
    if (g.slice(0, 6).every((x) => x === 0)) return true; // ::a.b.c.d (compatible IPv4, obsoleto)
    if (g[0] === 0x64 && g[1] === 0xff9b) return embeddedV4(g[6], g[7]); // NAT64
    if (g[0] === 0x2002) return embeddedV4(g[1], g[2]); // 6to4
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentación
    return false;
  }
  return true;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".private"];

/** Rechazo rápido por nombre antes de resolver DNS. */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h === "metadata" || h === "metadata.google.internal") return true;
  if (BLOCKED_HOST_SUFFIXES.some((s) => h.endsWith(s))) return true;
  const literal = h.startsWith("[") ? h.slice(1, -1) : h;
  if (net.isIP(literal)) return isBlockedIp(literal);
  // Formas numéricas raras (0x7f.1, 2130706433, 017700000001) que algunos resolutores aceptan como IPv4.
  if (/^[0-9a-fx.]+$/.test(h) && !h.includes("..") && /^\d|^0x/.test(h) && !/[g-z]/.test(h)) {
    if (/^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){0,3}$/.test(h)) return true;
  }
  return false;
}
