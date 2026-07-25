/**
 * Mock data and fake AI for the editorial admin prototype (task A3, UI-first).
 *
 * PROTOTYPE ONLY — delete this file once the curator Edge Function and the
 * `editorial_candidates` table exist. Nothing here touches Supabase or Gemini;
 * the point is to design and refine the UI before any backend lands.
 *
 * Timestamps are generated relative to a caller-supplied "now" so the page can
 * pass the same reference to the React island (see `nowIso` in
 * `src/pages/admin/posts/index.astro` for the existing precedent). That keeps
 * server-rendered and hydrated output byte-identical.
 */

import type { IdeaCandidate, IdeaDraftInput } from "./editorial-types";
import { sourceHostname } from "./editorial-utils";

const HOUR_MS = 60 * 60 * 1000;

/** Candidate seed, expressed in hours-ago so the fixtures never go stale. */
interface IdeaSeed extends Omit<
  IdeaCandidate,
  "fetched_at" | "expires_at" | "picked_at" | "origin" | "reference_urls"
> {
  hoursAgo: number;
  pickedHoursAgo?: number;
  /** Which generated batch this belongs to; "Volver a generar" swaps batches. */
  batch: 1 | 2;
}

const SEEDS: IdeaSeed[] = [
  // --- Batch 1 -------------------------------------------------------------
  {
    id: "c1",
    batch: 1,
    source_url: "https://electrek.co/tesla-supercharger-spain-open-all-brands",
    source_title: "Tesla opens its Spanish Supercharger network to all EV brands",
    source_name: "Electrek",
    source_excerpt:
      "Tesla has quietly flipped the switch on 46 Spanish Supercharger sites, making them available to non-Tesla drivers at a premium rate.",
    proposed_title_es: "Tesla abre sus Supercargadores en España a todas las marcas",
    angle:
      "No repetir la nota de prensa. Contar qué supone para quien conduce un no-Tesla aquí y ahora: qué estaciones, a qué precio por kWh frente a Ionity y Zunder, y si merece la pena la suscripción mensual.",
    rationale:
      "Es el primer país del sur de Europa donde se activa la red completa y la competencia todavía no ha movido precios. Se puede publicar antes de que la prensa española generalista lo cubra.",
    status: "pending",
    hoursAgo: 6,
  },
  {
    id: "c2",
    batch: 1,
    source_url: "https://insideevs.com/byd-dolphin-surf-price-cut-europe",
    source_title: "BYD cuts Dolphin Surf price across Europe as competition heats up",
    source_name: "InsideEVs",
    source_excerpt:
      "The entry-level Dolphin Surf drops below the €20,000 mark in several markets, undercutting the Dacia Spring on range-per-euro.",
    proposed_title_es: "El BYD Dolphin Surf baja de los 20.000€",
    angle:
      "Comparar coste real de uso a 4 años frente al Dacia Spring y el Citroën ë-C3, con el MOVES incluido y sin él. La pregunta que se hace el lector: ¿ya es más barato que un gasolina equivalente?",
    rationale:
      "Coincide con la reapertura del plan MOVES y es la búsqueda que más ha crecido en el sector este mes. Hay hueco: nadie lo ha calculado con cifras españolas.",
    status: "pending",
    hoursAgo: 9,
  },
  {
    id: "c3",
    batch: 1,
    source_url: "https://cnevpost.com/xiaomi-yu7-deliveries-begin",
    source_title: "Xiaomi begins YU7 deliveries, order backlog stretches into next year",
    source_name: "CnEVPost",
    source_excerpt:
      "Xiaomi confirmed the first YU7 deliveries this week, with waiting times for new orders now exceeding 40 weeks.",
    proposed_title_es: "Xiaomi ya entrega el YU7 y tiene cola para un año",
    angle:
      "El ángulo no es el coche, es el plazo de entrega. Una marca de móviles ha montado una cadena de producción de coches en tres años. Qué dice eso del ritmo al que se mueve la industria europea.",
    rationale:
      "Xiaomi genera clics y aún no llega a Europa, así que se puede escribir sin pisar a nadie. Buen material para una pieza de opinión, que es lo que mejor funciona en Motor.es.",
    status: "pending",
    hoursAgo: 14,
  },
  {
    id: "c4",
    batch: 1,
    source_url: "https://electrek.co/nacs-adapter-reliability-study",
    source_title: "Study finds NACS adapters fail on 1 in 12 charging sessions",
    source_name: "Electrek",
    source_excerpt:
      "A survey of 4,200 charging sessions found adapter-related failures in 8% of attempts, concentrated in cold weather.",
    proposed_title_es: "Los adaptadores de carga fallan una vez cada doce",
    angle:
      "Trasladarlo al contexto español, donde el adaptador CCS es menos habitual pero el problema del frío existe igual en el norte. Contar mi propia experiencia con adaptadores en seis años de uso.",
    rationale:
      "Encaja con la línea editorial de experiencia real frente a folleto comercial. El dato es sólido y citable, y no hay nada parecido en español.",
    status: "pending",
    hoursAgo: 21,
  },
  {
    id: "c5",
    batch: 1,
    source_url: "https://insideevs.com/solid-state-battery-timeline-slips-again",
    source_title: "Another solid-state battery timeline slips to 2030",
    source_name: "InsideEVs",
    source_excerpt:
      "The latest delay pushes volume production of solid-state cells past the end of the decade for a third major manufacturer.",
    proposed_title_es: "El estado sólido se retrasa otra vez: deja de esperar",
    angle:
      "Pieza de servicio, no técnica: si llevas dos años retrasando la compra esperando el estado sólido, este es el momento de dejar de esperar. Qué baterías hay hoy y cuánto aguantan de verdad.",
    rationale:
      "Es el freno de compra número uno que me repiten los lectores. Tema perenne, no caduca, y se posiciona a largo plazo.",
    status: "pending",
    hoursAgo: 30,
  },
  {
    id: "c6",
    batch: 1,
    source_url: "https://carnewschina.com/nio-battery-swap-alliance-expands",
    source_title: "NIO's battery-swap alliance adds two more manufacturers",
    source_name: "CarNewsChina",
    source_excerpt:
      "Two additional Chinese manufacturers will adopt NIO's swappable battery standard from 2027 models onward.",
    proposed_title_es: "El cambio de batería vuelve a China: ¿tiene sentido en España?",
    angle:
      "Explicar por qué un modelo que funciona en China choca de frente con la realidad española: parque de coches, densidad urbana y coste del suelo. Escéptico pero informado, sin despachar la idea.",
    rationale:
      "Tema recurrente en los comentarios del blog. Aporta contexto que ningún medio español está dando.",
    status: "pending",
    hoursAgo: 44,
  },
  // --- Batch 2: what "Volver a generar" produces ---------------------------
  {
    id: "d1",
    batch: 2,
    source_url: "https://electrek.co/renault-twingo-ev-price-announced",
    source_title: "Renault confirms electric Twingo pricing for Europe",
    source_name: "Electrek",
    source_excerpt:
      "Renault's retro city EV lands under €20,000 in its first three markets, Spain included.",
    proposed_title_es: "El Twingo eléctrico ya tiene precio en España",
    angle:
      "Qué significa que una marca europea llegue por fin al precio que llevaban dos años ocupando solo los chinos. Y si el coche urbano eléctrico deja de ser un capricho.",
    rationale:
      "Nostalgia más precio agresivo: combinación que siempre funciona, y es una marca con red de talleres aquí, que es la objeción número uno frente a BYD.",
    status: "pending",
    hoursAgo: 2,
  },
  {
    id: "d2",
    batch: 2,
    source_url: "https://insideevs.com/heat-pump-winter-range-data",
    source_title: "New data quantifies heat-pump gains in winter range",
    source_name: "InsideEVs",
    source_excerpt:
      "Fleet telemetry from 12,000 vehicles isolates the winter range penalty with and without a heat pump.",
    proposed_title_es: "Cuánta autonomía te quita el invierno de verdad",
    angle:
      "Traducir el dato a los inviernos españoles, que no son los noruegos: Madrid, Burgos y Málaga dan penalizaciones muy distintas. Con mis propios registros de seis inviernos.",
    rationale:
      "Es la duda que más frena la compra después del precio, y los datos que circulan en español vienen todos de climas que no son el nuestro.",
    status: "pending",
    hoursAgo: 3,
  },
  {
    id: "d3",
    batch: 2,
    source_url: "https://cnevpost.com/catl-sodium-ion-production-start",
    source_title: "CATL starts sodium-ion cell production",
    source_name: "CnEVPost",
    source_excerpt:
      "The first sodium-ion cells enter volume production, targeting entry-level city cars.",
    proposed_title_es: "Baterías de sodio en producción: la alternativa al litio ya está aquí",
    angle:
      "Sin tecnicismos: qué gana el comprador y qué pierde. Menos autonomía, mucho mejor comportamiento en frío y más barata. Para qué tipo de conductor tiene sentido.",
    rationale:
      "Rompe el relato de que la batería solo puede abaratarse con litio. Y llega justo cuando el segmento urbano está en plena guerra de precios.",
    status: "pending",
    hoursAgo: 5,
  },
  {
    id: "d4",
    batch: 2,
    source_url: "https://electrek.co/public-charging-price-transparency-rules",
    source_title: "New EU rules force price transparency at public chargers",
    source_name: "Electrek",
    source_excerpt:
      "Operators must display the final per-kWh price before a session starts, ending opaque tariffs.",
    proposed_title_es: "Adiós a las tarifas opacas en la carga pública",
    angle:
      "Qué cambia el día que llegues a un cargador: qué tienes derecho a ver antes de enchufar y qué hacer si no aparece. Guía práctica, no resumen del reglamento.",
    rationale:
      "Afecta a todo el que carga fuera de casa y nadie lo ha contado en español desde el punto de vista del conductor, solo desde el del operador.",
    status: "pending",
    hoursAgo: 7,
  },
  // --- Historial (ya persistidas) ------------------------------------------
  {
    id: "h1",
    batch: 1,
    source_url: "https://electrek.co/rivian-r2-europe-plans",
    source_title: "Rivian outlines European plans for the R2",
    source_name: "Electrek",
    source_excerpt: "Rivian's smaller SUV is confirmed for European markets.",
    proposed_title_es: "Rivian traerá el R2 a Europa: qué sabemos y qué falta por saber",
    angle: "Qué hueco ocuparía aquí y contra quién competiría de verdad.",
    rationale: "Marca con mucho tirón mediático y cero presencia europea todavía.",
    status: "picked",
    hoursAgo: 52,
    pickedHoursAgo: 50,
  },
  {
    id: "h2",
    batch: 1,
    source_url: "https://insideevs.com/v2g-pilot-results",
    source_title: "V2G pilot results published",
    source_name: "InsideEVs",
    source_excerpt: "A two-year vehicle-to-grid pilot reports its findings.",
    proposed_title_es: "Tu coche como batería de casa: qué dicen los primeros datos reales",
    angle: "Cuánto se ahorra de verdad y qué hace falta para montarlo en España.",
    rationale: "Tema de futuro con datos ya disponibles, poco cubierto en español.",
    status: "saved",
    hoursAgo: 61,
  },
  {
    id: "h3",
    batch: 1,
    source_url: "https://electrek.co/charging-network-uptime-report",
    source_title: "Charging network uptime report published",
    source_name: "Electrek",
    source_excerpt: "Annual reliability figures per operator.",
    proposed_title_es: "Qué red de carga te deja tirado menos veces",
    angle: "Ranking de fiabilidad por operador, con mi propio registro de fallos en seis años.",
    rationale: "Nadie publica esto en español y es la duda práctica número uno en viaje largo.",
    status: "saved",
    hoursAgo: 70,
  },
  {
    id: "h4",
    batch: 1,
    source_url: "https://insideevs.com/used-ev-battery-health-study",
    source_title: "Used EV battery health study",
    source_name: "InsideEVs",
    source_excerpt: "Degradation data across 15,000 used vehicles.",
    proposed_title_es: "Comprar un eléctrico de segunda mano sin llevarte un disgusto",
    angle: "Cómo mirar el estado de la batería antes de firmar, paso a paso y sin apps de pago.",
    rationale: "El mercado de segunda mano se está llenando y no hay guía decente en español.",
    status: "saved",
    hoursAgo: 88,
  },
  {
    id: "h5",
    batch: 1,
    source_url: "https://cnevpost.com/megawatt-charging-rollout",
    source_title: "Megawatt charging rollout begins",
    source_name: "CnEVPost",
    source_excerpt: "First megawatt-class chargers enter public service.",
    proposed_title_es: "Cargar en cinco minutos: lo que falta para que llegue aquí",
    angle: "Por qué el cuello de botella no es el coche ni el cargador, es la red eléctrica.",
    rationale: "Titular llamativo con explicación honesta debajo, que es lo que nos diferencia.",
    status: "saved",
    hoursAgo: 96,
  },
];

