import { ExternalLink } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  published: boolean;
  onPublishedChange: (value: boolean) => void;
  publishedDate: string;
  onPublishedDateChange: (value: string) => void;
  publishedUrl: string;
  onPublishedUrlChange: (value: string) => void;
  disabled?: boolean;
}

/** A URL worth opening, or null while the field isn't one yet. */
function openableUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

/**
 * Our own record of what actually happened on Motor.es' site (Fer, 2026-07-27).
 *
 * Not one of their CMS columns — those are `CmsHeadlineFields` / `CmsSearchFields`
 * / `CmsRecordFields` above, mirroring their form. This is the opposite
 * direction: it exists so this piece keeps the real publish date and the live
 * link once Fer actually pastes it into their CMS, which is often a later visit
 * to this same screen rather than the first pass.
 *
 * It doubles as an honest signal for the EVminds pipeline: `published` is what
 * tells the redactor there is a genuinely live text to adapt, instead of
 * guessing from this draft's own `done` status, which only means "finished on
 * our side", not "actually on their site".
 */
export default function PublicationRecordFields({
  published,
  onPublishedChange,
  publishedDate,
  onPublishedDateChange,
  publishedUrl,
  onPublishedUrlChange,
  disabled,
}: Props) {
  const openUrl = openableUrl(publishedUrl);

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Switch checked={published} onCheckedChange={onPublishedChange} disabled={disabled} />
        <Label>Publicado</Label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="motor-published-date">Fecha de publicación</Label>
          <Input
            id="motor-published-date"
            type="date"
            value={publishedDate}
            onChange={(e) => onPublishedDateChange(e.target.value)}
            disabled={disabled}
            className="w-fit min-w-[9.5rem]"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="motor-published-url">URL</Label>
          <div className="flex items-center gap-2">
            <Input
              id="motor-published-url"
              type="url"
              value={publishedUrl}
              onChange={(e) => onPublishedUrlChange(e.target.value)}
              disabled={disabled}
              placeholder="https://motor.es/…"
              className="min-w-0 flex-1"
            />
            {openUrl ? (
              <IconButton
                icon={ExternalLink}
                variant="outline"
                size="icon"
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir la noticia en Motor.es"
              />
            ) : (
              <IconButton
                icon={ExternalLink}
                variant="outline"
                size="icon"
                disabled
                aria-label="Abrir la noticia en Motor.es"
              />
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Márcalo cuando ya esté en su web. Así EVminds sabe que hay un texto real que adaptar, no
        solo un borrador nuestro.
      </p>
    </div>
  );
}
