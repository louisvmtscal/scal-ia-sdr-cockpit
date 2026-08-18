import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { anthropic, ANTHROPIC_MODEL } from "@/integrations/anthropic";
import { DEFAULT_COMPTE_RENDU_PROMPT } from "@/lib/constants/prompts";
import { prisma } from "@/lib/prisma";
import { compteRenduSchema, type CompteRendu } from "@/lib/validations/compte-rendu";
import { getTemplateContent } from "@/services/templates";

/**
 * Génère un compte rendu structuré à partir d'une transcription et l'enregistre
 * sur le rendez-vous. Aucun effet de bord : ni email, ni WhatsApp/SMS, ni
 * changement du statut Qualifié. Jamais déclenché automatiquement —
 * uniquement à l'initiative de l'utilisateur (bouton "✨ Générer le compte rendu").
 */
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

  return compteRendu;
}

/**
 * Enregistre une modification manuelle du compte rendu. Pure sauvegarde :
 * aucun appel IA, aucun email — c'est l'utilisateur qui a rédigé le contenu.
 */
export async function modifierCompteRendu(rendezVousId: string, compteRendu: CompteRendu) {
  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { compteRendu },
  });
  return compteRendu;
}
