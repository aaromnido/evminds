import { CheckCircle2, Info, Loader2, RotateCw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ReviewFinding, ReviewResult, ReviewSeverity } from "@/lib/editorial-types";

const CATEGORIES = ["contenido", "forma", "ortografia"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABEL: Record<Category, string> = {
  contenido: "Contenido",
  forma: "Forma",
  ortografia: "Ortografía y tipografía",
};

const SEVERITY_LABEL: Record<ReviewSeverity, string> = {
  recomendacion: "Recomendación",
  aviso: "Aviso",
  danger: "Grave",
};

const SEVERITY_ICON = {
  recomendacion: Info,
  aviso: TriangleAlert,
  danger: TriangleAlert,
} as const;

/**
 * Pill tones, same `color-mix` treatment as `ReferenceLinkRow`'s status pill
 * and `FieldCounter`'s over-limit pill. A recomendación gets no tint on
 * purpose: it is not a problem, and coloring it like one would put it on the
 * same visual footing as a real spelling error.
 */
const SEVERITY_TONE: Record<ReviewSeverity, string | null> = {
  recomendacion: null,
  aviso: "--ev-tone-amber",
  danger: "--ev-tone-red",
};

function pillStyle(severity: ReviewSeverity): React.CSSProperties | undefined {
  const tone = SEVERITY_TONE[severity];
  if (!tone) return undefined;
  return {
    backgroundColor: `color-mix(in oklab, var(${tone}) 18%, var(--background))`,
    color: `color-mix(in oklab, var(${tone}) 45%, var(--foreground))`,
  };
}

/**
 * One cached report: the exact text it covers, the findings, and which of
 * them Fer has already ticked off. `reviewedKey` is `JSON.stringify([title,
 * body])` at generation time — the parent compares it against the live text
 * to know whether this report has gone stale.
 */
export interface ReviewSession {
  reviewedKey: string;
  result: ReviewResult;
  /** Ticked findings, keyed by `${category}:${index}`. */
  checked: Record<string, boolean>;
}

interface Props {
  loading: boolean;
  error: string | null;
  session: ReviewSession | null;
  /** True once title/body changed since `session.reviewedKey`. */
  stale: boolean;
  onToggleFinding: (key: string) => void;
  onRerun: () => void;
  onClose: () => void;
}

/**
 * The Revisor AI's report, docked beside the body editor (`DraftBodyField`)
 * rather than in a modal drawer: a checklist you tick off while fixing things
 * has to stay visible at the same time as the text you are editing, which a
 * `Sheet` (see `ArticlePreviewSheet`) cannot do without blocking the form
 * behind it (Fer, 2026-08-03).
 *
 * `h-full` (stretched by the flex row in `DraftBodyField` to the editor's
 * real height) PLUS a fixed `max-h` as a ceiling: a piece with many findings
 * has no natural limit, and without the cap the panel — and the whole flex
 * row with it — grew to fit every last one instead of scrolling internally
 * past a sane height (Fer, 2026-08-04).
 */
export default function ArticleReviewPanel({
  loading,
  error,
  session,
  stale,
  onToggleFinding,
  onRerun,
  onClose,
}: Props) {
  const totalFindings = session
    ? CATEGORIES.reduce((sum, category) => sum + session.result[category].length, 0)
    : 0;

  return (
    <div className="flex h-full max-h-[40rem] flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Informe del revisor</h3>
          <p className="text-xs text-muted-foreground">
            Orientación, no bloqueo: decides tú qué corriges.
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar el informe">
          <X />
        </Button>
      </div>

      {stale && session && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-2.5 text-xs">
          <span>El texto ha cambiado desde esta revisión.</span>
          <Button variant="outline" size="sm" onClick={onRerun}>
            <RotateCw />
            Revisar de nuevo
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Revisando el artículo…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={onRerun}>
            <RotateCw />
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && session && (
        <div className="flex-1 overflow-y-auto">
          {totalFindings === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sin hallazgos. Todo en orden.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {CATEGORIES.map((category) => {
                const findings = session.result[category];
                if (findings.length === 0) return null;
                return (
                  <div key={category} className="grid gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {CATEGORY_LABEL[category]}
                    </h4>
                    <ul className="grid gap-2">
                      {findings.map((finding: ReviewFinding, index) => {
                        const key = `${category}:${index}`;
                        const checked = Boolean(session.checked[key]);
                        const Icon = SEVERITY_ICON[finding.severidad];
                        const pill = (
                          <span
                            className={cn(
                              "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              !SEVERITY_TONE[finding.severidad] && "bg-muted text-muted-foreground",
                            )}
                            style={pillStyle(finding.severidad)}
                          >
                            <Icon className="size-3.5" />
                            {SEVERITY_LABEL[finding.severidad]}
                          </span>
                        );

                        return (
                          <li
                            key={key}
                            className={cn(
                              "flex min-w-0 gap-2.5 rounded-lg border border-border p-2.5",
                              checked ? "items-center" : "items-start",
                              checked && "opacity-60",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => onToggleFinding(key)}
                              className={cn(!checked && "mt-0.5")}
                            />
                            {/* Checked: collapsed to pill + truncated title, so a
                                ticked-off finding takes one line instead of
                                still eating the same room as an open one
                                (Fer, 2026-08-04). `min-w-0` all the way down —
                                on the `li`, this wrapper, AND the `p` — is what
                                lets `truncate` actually clip instead of the
                                text pushing every ancestor wider (a flex/grid
                                item's default `min-width: auto` refuses to
                                shrink below its content otherwise). */}
                            {checked ? (
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                {pill}
                                <p className="min-w-0 flex-1 truncate text-sm line-through">
                                  {finding.mensaje}
                                </p>
                              </div>
                            ) : (
                              <div className="grid gap-1">
                                {pill}
                                <p className="text-sm">{finding.mensaje}</p>
                                {finding.recomendacion && (
                                  <p className="text-xs text-muted-foreground">
                                    {finding.recomendacion}
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
