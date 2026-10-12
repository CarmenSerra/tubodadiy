/** Geografía de España: comunidades autónomas y provincias (nombres en español). */

export const COMMUNITIES: { name: string; provinces: string[] }[] = [
  { name: "Andalucía", provinces: ["Almería", "Cádiz", "Córdoba", "Granada", "Huelva", "Jaén", "Málaga", "Sevilla"] },
  { name: "Aragón", provinces: ["Huesca", "Teruel", "Zaragoza"] },
  { name: "Canarias", provinces: ["Las Palmas", "Santa Cruz de Tenerife"] },
  { name: "Cantabria", provinces: ["Cantabria"] },
  { name: "Castilla y León", provinces: ["Ávila", "Burgos", "León", "Palencia", "Salamanca", "Segovia", "Soria", "Valladolid", "Zamora"] },
  { name: "Castilla-La Mancha", provinces: ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"] },
  { name: "Cataluña", provinces: ["Barcelona", "Girona", "Lleida", "Tarragona"] },
  { name: "Ceuta", provinces: ["Ceuta"] },
  { name: "Comunidad de Madrid", provinces: ["Madrid"] },
  { name: "Comunidad Foral de Navarra", provinces: ["Navarra"] },
  { name: "Comunidad Valenciana", provinces: ["Alicante", "Castellón", "Valencia"] },
  { name: "Extremadura", provinces: ["Badajoz", "Cáceres"] },
  { name: "Galicia", provinces: ["A Coruña", "Lugo", "Ourense", "Pontevedra"] },
  { name: "Islas Baleares", provinces: ["Islas Baleares"] },
  { name: "La Rioja", provinces: ["La Rioja"] },
  { name: "Melilla", provinces: ["Melilla"] },
  { name: "País Vasco", provinces: ["Álava", "Guipúzcoa", "Vizcaya"] },
  { name: "Principado de Asturias", provinces: ["Asturias"] },
  { name: "Región de Murcia", provinces: ["Murcia"] },
];

const collator = new Intl.Collator("es", { sensitivity: "base" });

/** Las 52 provincias (incluye Ceuta y Melilla), en orden alfabético español. */
export const PROVINCES: string[] = COMMUNITIES.flatMap((c) => c.provinces)
  .filter((p, i, all) => all.indexOf(p) === i)
  .sort(collator.compare);

/** Minúsculas, sin tildes ni signos: "València" -> "valencia". */
function key(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PROVINCE_BY_KEY = new Map<string, string>();
for (const p of PROVINCES) PROVINCE_BY_KEY.set(key(p), p);

// Nombres alternativos (euskera, catalán, gallego, inglés y formas antiguas).
const ALIASES: Record<string, string> = {
  "la coruna": "A Coruña",
  coruna: "A Coruña",
  "coruna a": "A Coruña",
  corunna: "A Coruña",
  araba: "Álava",
  "araba alava": "Álava",
  "alava araba": "Álava",
  gipuzkoa: "Guipúzcoa",
  bizkaia: "Vizcaya",
  gerona: "Girona",
  lerida: "Lleida",
  orense: "Ourense",
  castello: "Castellón",
  "castello de la plana": "Castellón",
  "castellon de la plana": "Castellón",
  "castello castellon": "Castellón",
  "castellon castello": "Castellón",
  alacant: "Alicante",
  "alacant alicante": "Alicante",
  "alicante alacant": "Alicante",
  baleares: "Islas Baleares",
  "illes balears": "Islas Baleares",
  "les illes balears": "Islas Baleares",
  "balearic islands": "Islas Baleares",
  "illas baleares": "Islas Baleares",
  "principado de asturias": "Asturias",
  "asturias principado de": "Asturias",
  navarre: "Navarra",
  nafarroa: "Navarra",
  "comunidad foral de navarra": "Navarra",
  rioja: "La Rioja",
  tenerife: "Santa Cruz de Tenerife",
  "gran canaria": "Las Palmas",
  "region de murcia": "Murcia",
  "comunidad de madrid": "Madrid",
  "comunidad valenciana": "Valencia",
  "comunitat valenciana": "Valencia",
};

function lookupProvince(k: string): string | undefined {
  return PROVINCE_BY_KEY.get(k) ?? ALIASES[k];
}

/** Nombre de provincia (de Google o escrito a mano) -> nombre canónico de PROVINCES. */
export function normalizeProvince(name: string): string | undefined {
  if (!name) return undefined;
  const cleaned = key(name).replace(/^(provincia|province|provincia de|province of|prov) (de |of )?/, "");
  const direct = lookupProvince(cleaned);
  if (direct) return direct;
  // "Araba/Álava", "Castelló / Castellón": probar cada parte por separado.
  const parts = name.split(/[/,–-]/).map((p) => key(p).replace(/^(provincia|province) (de |of )?/, ""));
  if (parts.length > 1) {
    for (const part of parts) {
      const found = part ? lookupProvince(part) : undefined;
      if (found) return found;
    }
  }
  return undefined;
}

const COMMUNITY_BY_PROVINCE = new Map<string, string>();
const COMMUNITY_BY_KEY = new Map<string, string>();
for (const c of COMMUNITIES) {
  COMMUNITY_BY_KEY.set(key(c.name), c.name);
  for (const p of c.provinces) COMMUNITY_BY_PROVINCE.set(p, c.name);
}

/** Comunidad autónoma de una provincia (tolerante a tildes, mayúsculas y nombres bilingües). */
export function communityOf(province: string): string | undefined {
  const canonical = normalizeProvince(province);
  if (canonical) return COMMUNITY_BY_PROVINCE.get(canonical);
  return COMMUNITY_BY_KEY.get(key(province));
}
