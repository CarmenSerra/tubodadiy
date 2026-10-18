// Modelo del Día B y de las lecturas / música / testigos de la ceremonia.
// Todo vive en weddingPlans/{planId}/dayof/data/<colección>/{id}.

export const DAYOF_COLLECTIONS = [
  "readings",
  "music",
  "witnesses",
  "contacts",
  "shots",
  "songs",
] as const;
export type DayOfCollection = (typeof DAYOF_COLLECTIONS)[number];

/** Ordena primero por `order` (si lo hay) y luego por antigüedad. */
export function byCreated<T extends { createdAt: number | null }>(a: T, b: T): number {
  return (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity);
}

/* ------------------------------------------------------------------ */
/* Lecturas                                                           */
/* ------------------------------------------------------------------ */

export interface Reading {
  id: string;
  title: string;
  /** Texto de la lectura (opcional si hay enlace). */
  text: string;
  /** Enlace http(s) al texto (opcional si hay texto). */
  url: string;
  /** Quién la lee. */
  reader: string;
  order: number;
  createdAt: number | null;
}
export type ReadingInput = Omit<Reading, "id" | "createdAt" | "order">;

export function sortReadings(list: Reading[]): Reading[] {
  return [...list].sort((a, b) => a.order - b.order || byCreated(a, b));
}

/* ------------------------------------------------------------------ */
/* Música de la ceremonia                                             */
/* ------------------------------------------------------------------ */

/** Momentos de la ceremonia con música (el orden es el de la ceremonia). */
export const CEREMONY_MUSIC_MOMENTS = ["entrance", "rings", "signing", "exit", "other"] as const;
export type CeremonyMusicMoment = (typeof CEREMONY_MUSIC_MOMENTS)[number];

export function isCeremonyMusicMoment(value: unknown): value is CeremonyMusicMoment {
  return (CEREMONY_MUSIC_MOMENTS as readonly unknown[]).includes(value);
}

export interface CeremonyTrack {
  id: string;
  moment: CeremonyMusicMoment;
  song: string;
  artist: string;
  url: string;
  createdAt: number | null;
}
export type CeremonyTrackInput = Omit<CeremonyTrack, "id" | "createdAt">;

export function sortTracks(list: CeremonyTrack[]): CeremonyTrack[] {
  const rank = (m: CeremonyMusicMoment) => CEREMONY_MUSIC_MOMENTS.indexOf(m);
  return [...list].sort((a, b) => rank(a.moment) - rank(b.moment) || byCreated(a, b));
}

/* ------------------------------------------------------------------ */
/* Testigos                                                           */
/* ------------------------------------------------------------------ */

export interface Witness {
  id: string;
  name: string;
  phone: string;
  /** De quién es testigo (texto libre: «de Ana», «de los dos»…). */
  forWhom: string;
  /** Solo se guarda si ya entregó el DNI, nunca el número. */
  dniDelivered: boolean;
  createdAt: number | null;
}
export type WitnessInput = Omit<Witness, "id" | "createdAt">;

export function sortWitnesses(list: Witness[]): Witness[] {
  return [...list].sort(byCreated);
}

/* ------------------------------------------------------------------ */
/* Contactos del día                                                  */
/* ------------------------------------------------------------------ */

export interface DayContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  /** Proveedor del que se copió (para no ofrecerlo dos veces). */
  vendorId: string;
  createdAt: number | null;
}
export type DayContactInput = Omit<DayContact, "id" | "createdAt">;

export function sortContacts(list: DayContact[]): DayContact[] {
  return [...list].sort(byCreated);
}

/** Teléfono apto para `tel:` (solo dígitos, + inicial). `null` si no hay dígitos. */
export function telHref(phone: string): string | null {
  const cleaned = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d/.test(cleaned) ? `tel:${cleaned}` : null;
}

/** «Marta (Fotógrafa)» o solo el nombre. */
export function contactLabel(contact: Pick<DayContact, "name" | "role">): string {
  const role = contact.role.trim();
  return role ? `${contact.name} (${role})` : contact.name;
}

/** Mapa id → contacto. */
export function contactsById(list: DayContact[]): Map<string, DayContact> {
  return new Map(list.map((c) => [c.id, c]));
}

/**
 * Responsable de un momento de la escaleta: el contacto elegido (si sigue existiendo)
 * y el texto libre de siempre.
 */
export function responsibleParts(
  item: { responsible: string; responsibleContactId?: string },
  byId: Map<string, DayContact>
): { contact: DayContact | null; text: string } {
  const contact = item.responsibleContactId ? (byId.get(item.responsibleContactId) ?? null) : null;
  return { contact, text: item.responsible.trim() };
}

