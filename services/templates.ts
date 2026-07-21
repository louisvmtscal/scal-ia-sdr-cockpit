import { prisma } from "@/lib/prisma";

export async function getTemplateContent(key: string, fallback: string) {
  const template = await prisma.template.findUnique({ where: { key } });
  return template?.content ?? fallback;
}

export async function getTemplatesByKeys(keys: string[]) {
  const templates = await prisma.template.findMany({ where: { key: { in: keys } } });
  return new Map(templates.map((template) => [template.key, template.content]));
}
