/**
 * Client-side validation for the editorial brief (task A3, step ②).
 *
 * Kept apart from the components on purpose: this is the stable, non-visual half
 * of the screen — the shape of the UI keeps changing between iterations, these
 * rules do not. It is also the part worth covering with tests once the UI phase
 * closes (same reasoning as `editorial-utils.ts`).
 *
 * Messages are user-facing, so they are in Spanish and they say what to do, not
 * what went wrong.
 */

/** Below this a headline is too vague to steer anything. */
export const TITLE_MIN = 15;
/** Below this the angle is not an instruction, it is a wish. */
export const ANGLE_MIN = 30;

export interface BriefErrors {
  title: string | null;
  angle: string | null;
}

/** True when nothing blocks moving on. */
export function isBriefValid(errors: BriefErrors): boolean {
  return !errors.title && !errors.angle;
}

/** A draft shorter than this is not a piece, it is a note. */
export const BODY_MIN = 200;

export interface ChannelDraftErrors {
  title: string | null;
  body: string | null;
  image: string | null;
  schedule: string | null;
}

export interface ChannelDraftInput {
  title: string;
  body: string;
  imageUrl: string;
  publishDate: string;
  publishTime: string;
}

/**
 * What a piece needs before it can leave the panel.
 *
 * The hero image is required on both channels (requirement R2), so the step
 * cannot be closed without one and the reason is said out loud instead of
 * showing up as an error after the click.
 *
 * The date and time are **always required**, on both channels (Fer,
 * 2026-07-26) — even Motor.es, where it is a prediction rather than a
 * commitment, needs one filled in so the two channels' dates can be lined up.
 */
export function validateChannelDraft(input: ChannelDraftInput): ChannelDraftErrors {
  const body = input.body.trim();

  return {
    title: input.title.trim() ? null : "El titular no puede quedarse vacío.",
    body: !body
      ? "No hay texto que publicar."
      : body.length < BODY_MIN
        ? "El texto se ha quedado demasiado corto. Revísalo antes de darlo por bueno."
        : null,
    image: input.imageUrl.trim() ? null : "Hace falta una imagen de cabecera para publicar.",
    schedule:
      !input.publishDate || !input.publishTime ? "Elige la fecha y la hora de publicación." : null,
  };
}

export function isChannelDraftValid(errors: ChannelDraftErrors): boolean {
  return !errors.title && !errors.body && !errors.image && !errors.schedule;
}

/**
 * Both fields are required: without a headline and an angle the redactor has
 * nothing to aim at, and it would invent the piece rather than write yours.
 */
export function validateBrief(title: string, angle: string): BriefErrors {
  const t = title.trim();
  const a = angle.trim();

  return {
    title: !t
      ? "Ponle un titular, aunque sea provisional."
      : t.length < TITLE_MIN
        ? `Demasiado corto para orientar al redactor: al menos ${TITLE_MIN} caracteres.`
        : null,
    angle: !a
      ? "Cuenta qué quieres contar, aunque sea en una frase."
      : a.length < ANGLE_MIN
        ? `Con tan poco, el enfoque se lo inventa la IA. Escribe al menos una frase (${ANGLE_MIN} caracteres).`
        : null,
  };
}
