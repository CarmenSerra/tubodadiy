/** Datos que guardamos de un lugar de Google (nunca coordenadas ni fotos). */
export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  municipality: string;
  province: string;
  community: string;
  country: string;
  primaryType: string;
  /** Email extraído de la web del lugar (solo si ya se consultó antes; si no, se pide a /api/places/site). */
  email?: string;
}

/** Resultado de la búsqueda de recintos (lista, solo lectura). */
export interface VenueResult {
  placeId: string;
  name: string;
  municipality: string;
  province: string;
  rating?: number;
  primaryType: string;
}

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
}
