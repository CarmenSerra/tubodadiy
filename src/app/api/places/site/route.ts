import type { NextRequest } from "next/server";

import { fetchPublicHtml } from "@/lib/places/server/safe-fetch";
import { extractSiteInfo } from "@/lib/places/server/site-extract";
import { authenticate, json, jsonError } from "@/lib/places/server/http";
import { saveLookupEmail } from "@/lib/places/server/lookups";

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if ("denied" in auth) return auth.denied;

  const raw = (request.nextUrl.searchParams.get("url") ?? "").trim();
  if (!raw || raw.length > 2048) return jsonError(400, "webRequired");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return jsonError(400, "webInvalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return jsonError(400, "webProtocol");
  }

  // Best effort: un fallo del sitio (DNS, timeout, bloqueo, HTML raro) nunca es un error del servidor.
  try {
    const page = await fetchPublicHtml(url.href);
    const info = extractSiteInfo(page.html, page.finalUrl);
    // Si viene de un lugar de Google que esta persona ya consultó, se anota el email en lo guardado.
    const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
    if (info.email && placeId) await saveLookupEmail(auth.uid, placeId, info.email);
    return json(info);
  } catch {
    return json({});
  }
}