/**
 * Build the candidate fixtures for a batch, relative to a reference timestamp.
 * Already-persisted ideas (picked/saved) come back regardless of batch, since
 * regenerating only replaces the transient `pending` ones.
 */
export function buildMockIdeas(nowIso: string, batch: 1 | 2 = 1): IdeaCandidate[] {
  const now = new Date(nowIso).getTime();
  return SEEDS.filter((s) => s.status !== "pending" || s.batch === batch).map(
    ({ hoursAgo, pickedHoursAgo, batch: _batch, ...rest }) => {
      const fetchedAt = now - hoursAgo * HOUR_MS;
      return {
        ...rest,
        origin: "curator" as const,
        reference_urls: [],
        fetched_at: new Date(fetchedAt).toISOString(),
        expires_at: new Date(fetchedAt + 48 * HOUR_MS).toISOString(),
        picked_at:
          pickedHoursAgo === undefined
            ? null
            : new Date(now - pickedHoursAgo * HOUR_MS).toISOString(),
      };
    },
  );
}

/**
 * Fake "Desarrollar con IA": turns a one-line draft into a fuller angle plus a
 * reason to write it now. The real version is a single structured Gemini call
 * with the style guide + editorial line as context.
 */
export function mockExpandIdea(input: IdeaDraftInput): { angle: string; rationale: string } {
  const seed = (input.angle || input.proposed_title_es).trim().replace(/\.$/, "");
  return {
    angle:
      `${seed}. Enfócalo desde la experiencia real de conducir un eléctrico a diario en España, ` +
      "no desde la ficha técnica: qué cambia para quien ya tiene uno y para quien se lo está " +
      "pensando. Contrasta las cifras oficiales con lo que se ve en uso y aterriza cada dato en " +
      "euros y kilómetros españoles.",
    rationale:
      "Es un tema que los medios españoles cubren copiando la nota de prensa, así que hay hueco " +
      "para una pieza con criterio propio. Además conecta con las dudas que más repiten los " +
      "lectores, lo que le da recorrido en búsquedas más allá de la actualidad inmediata.",
  };
}

