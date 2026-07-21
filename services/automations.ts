import { AUTOMATION_STEPS } from "@/lib/constants/automations";
import { getTemplatesByKeys } from "@/services/templates";

export async function getAutomationSteps() {
  const keys = AUTOMATION_STEPS.map((step) => `automation.${step.id}`);
  const overrides = await getTemplatesByKeys(keys);

  return AUTOMATION_STEPS.map((step) => ({
    ...step,
    message: overrides.get(`automation.${step.id}`) ?? step.message,
  }));
}
