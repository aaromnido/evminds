import { useState, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface Props extends Omit<ButtonProps, "type" | "disabled" | "onClick"> {
  /** Text shown while submitting. Defaults to "Guardando…" */
  loadingText?: string;
}

export default function SaveButton({
  children = "Guardar",
  loadingText = "Guardando…",
  className,
  ...props
}: Props) {
  const [saving, setSaving] = useState(false);
  // Flag set on click; consumed by the document-level submit listener that fires
  // AFTER React's root handler — so defaultPrevented already reflects validation.
  const pendingRef = useRef(false);

  useEffect(() => {
    const onSubmit = (e: Event) => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      if (!e.defaultPrevented) setSaving(true);
    };
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);

  return (
    <Button
      {...props}
      type="submit"
      className={cn(saving && "pointer-events-none opacity-75", className)}
      onClick={() => { pendingRef.current = true; }}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving ? loadingText : children}
    </Button>
  );
}