/**
 * Fake "Desarrollar con IA" for step ②, where only the angle is on screen.
 * Same idea as `mockExpandIdea`, minus the "por qué ahora" half.
 */
export function mockExpandAngle(title: string, angle: string): string {
  const seed = (angle || title).trim().replace(/\.$/, "");
  return (
    `${seed}. Cuéntalo desde la experiencia real de conducir un eléctrico a diario en España y ` +
    "no desde la ficha técnica: qué cambia para quien ya tiene uno y para quien se lo está " +
    "pensando. Contrasta las cifras oficiales con lo que se ve en uso y aterriza cada dato en " +
    "euros y kilómetros de aquí."
  );
}

/** Google truncates around here, so it is what the counter in the UI aims at. */
export const SEO_TITLE_MAX = 60;

/**
 * Fake "Mejorar SEO": rewrite the headline so the searchable part goes first and
 * the whole thing fits in a results page.
 *
 * The real version is one structured Gemini call with the style guide plus the
 * house rules on headlines. This mock only has to be deterministic and to
 * visibly *change* the field, which is what the screen needs to be judged.
 */
export function mockImproveSeoTitle(title: string): string {
  const clean = title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.:;,–—-]+$/, "");
  // Keep the part before the colon: in a headline that is almost always the
  // subject, and the tail is the hook, which is what SEO wants replaced.
  const subject = clean.split(/[:—–]/)[0].trim() || clean;
  const improved = `${subject}: precios, datos reales y qué esperar en España`;
  return improved.length <= SEO_TITLE_MAX ? improved : `${subject}: datos reales en España`;
}

