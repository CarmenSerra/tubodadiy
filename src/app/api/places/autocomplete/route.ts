import type { NextRequest } from "next/server";

import { GoogleError, googleFetch } from "@/lib/places/server/google";
import { json, jsonError, requireUser } from "@/lib/places/server/http";
import type { PlaceSuggestion } from "@/lib/places/types";

const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

interface AutocompleteResponse {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }[];
}

export async function GET(request: NextRequest) {
  const denied = await requireUser(request);
  if (denied) return denied;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (!SESSION_RE.test(session)) return jsonError(400, "missingSession");
  if (q.length < 2) return json({ suggestions: [] });

  try {
    const data = await googleFetch<AutocompleteResponse>("/places:autocomplete", {
      method: "POST",
      mask:
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text," +
        "suggestions.placePrediction.structuredFormat.mainText.text," +
        "suggestions.placePrediction.structuredFormat.secondaryText.text",
      body: { input: q, sessionToken: session, languageCode: "es", regionCode: "ES" },
    });
    const suggestions: PlaceSuggestion[] = [];
    for (const s of data.suggestions ?? []) {
      const p = s.placePrediction;
      if (!p?.placeId) continue;
      const primary = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      if (!primary) continue;
      suggestions.push({ placeId: p.placeId, primary, secondary: p.structuredFormat?.secondaryText?.text ?? "" });
    }
    return json({ suggestions });
  } catch (error) {
    if (error instanceof GoogleError) return jsonError(error.status, error.code);
    return jsonError(500, "searchFailed");
  }
}
