/**
 * Canonical definitions for AI-generated transparency warnings.
 *
 * The Edge Function only stores the `type` of each warning; the user-facing
 * text is resolved here at render time. This keeps Gemini's output tokens
 * low and the wording consistent across articles.
 */

export type WarningType =
  | "price_non_european"
  | "price_subsidized"
  | "autonomy_cltc"
  | "autonomy_wltp_no_real"
  | "launch_non_european"
  | "prototype_as_product";

export interface AiWarning {
  type: WarningType;
}

interface WarningCopy {
  es: string;
  en: string;
}

export const WARNING_DEFINITIONS: Record<WarningType, WarningCopy> = {
  price_non_european: {
    es: "Precio mencionado fuera de Europa. Sin confirmación para el mercado europeo.",
    en: "Price quoted outside Europe. No confirmation for the European market.",
  },
  price_subsidized: {
    es: "Precio con subvenciones o ayudas incluidas. Sin ellas será más alto.",
    en: "Price includes subsidies or discounts. The unsubsidized price will be higher.",
  },
  autonomy_cltc: {
    es: "Autonomía en ciclo CLTC (China). En WLTP suele ser un 15-20% menor.",
    en: "Range in CLTC cycle (China). WLTP figures are typically 15-20% lower.",
  },
  autonomy_wltp_no_real: {
    es: "Autonomía WLTP de laboratorio. En uso real espera entre un 70% y un 90%.",
    en: "WLTP lab range. Real-world figures typically run 70-90% of WLTP.",
  },
  launch_non_european: {
    es: "Lanzamiento previsto fuera de Europa. Sin fecha confirmada para el mercado europeo.",
    en: "Launch planned outside Europe. No confirmed date for the European market.",
  },
  prototype_as_product: {
    es: "Tecnología aún en fase prototipo. No es un producto disponible para comprar.",
    en: "Technology still in prototype stage. Not yet a commercial product.",
  },
};

/**
 * Resolves the user-facing text for a warning in the article's language.
 * @param warning - The warning object (only `type` is read)
 * @param lang - Source language code (e.g. 'es', 'en'). Defaults to ES for unknown.
 */
export function resolveWarningText(warning: AiWarning, lang: string): string {
  const isEnglish = lang.toLowerCase().startsWith("en");
  return WARNING_DEFINITIONS[warning.type][isEnglish ? "en" : "es"];
}
