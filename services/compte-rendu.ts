import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic, ANTHROPIC_MODEL } from "@/integrations/anthropic";
import { DEFAULT_COMPTE_RENDU_PROMPT } from "@/lib/constants/prompts";
import { prisma } from "@/lib/prisma";
import { compteRenduSchema } from "@/lib/validations/compte-rendu";
import { sendCompteRenduEmail } from "@/services/mail";
import { getTemplateContent } from "@/services/templates";

export async function genererEtEnregistrerCompteRendu(rendezVousId: string, texteSource: string) {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({ where: { id: rendezVousId } });
  const systemPrompt = await getTemplateContent("prompt.compte-rendu", DEFAULT_COMPTE_RENDU_PROMPT);

  const message = await anthropic.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Voici la transcription (ou les notes) du rendez-vous avec ${rendezVous.prenom} ${rendezVous.nom} (${rendezVous.societe}) :\n\n${texteSource}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(compteRenduSchema),
    },
  });

  const compteRendu = message.parsed_output;

  if (!compteRendu) {
    throw new Error("La synthèse n'a pas pu être générée.");
  }

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { compteRendu },
  });

  await sendCompteRenduEmail(rendezVous, compteRendu).catch((error) => {
    console.error("Erreur envoi email du compte rendu :", error);
  });

  return compteRendu;
}
