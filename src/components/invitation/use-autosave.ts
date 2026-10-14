"use client";

import * as React from "react";

/** Cómo termina una operación de guardado. */
export type SaveOutcome = "saved" | "blocked" | "error";

/** Lo que ve la persona: `pending` (cambios esperando la pausa) y `saving` se leen igual, «Guardando…». */
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "blocked" | "error";

interface Options<Args> {
  /** Pausa tras el último cambio antes de guardar. */
  delay?: number;
  /**
   * Hace el guardado leyendo el estado MÁS RECIENTE (de refs, no de lo que había al programarlo).
   * Devuelve `"blocked"` si ahora no se puede guardar (p. ej. enlace no válido) sin que sea un fallo;
   * si lanza, es un error. Nunca se ejecutan dos a la vez.
   */
  save: (args: Args) => Promise<"saved" | "blocked">;
  /** Se llama una vez por cada guardado fallido (para avisar con un toast). */
  onError: (error: unknown, args: Args) => void;
  /** Estado inicial: «guardado» si ya había una invitación guardada. */
  initial?: SaveStatus;
}

/**
 * Cola de guardado en serie con autoguardado.
 *
 * - `markChanged()` anota un cambio y (re)programa el guardado tras `delay` ms.
 * - Todo lo que escribe (autoguardados, publicar, despublicar) pasa por UNA misma cola: como
 *   mucho hay un guardado en vuelo y, detrás, un único autoguardado esperando turno, que al
 *   empezar lee el estado más reciente (así varios cambios seguidos caben en un solo guardado).
 * - Si un guardado falla, el cambio sigue pendiente: se reintenta con el siguiente cambio, con
 *   `retry()` o al salir (`flush`).
 * - `flush()` (al cambiar de pestaña, cerrar o salir de la página) guarda ya lo pendiente.
 */
export function useAutosave<Args extends object = Record<string, never>>({
  delay = 800,
  save,
  onError,
  initial = "idle",
}: Options<Args>) {
  const [status, setStatus] = React.useState<SaveStatus>(initial);

  const saveRef = React.useRef(save);
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => {
    saveRef.current = save;
    onErrorRef.current = onError;
  });

  /** Contador de cambios, y hasta qué cambio llega el último guardado correcto. */
  const revision = React.useRef(0);
  const covered = React.useRef(0);
  const timer = React.useRef<number | null>(null);
  /** Cola: cada tarea espera a la anterior. */
  const chain = React.useRef<Promise<unknown>>(Promise.resolve());
  /** Tareas en cola o en curso. */
  const active = React.useRef(0);
  /** Hay un autoguardado esperando turno (no hace falta encolar otro). */
  const waiting = React.useRef(false);
  /** Por qué sigue sin guardarse lo pendiente (si el último guardado falló o no pudo hacerse). */
  const failure = React.useRef<"error" | "blocked" | null>(null);

  const hasUnsaved = React.useCallback(() => revision.current > covered.current || active.current > 0, []);

  /** Encola una tarea (que nunca lanza) y mantiene el estado visible. */
  const enqueue = React.useCallback((task: () => Promise<SaveOutcome>): Promise<SaveOutcome> => {
    active.current += 1;
    setStatus("saving");
    const run = chain.current.then(task).catch((): SaveOutcome => "error");
    chain.current = run;
    return run.then((outcome) => {
      active.current -= 1;
      if (active.current === 0) {
        // Si siguió habiendo cambios mientras guardaba, ya viene otro guardado.
        if (timer.current !== null || waiting.current) setStatus("pending");
        else if (revision.current > covered.current) setStatus(failure.current ?? "pending");
        else setStatus("saved");
      }
      return outcome;
    });
  }, []);

  /** Un guardado: lo cubre todo hasta el cambio que había al empezar. */
  const runSave = React.useCallback(
    async (args: Args): Promise<SaveOutcome> => {
      const target = revision.current;
      try {
        const outcome = await saveRef.current(args);
        if (outcome === "saved") {
          covered.current = Math.max(covered.current, target);
          failure.current = null;
        } else {
          failure.current = "blocked";
        }
        return outcome;
      } catch (error) {
        failure.current = "error";
        onErrorRef.current(error, args);
        return "error";
      }
    },
    []
  );

  const requestSave = React.useCallback(() => {
    if (waiting.current) return;
    waiting.current = true;
    void enqueue(async () => {
      waiting.current = false;
      // Otro guardado (p. ej. publicar) ya lo cubrió todo mientras esperaba.
      if (revision.current <= covered.current) return "saved";
      return runSave({} as Args);
    });
  }, [enqueue, runSave]);

  const markChanged = React.useCallback(() => {
    revision.current += 1;
    if (active.current === 0) setStatus("pending");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      requestSave();
    }, delay);
  }, [delay, requestSave]);

  /** Guarda ya lo pendiente (sin esperar la pausa). */
  const flush = React.useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (revision.current > covered.current) requestSave();
  }, [requestSave]);

  /** Guarda ya, con parámetros propios (publicar), detrás de lo que esté en vuelo. */
  const saveNow = React.useCallback(
    (args: Args): Promise<SaveOutcome> => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      return enqueue(() => runSave(args));
    },
    [enqueue, runSave]
  );

  /**
   * Otra operación en la misma cola (despublicar): no se mezcla con un guardado en vuelo.
   * Sus errores los trata quien la pide; no cuentan como fallo de guardado.
   */
  const run = React.useCallback(
    async (task: () => Promise<void>): Promise<void> => {
      await enqueue(async () => {
        await task().catch(() => undefined);
        return "saved";
      });
    },
    [enqueue]
  );

  // Salir de la página (cambio de pestaña del plan, cierre) o ocultarla: se guarda lo pendiente.
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onPageHide = () => flush();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      flush();
      // Si aún queda algo sin guardar (en vuelo o sin poder guardarse), el navegador avisa.
      if (hasUnsaved()) event.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Salida dentro de la app: lo pendiente se guarda (la cola sigue viva aunque esta pantalla se desmonte).
      flush();
    };
  }, [flush, hasUnsaved]);

  return { status, markChanged, flush, saveNow, run, hasUnsaved };
}
