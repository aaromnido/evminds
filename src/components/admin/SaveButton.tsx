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
  // Armed on click; consumed once the submit this button triggered actually
  // starts navigating.
  const pendingRef = useRef(false);

  useEffect(() => {
    // Native (non-intercepted) submit: the browser will POST + reload, so show
    // the spinner now. Under <ClientRouter/> (View Transitions, active in admin)
    // Astro preventDefaults the submit to drive it as a client navigation, so
    // defaultPrevented is always true here — we can't gate on it; we wait for the
    // navigation lifecycle below instead. A validation-blocked submit is also
    // defaultPrevented but starts no navigation, so no spinner — exactly right.
    const onSubmit = (e: Event) => {
      if (!pendingRef.current || e.defaultPrevented) return;
      pendingRef.current = false;
      setSaving(true);
    };
    // ClientRouter path: fires only when the intercepted submit actually begins
    // navigating (i.e. it passed validation). The DOM swap on success remounts
    // this button fresh, so saving resets on its own.
    const onPrep = () => {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      setSaving(true);
    };
    document.addEventListener("submit", onSubmit);
    document.addEventListener("astro:before-preparation", onPrep);
    return () => {
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("astro:before-preparation", onPrep);
    };
  }, []);

  return (
    <Button
      {...props}
      type="submit"
      className={cn(saving && "pointer-events-none opacity-75", className)}
      onClick={() => {
        pendingRef.current = true;
      }}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {saving ? loadingText : children}
    </Button>
  );
}
