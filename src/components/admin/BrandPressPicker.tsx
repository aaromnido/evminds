import { useId, useMemo, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Check, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BRAND_MEDIA_PORTALS,
  resolveBrand,
  searchBrands,
  type BrandMediaPortal,
} from "@/lib/brand-media-portals";

/**
 * The third way of getting a hero image: the manufacturer's official press room
 * (Phase 6A.1).
 *
 * **Scope, narrow on purpose: this opens a tab.** No download, no API, no
 * scraping. Fer picks a brand, lands on its media site, downloads a free,
 * high-resolution, editorially cleared photo, and comes back to the upload flow
 * that already exists. Its whole value is that it costs nothing and removes a
 * daily friction — he does this jump by hand today, digging the URL out of
 * memory or out of Google.
 *
 * It lives inside `ImageDropZone`'s empty state, so the five surfaces that
 * render the drop zone (the two news forms, Artículos, the wizard's image step
 * and the body-image modal) get it from one place. Once there IS an image the
 * drop zone switches to preview mode and this disappears: replacing a photo
 * means removing the current one first, which is the flow that already exists.
 *
 * A Base UI Autocomplete and not a native `<datalist>`, for the same reason
 * `ToneSelect` is not a native `<select>`: the OS-styled dropdown clashes with
 * the panel. Zero new dependencies — `@base-ui/react` was already here.
 */

/** The button is disabled until the text resolves to a brand we actually have. */
const OPEN_LABEL = "Buscar fotos oficiales";

export default function BrandPressPicker({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  // Our own ranking (prefix before substring, aliases included) instead of Base
  // UI's built-in `contains` filter, which would put Leapmotor level with
  // Mercedes-Benz for "me".
  const matches = useMemo(() => searchBrands(query), [query]);

  // Only an exact hit counts: "Ferrari" resolves to nothing, so there is nowhere
  // to go and the button stays disabled rather than failing after the click.
  const brand = resolveBrand(query);

  const openPortal = () => {
    if (!brand) return;
    // Never a bare `target="_blank"` / `window.open(url, "_blank")`: that hands
    // the opened page a live `window.opener`.
    window.open(brand.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={inputId} className="text-xs text-muted-foreground">
        ¿Sin foto? Búscala en la sala de prensa oficial de la marca
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Autocomplete.Root
          items={BRAND_MEDIA_PORTALS}
          filteredItems={matches}
          value={query}
          onValueChange={setQuery}
          itemToStringValue={(item: BrandMediaPortal) => item.name}
          openOnInputClick
        >
          <Autocomplete.Input
            id={inputId}
            placeholder="Marca (ej. Hyundai)"
            autoComplete="off"
            className={cn(
              "h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
            )}
          />
          <Autocomplete.Portal>
            <Autocomplete.Positioner className="z-50" sideOffset={4}>
              <Autocomplete.Popup
                className={cn(
                  "max-h-[min(var(--available-height),16rem)] w-[var(--anchor-width)] overflow-y-auto",
                  "rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none",
                )}
              >
                <Autocomplete.Empty className="px-2 py-1.5 text-xs text-muted-foreground">
                  No tenemos la sala de prensa de esa marca. Sube la foto o pega una URL.
                </Autocomplete.Empty>
                <Autocomplete.List>
                  {(item: BrandMediaPortal) => (
                    <Autocomplete.Item
                      key={item.name}
                      value={item}
                      className={cn(
                        "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none select-none",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                      )}
                    >
                      <span className="truncate">{item.name}</span>
                      {item.access === "registration" && (
                        <span className="ml-auto shrink-0 text-[0.7rem] text-muted-foreground">
                          requiere cuenta
                        </span>
                      )}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!brand}
          onClick={openPortal}
          // In the wizard this button sits right next to the AI generation
          // panel, so the label has to be unmistakably *not* that.
          title={brand ? `Abrir ${brand.portal}` : "Escribe una marca de la lista"}
        >
          {brand ? <Check className="text-muted-foreground" /> : <ExternalLink />}
          {OPEN_LABEL}
        </Button>
      </div>

      {/* Said BEFORE the tab opens, not discovered on the other side: these three
          serve full-resolution downloads only to registered accounts. Free, but
          a wall all the same. */}
      {brand?.access === "registration" && (
        <p
          className="flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs"
          style={{
            backgroundColor: "color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))",
            color: "color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))",
          }}
        >
          <Info className="mt-px size-3.5 shrink-0" />
          <span>
            {brand.name} pide una cuenta gratuita para descargar en alta resolución. El registro es
            de una vez.
          </span>
        </p>
      )}
    </div>
  );
}
