import { z } from "zod";

const NON_MENTIONNE = "Non mentionné";

export const compteRenduSchema = z.object({
  resume: z.string().describe("Résumé du rendez-vous en 3 à 5 lignes maximum."),
  contexte: z
    .string()
    .describe("Contexte de l'entreprise et du projet, tel qu'exprimé dans la transcription."),
  besoinsPainPoints: z
    .string()
    .describe(
      `Problèmes et besoins exprimés par le prospect. Exactement "${NON_MENTIONNE}" si absent de la transcription.`,
    ),
  solutionsEvoquees: z
    .string()
    .describe(
      `Ce qui a été discuté concernant la solution ou le projet. Exactement "${NON_MENTIONNE}" si absent.`,
    ),
  objections: z
    .string()
    .describe(`Objections ou freins identifiés. Exactement "${NON_MENTIONNE}" si absent.`),
  budget: z.string().describe(`Montant ou fourchette si mentionné. Sinon "${NON_MENTIONNE}".`),
  timing: z.string().describe(`Échéance ou calendrier si mentionné. Sinon "${NON_MENTIONNE}".`),
  decideurs: z
    .string()
    .describe(
      `Personnes impliquées dans la décision si identifiables dans la transcription. Sinon "${NON_MENTIONNE}".`,
    ),
  niveauInteret: z
    .enum(["Faible", "Moyen", "Fort"])
    .describe("Niveau d'intérêt perçu du prospect, déduit de la transcription."),
  qualification: z
    .enum(["Qualifié", "Non qualifié", "À confirmer"])
    .describe(
      "Proposition de qualification déduite de l'échange — reste une proposition, jamais appliquée automatiquement au statut du rendez-vous.",
    ),
  prochaineAction: z.string().describe("Une seule prochaine action, concrète et actionnable."),
});

export type CompteRendu = z.infer<typeof compteRenduSchema>;

export const COMPTE_RENDU_SECTIONS: Array<{ key: keyof CompteRendu; label: string }> = [
  { key: "resume", label: "Résumé" },
  { key: "contexte", label: "Contexte" },
  { key: "besoinsPainPoints", label: "Besoins / Pain points" },
  { key: "solutionsEvoquees", label: "Solution / sujets évoqués" },
  { key: "objections", label: "Objections / freins" },
  { key: "budget", label: "Budget" },
  { key: "timing", label: "Timing" },
  { key: "decideurs", label: "Décideurs" },
  { key: "niveauInteret", label: "Niveau d'intérêt" },
  { key: "qualification", label: "Qualification" },
  { key: "prochaineAction", label: "Prochaine action" },
];

/**
 * Format exact demandé pour le copier-coller dans une note HubSpot. Ne suit
 * pas COMPTE_RENDU_SECTIONS terme à terme (le Contexte n'apparaît pas dans ce
 * format, volontairement — il reste visible dans le dialogue à l'écran).
 */
export function formatCompteRenduForClipboard(
  compteRendu: CompteRendu,
  rendezVous: { societe: string; dateRDV: Date },
) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(rendezVous.dateRDV);

  return [
    `COMPTE RENDU RDV — ${rendezVous.societe}`,
    `Date : ${date}`,
    "",
    "RÉSUMÉ",
    compteRendu.resume,
    "",
    "BESOINS / PAIN POINTS",
    compteRendu.besoinsPainPoints,
    "",
    "SOLUTION / SUJETS ÉVOQUÉS",
    compteRendu.solutionsEvoquees,
    "",
    "OBJECTIONS",
    compteRendu.objections,
    "",
    "BUDGET",
    compteRendu.budget,
    "",
    "TIMING",
    compteRendu.timing,
    "",
    "DÉCIDEURS",
    compteRendu.decideurs,
    "",
    "NIVEAU D'INTÉRÊT",
    compteRendu.niveauInteret,
    "",
    "QUALIFICATION",
    compteRendu.qualification,
    "",
    "PROCHAINE ACTION",
    compteRendu.prochaineAction,
  ].join("\n");
}
