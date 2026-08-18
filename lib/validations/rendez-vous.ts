import { z } from "zod";

export const honoreStatusSchema = z.enum(["EN_ATTENTE", "OUI", "NON", "A_REPLACER"]);

export const rendezVousSchema = z.object({
  commercial: z.enum(["LOUIS", "CHLOE"], {
    message: "Merci de choisir le commercial.",
  }),
  origine: z.enum(["INBOUND", "OUTBOUND"], {
    message: "Merci de choisir l'origine.",
  }),
  nom: z.string().min(1, "Le nom est requis."),
  prenom: z.string().min(1, "Le prénom est requis."),
  societe: z.string().min(1, "L'entreprise est requise."),
  poste: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Email invalide.")]).optional(),
  telephone: z.string().optional(),
  linkedin: z.union([z.literal(""), z.string().url("URL LinkedIn invalide.")]).optional(),
  dateRDV: z.string().min(1, "La date du rendez-vous est requise."),
  notes: z.string().optional(),
});

export type RendezVousInput = z.infer<typeof rendezVousSchema>;
