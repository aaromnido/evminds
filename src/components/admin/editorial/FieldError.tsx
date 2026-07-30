import { CircleAlert } from "lucide-react";

interface Props {
  id?: string;
  /** Null or empty renders nothing, so callers can pass the error straight in. */
  message?: string | null;
}

/**
 * The one way this section says "this field isn't right yet": destructive text
 * with an icon, under the field it belongs to and tied to it via
 * `aria-describedby`.
 *
 * It exists as a component so every field says it the same way — and so the day
 * the treatment changes, it changes once.
 */
export default function FieldError({ id, message }: Props) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      {message}
    </p>
  );
}
