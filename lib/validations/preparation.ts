import { z } from "zod";

export const preparationSchema = z.object({
  actualites: z
    .string()
    .describe("Actualités récentes et pertinentes de l'entreprise ou de son secteur."),
  contexteEntreprise: z.string().describe("Contexte, positionnement et taille de l'entreprise."),
  activiteLinkedin: z.string().describe("Activité LinkedIn récente du contact ou de l'entreprise."),
  informationsUtiles: z
    .string()
    .describe("Autres informations utiles pour personnaliser le rendez-vous."),
  questionsPertinentes: z
    .array(z.string())
    .describe("3 à 5 questions pertinentes à poser pendant le rendez-vous."),
});

export type Preparation = z.infer<typeof preparationSchema>;

export const PREPARATION_SECTIONS: Array<{
  key: keyof Omit<Preparation, "questionsPertinentes">;
  label: string;
}> = [
  { key: "actualites", label: "Actualités" },
  { key: "contexteEntreprise", label: "Contexte entreprise" },
  { key: "activiteLinkedin", label: "Activité LinkedIn" },
  { key: "informationsUtiles", label: "Informations utiles" },
];
