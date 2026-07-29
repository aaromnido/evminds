/**
 * Official press rooms of the car brands EVminds covers (Phase 6A.1).
 *
 * A link directory, nothing more: the UI offers a brand and opens that brand's
 * media site in a new tab, where Fer downloads a free, high-resolution, editorially
 * cleared photo and comes back to the normal upload flow. No download, no API, no
 * scraping, no storing anyone else's images.
 *
 * **A constant and not a table, on purpose.** 33 rows, ours, static, read-only, no
 * user-generated content and no admin CRUD wanted — the same call as
 * `src/lib/categories.ts` and `src/lib/post-categories.ts`. It also lets the picker
 * live inside the shared `ImageDropZone` without adding a Supabase read to five
 * screens, which is the kind of thing that caused the Disk IO incident (2026-07-16).
 *
 * This is a THIRD, unrelated set: it is not the news `categories.ts` nor the
 * `post-categories.ts` list, and nothing should try to keep them in parity.
 *
 * Maintenance is one thing only: a press room moving its URL. That shows up as a
 * 404 in a browser tab, never as a site error, which is part of why the
 * low-ceremony constant is the right shape here.
 *
 * `portal` is context for whoever maintains the list; the UI only ever shows `name`.
 */

export interface BrandMediaPortal {
  /** Brand name, exactly as shown in the UI. */
  name: string;
  /** Human name of the press room, for maintainers only. */
  portal: string;
  url: string;
  /**
   * `public` — press releases and galleries without logging in.
   * `registration` — a free account is needed for full-resolution downloads.
   */
  access: "public" | "registration";
  /**
   * Near-misses that would otherwise fail to match: abbreviations and
   * unaccented/simplified spellings people actually type.
   */
  aliases?: string[];
}

export const BRAND_MEDIA_PORTALS: readonly BrandMediaPortal[] = [
  {
    name: "BMW",
    portal: "BMW Group PressClub España",
    url: "https://www.press.bmwgroup.com/spain",
    access: "registration",
  },
  {
    name: "MINI",
    portal: "BMW Group PressClub",
    url: "https://www.press.bmwgroup.com",
    access: "registration",
  },
  {
    name: "Audi",
    portal: "Audi MediaCenter",
    url: "https://www.audi-mediacenter.com",
    access: "registration",
  },
  {
    name: "Mercedes-Benz",
    portal: "Mercedes-Benz Media",
    url: "https://media.mercedes-benz.com",
    access: "public",
    aliases: ["mercedes", "mercedes benz"],
  },
  {
    name: "Volkswagen",
    portal: "Volkswagen Newsroom",
    url: "https://www.volkswagen-newsroom.com",
    access: "public",
    aliases: ["vw"],
  },
  {
    name: "SEAT",
    portal: "SEAT Media Center",
    url: "https://www.seat-mediacenter.com",
    access: "public",
  },
  {
    name: "CUPRA",
    portal: "CUPRA Media Center",
    url: "https://www.seat-cupra-mediacenter.com",
    access: "public",
  },
  {
    name: "Hyundai",
    portal: "Hyundai Newsroom",
    url: "https://www.hyundai.news",
    access: "public",
  },
  {
    name: "Kia",
    portal: "Kia Europe Press",
    url: "https://www.press-eu.kia.com",
    access: "public",
  },
  {
    name: "Tesla",
    portal: "Tesla Media",
    url: "https://www.tesla.com/media",
    access: "public",
  },
  {
    name: "Volvo",
    portal: "Volvo Cars Media",
    url: "https://www.media.volvocars.com",
    access: "public",
    aliases: ["volvo cars"],
  },
  {
    name: "Polestar",
    portal: "Polestar Media",
    url: "https://media.polestar.com",
    access: "public",
  },
  {
    name: "Ford",
    portal: "Ford Media Center",
    url: "https://media.ford.com",
    access: "public",
  },
  {
    name: "Renault",
    portal: "Renault Media",
    url: "https://media.renault.com",
    access: "public",
  },
  {
    name: "Peugeot",
    portal: "Peugeot Media",
    url: "https://int-media.peugeot.com",
    access: "public",
  },
  {
    name: "Citroën",
    portal: "Citroën Media",
    url: "https://int-media.citroen.com",
    access: "public",
    aliases: ["citroen"],
  },
  {
    name: "Opel",
    portal: "Opel Media",
    url: "https://int-media.opel.com",
    access: "public",
  },
  {
    name: "Nissan",
    portal: "Nissan Global Newsroom",
    url: "https://global.nissannews.com",
    access: "public",
  },
  {
    name: "BYD",
    portal: "BYD Media Hub",
    url: "https://media.byd.com",
    access: "public",
  },
  {
    name: "MG",
    portal: "MG Motor Europe News",
    url: "https://news.mgmotor.eu",
    access: "public",
    aliases: ["mg motor"],
  },
  {
    name: "Lynk & Co",
    portal: "Lynk & Co Media",
    url: "https://media.lynkco.com",
    access: "public",
    aliases: ["lynk", "lynkco", "lynk and co"],
  },
  {
    name: "NIO",
    portal: "NIO Media Center",
    url: "https://media.nio.com",
    access: "public",
  },
  {
    name: "XPENG",
    portal: "XPENG News",
    url: "https://www.xpeng.com/news",
    access: "public",
    aliases: ["xpeng motors"],
  },
  {
    name: "ZEEKR",
    portal: "ZEEKR Global News",
    url: "https://www.zeekrglobal.com/news",
    access: "public",
  },
  {
    name: "Leapmotor",
    portal: "Leapmotor Global",
    url: "https://global.leapmotor.com",
    access: "public",
  },
  {
    name: "OMODA",
    portal: "OMODA España",
    url: "https://www.omodaauto.es/news",
    access: "public",
  },
  {
    name: "JAECOO",
    portal: "JAECOO España",
    url: "https://www.jaecoo.es/news",
    access: "public",
  },
  {
    name: "Changan",
    portal: "Changan Europe Newsroom",
    url: "https://newsroom.changaneurope.com",
    access: "public",
  },
  {
    name: "Voyah",
    portal: "Voyah Global",
    url: "https://www.voyah.com",
    access: "public",
  },
  {
    name: "Hongqi",
    portal: "Hongqi Global",
    url: "https://www.hongqi-auto.com",
    access: "public",
  },
  {
    name: "Maxus",
    portal: "Maxus España",
    url: "https://www.maxus.es/noticias",
    access: "public",
  },
  {
    name: "DFSK",
    portal: "DFSK Global",
    url: "https://www.dfskglobal.com",
    access: "public",
  },
  {
    name: "Seres",
    portal: "Seres Global",
    url: "https://www.seres.com",
    access: "public",
  },
] as const;

