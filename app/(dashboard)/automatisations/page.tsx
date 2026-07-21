import { MailIcon, MessageSquareIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";

import { EditTemplateDialog } from "@/components/automations/edit-template-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_COMPTE_RENDU_PROMPT, DEFAULT_PREPARATION_PROMPT } from "@/lib/constants/prompts";
import { getAutomationSteps } from "@/services/automations";
import { getTemplatesByKeys } from "@/services/templates";

export const metadata: Metadata = {
  title: "Automatisations",
};

const AI_PROMPTS = [
  {
    key: "prompt.compte-rendu",
    label: "Prompt — Compte rendu de rendez-vous",
    description: "Utilisé pour générer le compte rendu à partir de la transcription Fireflies.",
    defaultContent: DEFAULT_COMPTE_RENDU_PROMPT,
  },
  {
    key: "prompt.preparation",
    label: "Prompt — Préparation de rendez-vous",
    description: "Utilisé pour générer la fiche de préparation envoyée la veille du RDV.",
    defaultContent: DEFAULT_PREPARATION_PROMPT,
  },
];

export default async function AutomatisationsPage() {
  const [steps, promptOverrides] = await Promise.all([
    getAutomationSteps(),
    getTemplatesByKeys(AI_PROMPTS.map((prompt) => prompt.key)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Automatisations</h1>
        <p className="text-muted-foreground text-sm">
          Modèles de messages pour chaque étape du cycle de rendez-vous. Modifiables directement,
          sans toucher au code.
        </p>
      </div>

      <div className="relative flex flex-col gap-6 pl-6">
        <div className="bg-border absolute top-2 bottom-2 left-[9px] w-px" />
        {steps.map((step) => (
          <div key={step.id} className="relative">
            <div className="border-primary bg-background absolute top-1 -left-6 size-4.5 rounded-full border-2" />
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {step.trigger} · {step.title}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {step.channel === "Email" ? (
                      <MailIcon className="size-3" />
                    ) : (
                      <MessageSquareIcon className="size-3" />
                    )}
                    {step.channel}
                  </Badge>
                  <Badge variant="secondary">{step.status}</Badge>
                  <EditTemplateDialog
                    templateKey={`automation.${step.id}`}
                    label={step.title}
                    category="automation"
                    content={step.message}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-line">
                  {step.message}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <SparklesIcon className="size-4" />
          Prompts IA
        </h2>
        <div className="flex flex-col gap-4">
          {AI_PROMPTS.map((prompt) => {
            const content = promptOverrides.get(prompt.key) ?? prompt.defaultContent;
            return (
              <Card key={prompt.key}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{prompt.label}</CardTitle>
                    <p className="text-muted-foreground text-sm">{prompt.description}</p>
                  </div>
                  <EditTemplateDialog
                    templateKey={prompt.key}
                    label={prompt.label}
                    category="prompt"
                    content={content}
                  />
                </CardHeader>
                <CardContent>
                  <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-line">{content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
