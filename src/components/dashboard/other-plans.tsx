import { PlanCard } from "@/components/plan/plan-card";
import type { WeddingPlan } from "@/lib/types";
import { CARD, NewPlanButton, SECTION_TITLE } from "./ui";

/**
 * "Tus otros planes" (si los hay) con la acción de crear otro plan siempre a
 * mano. Con un único plan queda una franja discreta, no una sección vacía.
 */
export function OtherPlans({ plans }: { plans: WeddingPlan[] }) {
  if (plans.length === 0) {
    return (
      <section
        aria-labelledby="new-plan-title"
        className={`${CARD} flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6`}
      >
        <div>
          <h2 id="new-plan-title" className="font-display text-lg font-semibold text-[#102D28]">
            ¿Organizas otra celebración?
          </h2>
          <p className="text-sm text-[#586C64]">
            Cada plan tiene su propia fecha, presupuesto, invitados y proveedores.
          </p>
        </div>
        <NewPlanButton variant="secondary" />
      </section>
    );
  }

  return (
    <section aria-labelledby="other-plans-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="other-plans-title" className={SECTION_TITLE}>
          Tus otros planes
        </h2>
        <NewPlanButton variant="secondary" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <li key={plan.id} className="min-w-0">
            <PlanCard plan={plan} tone={i % 2 === 0 ? "sage" : "lilac"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
