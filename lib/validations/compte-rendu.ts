import { z } from "zod";

export const compteRenduSchema = z.object({
  resumeExecutif: z.string().describe("Résumé exécutif du rendez-vous, 2 à 3 phrases maximum."),
  contexte: z.string().describe("Contexte de l'entreprise et du prospect."),
  besoins: z.string().describe("Besoins exprimés par le prospect."),
  painPoints: z.string().describe("Points de douleur (pain points) identifiés."),
  solutionPresentee: z.string().describe("Solution Scal-IA présentée pendant l'échange."),
  objections: z.string().describe('Objections soulevées, ou "Aucune".'),
  niveauInteret: z
    .enum(["Faible", "Moyen", "Élevé"])
    .describe("Niveau d'intérêt perçu du prospect."),
  decisionnaires: z.string().describe("Personnes impliquées dans la décision d'achat."),
  actionsARealiser: z.string().describe("Actions concrètes à réaliser suite au rendez-vous."),
  nextSteps: z.string().describe("Prochaines étapes du cycle de vente."),
});

export type CompteRendu = z.infer<typeof compteRenduSchema>;

export const COMPTE_RENDU_SECTIONS: Array<{ key: keyof CompteRendu; label: string }> = [
  { key: "resumeExecutif", label: "Résumé exécutif" },
  { key: "contexte", label: "Contexte" },
  { key: "besoins", label: "Besoins" },
  { key: "painPoints", label: "Pain points" },
  { key: "solutionPresentee", label: "Solution Scal-IA présentée" },
  { key: "objections", label: "Objections" },
  { key: "niveauInteret", label: "Niveau d'intérêt" },
  { key: "decisionnaires", label: "Décisionnaires" },
  { key: "actionsARealiser", label: "Actions à réaliser" },
  { key: "nextSteps", label: "Next steps" },
];

export function formatCompteRenduForClipboard(compteRendu: CompteRendu) {
  return COMPTE_RENDU_SECTIONS.map(({ key, label }) => `${label} : ${compteRendu[key]}`).join(
    "\n\n",
  );
}
