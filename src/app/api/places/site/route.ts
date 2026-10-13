import type { NextRequest } from "next/server";

import { fetchPublicHtml } from "@/lib/places/server/safe-fetch";
import { extractSiteInfo } from "@/lib/places/server/site-extract";
import { json, jsonError, requireUser } from "@/lib/places/server/http";

export async function GET(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

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
    return json(extractSiteInfo(page.html, page.finalUrl));
  } catch {
    return json({});
  }
}
