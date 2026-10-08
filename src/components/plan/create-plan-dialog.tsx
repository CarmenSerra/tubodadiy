// Estilos de marca compartidos por los formularios del plan (EditPlanDialog y
// los editores en el sitio). La creación de planes ya no es un diálogo: vive
// en el flujo a pantalla completa de `/nuevo-plan` (components/onboarding).
export const PLAN_LABEL = "text-sm font-medium leading-none text-ink";
export const PLAN_FIELD =
  "h-11 rounded-xl border-line-strong bg-field text-base text-ink-strong shadow-none placeholder:text-ink-placeholder focus-visible:ring-lilac focus-visible:ring-offset-0 sm:text-sm";
export const PLAN_HELP = "text-xs text-ink-muted";
/** Foco de los botones sobre el fondo crema del diálogo. */
export const PLAN_BUTTON_FOCUS = "focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50";
