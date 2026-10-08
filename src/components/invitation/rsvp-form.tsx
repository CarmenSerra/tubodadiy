"use client";

import * as React from "react";
import { HeartIcon, Loader2Icon, SendIcon } from "lucide-react";

import { LIMITS, type RsvpAnswer } from "@/components/invitation/invitation-model";
import { loadRsvp, submitRsvp } from "@/lib/actions/invitation-rsvp";
import { cn } from "@/lib/utils";

const storageKey = (slug: string) => `tubodadiy:rsvp:${slug}`;

function readStoredId(slug: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}

function writeStoredId(slug: string, id: string) {
  try {
    window.localStorage.setItem(storageKey(slug), id);
  } catch {
    /* sin almacenamiento: no se podrá editar desde este navegador */
  }
}

type Choice = "yes" | "no" | null;

interface FormState {
  name: string;
  attending: Choice;
  plusOne: Choice;
  plusOneName: string;
  dietary: string;
  message: string;
}

const EMPTY: FormState = { name: "", attending: null, plusOne: null, plusOneName: "", dietary: "", message: "" };

function fromAnswer(a: RsvpAnswer): FormState {
  return {
    name: a.name,
    attending: a.attending ? "yes" : "no",
    plusOne: a.attending ? (a.plusOne ? "yes" : "no") : null,
    plusOneName: a.plusOneName,
    dietary: a.dietary,
    message: a.message,
  };
}

type FieldKey = "name" | "attending" | "plusOneName" | "dietary" | "message";

/**
 * Formulario de respuesta de la invitación. Recuerda en este navegador el id de
 * la respuesta (localStorage, con try/catch) para poder editarla después.
 */