/** Texto corto del responsable: «Marta (Fotógrafa) · el texto libre». Vacío si no hay ninguno. */
export function responsibleText(
  item: { responsible: string; responsibleContactId?: string },
  byId: Map<string, DayContact>,
  options: { phone?: boolean } = {}
): string {
  const { contact, text } = responsibleParts(item, byId);
  const parts: string[] = [];
  if (contact) {
    parts.push(options.phone && contact.phone.trim() ? `${contactLabel(contact)} ${contact.phone.trim()}` : contactLabel(contact));
  }
  if (text && text !== contact?.name) parts.push(text);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Fotos clave                                                        */
/* ------------------------------------------------------------------ */

export const SHOT_GROUPS = ["prep", "ceremony", "family", "couple", "party"] as const;
export type ShotGroup = (typeof SHOT_GROUPS)[number];

export function isShotGroup(value: unknown): value is ShotGroup {
  return (SHOT_GROUPS as readonly unknown[]).includes(value);
}

export interface Shot {
  id: string;
  group: ShotGroup;
  /** Clave de la plantilla sugerida (el texto se traduce); vacía si la escribió la persona. */
  key: string;
  /** Texto propio; para las sugeridas puede estar vacío. */
  label: string;
  checked: boolean;
  createdAt: number | null;
}

/** Fotos sugeridas. La clave es `dayof:shots.suggested.<key>`; el id del documento es `s-<key>`. */
export const SUGGESTED_SHOTS: { key: string; group: ShotGroup }[] = [
  { key: "dress", group: "prep" },
  { key: "suit", group: "prep" },
  { key: "rings", group: "prep" },
  { key: "gettingReady", group: "prep" },
  { key: "details", group: "prep" },
  { key: "entrance", group: "ceremony" },
  { key: "vows", group: "ceremony" },
  { key: "ringsExchange", group: "ceremony" },
  { key: "kiss", group: "ceremony" },
  { key: "exit", group: "ceremony" },
  { key: "parents", group: "family" },
  { key: "grandparents", group: "family" },
  { key: "siblings", group: "family" },
  { key: "allFamily", group: "family" },
  { key: "friends", group: "family" },
  { key: "portrait", group: "couple" },
  { key: "sunset", group: "couple" },
  { key: "detailsCouple", group: "couple" },
  { key: "banquetEntrance", group: "party" },
  { key: "cake", group: "party" },
  { key: "firstDance", group: "party" },
  { key: "toast", group: "party" },
  { key: "dancefloor", group: "party" },
];

export const suggestedShotId = (key: string) => `s-${key}`;

/** Texto visible de una foto: el propio o, si es sugerida, el traducido. */
export function shotLabel(shot: Shot, t: (key: string) => string): string {
  if (shot.label.trim()) return shot.label;
  return shot.key ? t(`shots.suggested.${shot.key}`) : "";
}

export function shotProgress(shots: Shot[]): { done: number; total: number; percent: number } {
  const total = shots.length;
  const done = shots.filter((s) => s.checked).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function groupShots(shots: Shot[]): { group: ShotGroup; items: Shot[] }[] {
  return SHOT_GROUPS.map((group) => ({
    group,
    items: shots.filter((s) => s.group === group).sort(byCreatedThenKey),
  })).filter((g) => g.items.length > 0);
}

const SUGGESTED_ORDER = new Map(SUGGESTED_SHOTS.map((s, i) => [s.key, i]));

/** Primero las sugeridas en su orden y luego las propias por antigüedad. */
function byCreatedThenKey(a: Shot, b: Shot): number {
  const ra = a.key ? (SUGGESTED_ORDER.get(a.key) ?? 999) : 1000;
  const rb = b.key ? (SUGGESTED_ORDER.get(b.key) ?? 999) : 1000;
  return ra - rb || byCreated(a, b);
}

/* ------------------------------------------------------------------ */
/* Playlist                                                           */
/* ------------------------------------------------------------------ */

export const PLAYLIST_MOMENTS = ["cocktail", "banquet", "firstDance", "party", "general"] as const;
export type PlaylistMoment = (typeof PLAYLIST_MOMENTS)[number];

export function isPlaylistMoment(value: unknown): value is PlaylistMoment {
  return (PLAYLIST_MOMENTS as readonly unknown[]).includes(value);
}

/** «normal»: una más; «must»: imprescindible; «avoid»: no poner. */
export const SONG_FLAGS = ["normal", "must", "avoid"] as const;
export type SongFlag = (typeof SONG_FLAGS)[number];

export function isSongFlag(value: unknown): value is SongFlag {
  return (SONG_FLAGS as readonly unknown[]).includes(value);
}

export interface Song {
  id: string;
  moment: PlaylistMoment;
  title: string;
  artist: string;
  url: string;
  flag: SongFlag;
  createdAt: number | null;
}
export type SongInput = Omit<Song, "id" | "createdAt">;

/** Imprescindibles primero, luego las normales y al final las que no hay que poner. */
export function sortSongs(list: Song[]): Song[] {
  const rank = (f: SongFlag) => (f === "must" ? 0 : f === "normal" ? 1 : 2);
  return [...list].sort((a, b) => rank(a.flag) - rank(b.flag) || byCreated(a, b));
}

/* ------------------------------------------------------------------ */
/* Enlaces                                                            */
/* ------------------------------------------------------------------ */

export const DAYOF_SECTIONS = ["contactos", "fotos", "playlist", "escaleta"] as const;
export type DayOfSection = (typeof DAYOF_SECTIONS)[number];

/** Pestaña Día B; el ancla lleva a su sección. */
export function dayOfHref(planId: string, section?: DayOfSection) {
  return `/plan/${planId}/dia-b${section ? `#${section}` : ""}`;
}

export const CEREMONY_EXTRA_SECTIONS = ["lecturas", "musica", "testigos"] as const;
export type CeremonyExtraSection = (typeof CEREMONY_EXTRA_SECTIONS)[number];

/** Pestaña Ceremonia en una de las secciones de este módulo. */
export function ceremonyExtraHref(planId: string, section: CeremonyExtraSection) {
  return `/plan/${planId}/ceremonia#${section}`;
}