/**
 * Fake link reader for requirement R1.
 *
 * Deterministic on purpose (a hash of the URL, no randomness) so a given link
 * always behaves the same and the screen can be demoed twice with the same
 * result. Roughly one in four fails on the first attempt and then succeeds on a
 * retry, which is what a real fetch against a slow or protective site looks
 * like — and it is the only way to see the failed state without hunting for a
 * paywalled URL.
 */
export function mockReadReferenceLink(
  url: string,
  attempt: number,
): { ok: true; title: string } | { ok: false; error: string } {
  const host = sourceHostname(url);
  let hash = 0;
  for (const char of url) hash = (hash * 31 + char.charCodeAt(0)) % 100000;

  if (attempt === 1 && hash % 4 === 0) {
    return {
      ok: false,
      error: "La página no ha dejado leer el contenido (muro de pago o carga por JavaScript).",
    };
  }

  return { ok: true, title: `Artículo de ${host}` };
}

/** Turn a freshly filled form into an idea ready to show in the list. */
export function buildOwnIdea(input: IdeaDraftInput, nowIso: string, id: string): IdeaCandidate {
  return {
    id,
    origin: "own",
    source_url: null,
    source_title: null,
    source_name: null,
    source_excerpt: null,
    proposed_title_es: input.proposed_title_es.trim(),
    angle: input.angle.trim(),
    rationale: input.rationale.trim(),
    reference_urls: input.reference_urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean),
    // Own ideas are persisted from birth, so they are already "saved".
    status: "saved",
    fetched_at: nowIso,
    picked_at: null,
    expires_at: nowIso,
  };
}
