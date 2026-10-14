"use client";

import * as React from "react";
import { HeartIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import "./invitation.css";

/** Duración de la apertura (ms) hasta que sale el botón: va con las animaciones de invitation.css. */
const OPENING_MS = 2000;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export interface OpeningLabels {
  /** Nombre de la región con el sobre y las tarjetas. */
  scene: string;
  /** `aria-label` del sello (es un botón). */
  seal: string;
  /** Indicio discreto bajo el sobre. */
  hint: string;
  /** Aviso para lectores de pantalla cuando el sobre ya está abierto. */
  opened: string;
  /** Texto del botón que abre la confirmación. */
  cta: string;
  dialogTitle: string;
  dialogDescription: string;
}

interface InvitationOpeningProps {
  labels: OpeningLabels;
  /** El sobre (con `animated`) y su sello, la invitación y la tarjetita de agradecimiento ya pintadas. */
  envelope: React.ReactNode;
  seal: React.ReactNode;
  card: React.ReactNode;
  thanks: React.ReactNode;
  /** Línea bajo el botón (p. ej. «confirma antes del…»). */
  note?: React.ReactNode;
  /** Contenido del diálogo: el formulario de respuesta (o el aviso de plazo cerrado). */
  dialogBody: React.ReactNode;
  /** El diálogo se pinta en un portal, fuera de la invitación: lleva su propia copia del tema. */
  sheet: { className: string; style?: React.CSSProperties; template: string; themed: boolean; lang: string };
  /** Lo que va debajo del botón (detalles, regalo…): aparece cuando el sobre está abierto. */
  children?: React.ReactNode;
}

/**
 * Apertura del sobre de la página pública. Empieza cerrado y sellado; al tocar el
 * sello este se despega, la solapa se abre, el sobre se coloca y salen las tarjetas
 * hasta quedar como la vista previa del editor. Debajo, el botón que abre la
 * confirmación en un diálogo. La animación es solo CSS (`data-phase` en la raíz);
 * aquí solo vive la fase. No se guarda nada: al recargar vuelve a estar cerrado.
 * Con «reducir movimiento» no hay sello ni animación: se ve abierto directamente.
 */
export function InvitationOpening({
  labels,
  envelope,
  seal,
  card,
  thanks,
  note,
  dialogBody,
  sheet,
  children,
}: InvitationOpeningProps) {
  const reduced = React.useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );
  const [started, setStarted] = React.useState<"closed" | "opening" | "open">("closed");
  const phase = reduced ? "open" : started;
  const ctaRef = React.useRef<HTMLButtonElement>(null);
  const focusCta = React.useRef(false);

  React.useEffect(() => {
    if (started !== "opening") return;
    const timer = window.setTimeout(() => setStarted("open"), OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [started]);

  // Al terminar, con teclado el foco pasa al botón (el sello ya no está); con ratón no hace falta.
  React.useEffect(() => {
    if (phase === "open" && focusCta.current) {
      focusCta.current = false;
      ctaRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  const open = phase === "open";

  return (
    <div className="inv-open" data-phase={phase}>
      <section className="inv-openStageWrap" aria-label={labels.scene}>
        <div className="inv-openScene">
          <div className="inv-openStage">
            <div className="inv-openEnvWrap">
              {envelope}
              {phase !== "open" && !reduced && (
                <button
                  type="button"
                  className="inv-seal"
                  aria-label={labels.seal}
                  disabled={phase !== "closed"}
                  onClick={(event) => {
                    focusCta.current = event.detail === 0;
                    setStarted("opening");
                  }}
                >
                  {seal}
                </button>
              )}
            </div>
            <div className="inv-openCard">{card}</div>
            <div className="inv-openThanks">{thanks}</div>
            {phase !== "open" && !reduced && (
              <p className="inv-openHint" aria-hidden={phase !== "closed"}>
                {labels.hint}
              </p>
            )}
          </div>
        </div>

        <div className="inv-openAction">
          {open && (
            <div className="inv-openCta">
              <Dialog>
                <DialogTrigger asChild>
                  <button ref={ctaRef} type="button" className="inv-ctaBtn">
                    <HeartIcon aria-hidden="true" />
                    {labels.cta}
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="inv-sheetContent p-0 gap-0 max-w-md bg-transparent border-0"
                  onOpenAutoFocus={(event) => {
                    // En el móvil, enfocar un campo abriría el teclado antes de leer nada.
                    event.preventDefault();
                    (event.currentTarget as HTMLElement | null)?.focus();
                  }}
                >
                  <div
                    className={cn("inv-root inv-sheet", sheet.className)}
                    data-template={sheet.template}
                    data-themed={sheet.themed ? "" : undefined}
                    style={sheet.style}
                    lang={sheet.lang}
                  >
                    <DialogTitle className="inv-sheetTitle">{labels.dialogTitle}</DialogTitle>
                    <DialogDescription className="inv-sheetText">{labels.dialogDescription}</DialogDescription>
                    {dialogBody}
                  </div>
                </DialogContent>
              </Dialog>
              {note && <p className="inv-openNote">{note}</p>}
            </div>
          )}
        </div>

        <p className="sr-only" role="status">
          {open && !reduced ? labels.opened : ""}
        </p>
      </section>

      {open && <div className="inv-after">{children}</div>}
    </div>
  );
}
