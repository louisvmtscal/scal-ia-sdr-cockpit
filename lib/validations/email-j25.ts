import { z } from "zod";

export const emailJ25Schema = z.object({
  contenu: z.string(),
  genereLe: z.string(),
});

export type EmailJ25 = z.infer<typeof emailJ25Schema>;
