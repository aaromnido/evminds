/**
 * Canonical tag dictionary for articles.
 *
 * Rules:
 * - Always use these exact strings in article frontmatter
 * - One concept = one tag (avoid duplicates like "Leaf" vs "Nissan Leaf")
 * - Capitalize brand/model names, lowercase generic concepts
 * - Add new tags here BEFORE using them in articles
 */

export const TAGS = {
  // Brands
  Audi: "Audi",
  BMW: "BMW",
  BYD: "BYD",
  Chery: "Chery",
  Deepal: "Deepal",
  Hyundai: "Hyundai",
  Kia: "Kia",
  Leapmotor: "Leapmotor",
  LiAuto: "Li Auto",
  Mercedes: "Mercedes",
  MG: "MG",
  NIO: "NIO",
  Nissan: "Nissan",
  Omoda: "Omoda",
  Opel: "Opel",
  Polestar: "Polestar",
  Porsche: "Porsche",
  Renault: "Renault",
  Tesla: "Tesla",
  Volkswagen: "Volkswagen",
  Volvo: "Volvo",
  XPeng: "XPeng",
  Zeekr: "Zeekr",

  // Models
  "e-Niro": "e-Niro",
  Leaf: "Leaf",
  Micra: "Micra",

  // Topics
  Autonomía: "Autonomía",
  Batería: "Batería",
  Carga: "Carga",
  "Carga rápida": "Carga rápida",
  Costes: "Costes",
  Degradación: "Degradación",
  Infraestructura: "Infraestructura",
  Mantenimiento: "Mantenimiento",
  Review: "Review",
  Viajes: "Viajes",

  // Networks
  BP: "BP",
  EndesaX: "Endesa-X",
  Etecnic: "Etecnic",
  Galp: "Galp",
  Iberdrola: "Iberdrola",
  Ibil: "Ibil",
  Ionity: "Ionity",
  Moeve: "Moeve",
  Repsol: "Repsol",
  Shell: "Shell",
  TeslaSC: "Tesla Supercharger",
  Wenea: "Wenea",
  Zunder: "Zunder",


} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];

/** All valid tags as an array, for schema validation */
export const ALL_TAGS = Object.values(TAGS);
