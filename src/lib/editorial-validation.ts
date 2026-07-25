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
