import { addDays, startOfDay } from "date-fns";

import { anthropic, ANTHROPIC_MODEL } from "@/integrations/anthropic";
import { DEFAULT_PREPARATION_PROMPT } from "@/lib/constants/prompts";
import { prisma } from "@/lib/prisma";
import { preparationSchema } from "@/lib/validations/preparation";
import { sendPreparationEmail } from "@/services/mail";
import { getTemplateContent } from "@/services/templates";

/** Rendez-vous prévus demain et n'ayant pas encore de fiche de préparation. */
export async function getRendezVousDemain() {
  const debut = startOfDay(addDays(new Date(), 1));
  const fin = addDays(debut, 1);

  const rendezVous = await prisma.rendezVous.findMany({
    where: { dateRDV: { gte: debut, lt: fin } },
  });

  return rendezVous.filter((rdv) => rdv.preparation === null);
}

export async function genererEtEnregistrerPreparation(rendezVousId: string) {
  const rendezVous = await prisma.rendezVous.findUniqueOrThrow({ where: { id: rendezVousId } });
  const systemPrompt = await getTemplateContent("prompt.preparation", DEFAULT_PREPARATION_PROMPT);

  const formatInstructions =
    'Réponds uniquement avec un objet JSON valide, sans texte avant ou après, sans balises markdown, au format exact suivant : {"actualites": string, "contexteEntreprise": string, "activiteLinkedin": string, "informationsUtiles": string, "questionsPertinentes": string[]}.';

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    system: `${systemPrompt}\n\n${formatInstructions}`,
    messages: [
      {
        role: "user",
        content: `Prépare la fiche pour le rendez-vous avec ${rendezVous.prenom} ${rendezVous.nom}${
          rendezVous.poste ? `, ${rendezVous.poste}` : ""
        } chez ${rendezVous.societe}${
          rendezVous.linkedin ? ` (LinkedIn : ${rendezVous.linkedin})` : ""
        }.`,
      },
    ],
  });

  const rawText = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("La fiche de préparation n'a pas pu être générée (réponse IA invalide).");
  }

  const parsed = preparationSchema.safeParse(JSON.parse(jsonMatch[0]));

  if (!parsed.success) {
    throw new Error("La fiche de préparation générée ne respecte pas le format attendu.");
  }

  const preparation = parsed.data;

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { preparation },
  });

  await sendPreparationEmail(rendezVous, preparation).catch((error) => {
    console.error("Erreur envoi email de préparation :", error);
  });

  return preparation;
}