export function RsvpForm({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [phase, setPhase] = React.useState<"form" | "thanks">("form");
  const [rsvpId, setRsvpId] = React.useState<string | null>(null);
  // Lo último que se guardó: «Cancelar» al editar vuelve a esto.
  const [saved, setSaved] = React.useState<FormState>(EMPTY);
  const [editing, setEditing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = React.useState("");
  const honeypot = React.useRef<HTMLInputElement>(null);
  const thanksRef = React.useRef<HTMLDivElement>(null);

  // ¿Este navegador ya respondió? Se recupera la respuesta para enseñarla.
  React.useEffect(() => {
    if (preview) return;
    const stored = readStoredId(slug);
    if (!stored) return;
    let cancelled = false;
    loadRsvp(slug, stored)
      .then((answer) => {
        if (cancelled || !answer) return;
        setRsvpId(stored);
        setForm(fromAnswer(answer));
        setSaved(fromAnswer(answer));
        setPhase("thanks");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, preview]);

  React.useEffect(() => {
    if (phase === "thanks" && !editing) thanksRef.current?.focus();
  }, [phase, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate(): boolean {
    const next: Partial<Record<FieldKey, string>> = {};
    if (form.name.trim().length < 2) next.name = "Escribe tu nombre y apellidos.";
    if (!form.attending) next.attending = "Cuéntanos si vienes.";
    setErrors(next);
    if (next.name) document.getElementById("rsvp-name")?.focus();
    else if (next.attending) document.getElementById("rsvp-attending")?.focus();
    return Object.keys(next).length === 0;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (preview || pending) return;
    setFormError("");
    if (!validate()) return;
    const attending = form.attending === "yes";
    startTransition(async () => {
      try {
        const result = await submitRsvp({
          slug,
          rsvpId,
          name: form.name,
          attending,
          plusOne: attending && form.plusOne === "yes",
          plusOneName: form.plusOneName,
          dietary: form.dietary,
          message: form.message,
          website: honeypot.current?.value ?? "",
        });
        if (result.ok) {
          setRsvpId(result.rsvpId);
          setSaved(form);
          writeStoredId(slug, result.rsvpId);
          setEditing(false);
          setPhase("thanks");
        } else {
          if (result.field) setErrors({ [result.field]: result.error });
          else setFormError(result.error);
          if (result.field) document.getElementById(`rsvp-${result.field}`)?.focus();
        }
      } catch {
        setFormError("No hemos podido enviar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
      }
    });
  }

  if (phase === "thanks" && !preview) {
    const attending = form.attending === "yes";
    const first = form.name.trim().split(/\s+/)[0] ?? "";
    return (
      <div className="inv-thanks" ref={thanksRef} tabIndex={-1} role="status" aria-live="polite">
        <span className="inv-thanksIcon">
          <HeartIcon aria-hidden="true" />
        </span>
        <h3 className="inv-thanksTitle">¡Gracias{first ? `, ${first}` : ""}!</h3>
        <p className="inv-thanksText">
          {attending
            ? "Hemos recibido tu confirmación. ¡Nos hace mucha ilusión que vengas!"
            : "Hemos recibido tu respuesta. Sentimos que no puedas venir; gracias por avisarnos."}
        </p>
        {form.plusOne === "yes" && attending && (
          <p className="inv-thanksText">
            Vienes con acompañante{form.plusOneName ? `: ${form.plusOneName}` : ""}.
          </p>
        )}
        <button
          type="button"
          className="inv-linkBtn"
          onClick={() => {
            setEditing(true);
            setPhase("form");
          }}
        >
          Cambiar mi respuesta
        </button>
      </div>
    );
  }

  const attending = form.attending === "yes";

  return (
    <form className="inv-form" onSubmit={onSubmit} noValidate aria-describedby={formError ? "rsvp-form-error" : undefined}>
      <fieldset disabled={preview || pending} className="inv-fields">
        <legend className="sr-only">Confirmación de asistencia</legend>

        <div className="inv-field">
          <label htmlFor="rsvp-name" className="inv-label">
            Nombre y apellidos
          </label>
          <input
            id="rsvp-name"
            name="name"
            className="inv-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={LIMITS.guestName}
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "rsvp-name-error" : undefined}
            placeholder="Tu nombre"
          />
          {errors.name && (
            <p id="rsvp-name-error" className="inv-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="inv-field" role="radiogroup" aria-labelledby="rsvp-attending-label">
          <span id="rsvp-attending-label" className="inv-label">
            ¿Vienes a la boda?
          </span>
          <div className="inv-choices">
            <label className="inv-choice">
              <input
                id="rsvp-attending"
                type="radio"
                name="attending"
                value="yes"
                checked={form.attending === "yes"}
                onChange={() => set("attending", "yes")}
              />
              <span>¡Sí, allí estaré!</span>
            </label>
            <label className="inv-choice">
              <input
                type="radio"
                name="attending"
                value="no"
                checked={form.attending === "no"}
                onChange={() => set("attending", "no")}
              />
              <span>No podré ir</span>
            </label>
          </div>
          {errors.attending && (
            <p className="inv-error" role="alert">
              {errors.attending}
            </p>
          )}
        </div>

        {attending && (
          <>
            <div className="inv-field" role="radiogroup" aria-labelledby="rsvp-plus-label">
              <span id="rsvp-plus-label" className="inv-label">
                ¿Vienes con acompañante?
              </span>
              <div className="inv-choices">
                <label className="inv-choice">
                  <input
                    type="radio"
                    name="plusOne"
                    value="yes"
                    checked={form.plusOne === "yes"}
                    onChange={() => set("plusOne", "yes")}
                  />
                  <span>Sí</span>
                </label>
                <label className="inv-choice">
                  <input
                    type="radio"
                    name="plusOne"
                    value="no"
                    checked={form.plusOne === "no"}
                    onChange={() => set("plusOne", "no")}
                  />
                  <span>No, voy sin acompañante</span>
                </label>
              </div>
            </div>

            {form.plusOne === "yes" && (
              <div className="inv-field">
                <label htmlFor="rsvp-plusOneName" className="inv-label">
                  Nombre del acompañante
                </label>
                <input
                  id="rsvp-plusOneName"
                  name="plusOneName"
                  className="inv-input"
                  value={form.plusOneName}
                  onChange={(e) => set("plusOneName", e.target.value)}
                  maxLength={LIMITS.plusOneName}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.plusOneName)}
                  placeholder="Nombre y apellidos"
                />
                {errors.plusOneName && (
                  <p className="inv-error" role="alert">
                    {errors.plusOneName}
                  </p>
                )}
              </div>
            )}

            <div className="inv-field">
              <label htmlFor="rsvp-dietary" className="inv-label">
                Alergias o dieta <span className="inv-optional">(opcional)</span>
              </label>
              <textarea
                id="rsvp-dietary"
                name="dietary"
                className="inv-textarea"
                value={form.dietary}
                onChange={(e) => set("dietary", e.target.value)}
                maxLength={LIMITS.dietary}
                rows={2}
                aria-invalid={Boolean(errors.dietary)}
                placeholder="Vegetariano, celiaquía, alergia a los frutos secos…"
              />
              {errors.dietary && (
                <p className="inv-error" role="alert">
                  {errors.dietary}
                </p>
              )}
            </div>
          </>
        )}

        <div className="inv-field">
          <label htmlFor="rsvp-message" className="inv-label">
            Un mensaje para la pareja <span className="inv-optional">(opcional)</span>
          </label>
          <textarea
            id="rsvp-message"
            name="message"
            className="inv-textarea"
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            maxLength={LIMITS.rsvpMessage}
            rows={3}
            aria-invalid={Boolean(errors.message)}
            placeholder="Unas palabras para recordar…"
          />
          {errors.message && (
            <p className="inv-error" role="alert">
              {errors.message}
            </p>
          )}
        </div>

        {/* Señuelo anti-bots: las personas no lo ven. */}
        <div className="inv-hp" aria-hidden="true">
          <label>
            No rellenar este campo
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {formError && (
          <p id="rsvp-form-error" className="inv-formError" role="alert">
            {formError}
          </p>
        )}

        <button type={preview ? "button" : "submit"} className={cn("inv-submit")} disabled={pending}>
          {pending ? <Loader2Icon aria-hidden="true" className="animate-spin" /> : <SendIcon aria-hidden="true" />}
          {editing || rsvpId ? "Guardar cambios" : "Enviar respuesta"}
        </button>
      </fieldset>
      {editing && (
        <button
          type="button"
          className="inv-linkBtn"
          onClick={() => {
            setEditing(false);
            setForm(saved);
            setErrors({});
            setFormError("");
            setPhase("thanks");
          }}
        >
          Cancelar
        </button>
      )}
    </form>
  );
}