/**
 * Lowercases and strips diacritics so "citroën" and "Citroen" are the same string.
 *
 * Deliberately NOT `slugify()`: that one also drops every non-alphanumeric
 * character, which would turn "Lynk & Co" into "lynk-co" and make a
 * `startsWith` query against raw user input behave in ways nobody expects. Two
 * jobs, two functions — bending slugify into a second role is exactly the kind
 * of silent drift `AGENTS.md` warns about.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Every string a brand can be matched by: its name plus its aliases. */
function haystack(brand: BrandMediaPortal): string[] {
  return [brand.name, ...(brand.aliases ?? [])].map(normalize);
}

/**
 * Brands matching a free-text query, prefix matches first.
 *
 * Ranking matters more than it looks: typing "ni" should offer NIO and Nissan
 * before MINI, which only contains "ni" in the middle. Within each tier the
 * source order (alphabetical-ish, as Fer supplied it) is preserved.
 *
 * An empty query returns the whole list, which is what the field shows when it
 * is focused before anything is typed.
 */
export function searchBrands(query: string): BrandMediaPortal[] {
  const q = normalize(query);
  if (!q) return [...BRAND_MEDIA_PORTALS];

  const prefix: BrandMediaPortal[] = [];
  const substring: BrandMediaPortal[] = [];

  for (const brand of BRAND_MEDIA_PORTALS) {
    const candidates = haystack(brand);
    if (candidates.some((c) => c.startsWith(q))) {
      prefix.push(brand);
    } else if (candidates.some((c) => c.includes(q))) {
      substring.push(brand);
    }
  }

  return [...prefix, ...substring];
}

/**
 * The brand a typed string unambiguously *is*, or null.
 *
 * This is what keeps the button disabled: "Ferrari" matches nothing, so there is
 * nowhere to go. Only an exact (normalized) hit on the name or one of the
 * aliases counts — a partial query like "mer" is a search, not a destination.
 */
export function resolveBrand(query: string): BrandMediaPortal | null {
  const q = normalize(query);
  if (!q) return null;
  return BRAND_MEDIA_PORTALS.find((brand) => haystack(brand).includes(q)) ?? null;
}
