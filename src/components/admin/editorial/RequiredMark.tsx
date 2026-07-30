/**
 * The asterisk that says "this one is required", same treatment Artículos uses.
 *
 * It exists because of a real failure (Fer, 2026-07-26): the alt text is the one
 * required field on step ④ that arrives **empty**, its placeholder reads as a
 * filled value at a glance, and the only thing saying it was missing was the line
 * under the primary button, some 600 px further down. A disabled button cannot be
 * clicked, so it cannot explain itself where the problem is — the field has to.
 *
 * `aria-hidden` because screen readers get the same information from the input's
 * own `required`, and hearing "asterisk" adds nothing.
 */
export default function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      {" "}
      *
    </span>
  );
}
