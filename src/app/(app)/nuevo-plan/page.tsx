import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Nuevo plan de boda — tubodadiy",
};

export default function NewPlanPage() {
  return <OnboardingFlow />;
}
