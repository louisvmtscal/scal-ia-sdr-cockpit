"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function updateTemplateAction(
  key: string,
  label: string,
  category: string,
  content: string,
) {
  if (!content.trim()) {
    return { error: "Le contenu ne peut pas être vide." };
  }

  await prisma.template.upsert({
    where: { key },
    update: { content },
    create: { key, label, category, content },
  });

  revalidatePath("/automatisations");
  return { success: true } as const;
}
