import { endOfWeek, startOfWeek, subWeeks } from "date-fns";

import { ARR_POTENTIEL_PAR_RDV_QUALIFIE } from "@/lib/constants/rendez-vous";
import type { Commercial } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function listRendezVous() {
  return prisma.rendezVous.findMany({ orderBy: { dateRDV: "desc" } });
}

export async function getRendezVousById(id: string) {
  return prisma.rendezVous.findUnique({ where: { id } });
}

export async function getDashboardStats() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const startWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endWeek = endOfWeek(now, { weekStartsOn: 1 });

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [aujourdHui, cetteSemaine, ceMois, honores, nonHonores, totalQualifies, total] =
    await Promise.all([
      prisma.rendezVous.count({ where: { dateRDV: { gte: startToday, lt: endToday } } }),
      prisma.rendezVous.count({ where: { dateRDV: { gte: startWeek, lte: endWeek } } }),
      prisma.rendezVous.count({ where: { dateRDV: { gte: startMonth, lt: startNextMonth } } }),
      prisma.rendezVous.count({ where: { dateRDV: { lt: now }, honore: true } }),
      prisma.rendezVous.count({ where: { dateRDV: { lt: now }, honore: false } }),
      prisma.rendezVous.count({ where: { qualifie: true } }),
      prisma.rendezVous.count(),
    ]);

  const rdvPasses = honores + nonHonores;
  const tauxPresence = rdvPasses > 0 ? (honores / rdvPasses) * 100 : 0;
  const tauxQualification = honores > 0 ? (totalQualifies / honores) * 100 : 0;
  const arrPotentiel = totalQualifies * ARR_POTENTIEL_PAR_RDV_QUALIFIE;

  return {
    aujourdHui,
    cetteSemaine,
    ceMois,
    honores,
    nonHonores,
    tauxPresence,
    tauxQualification,
    arrPotentiel,
    total,
  };
}

export async function getWeeklySeries(weeksCount = 8) {
  const now = new Date();
  const rangeStart = startOfWeek(subWeeks(now, weeksCount - 1), { weekStartsOn: 1 });

  const rendezVous = await prisma.rendezVous.findMany({
    where: { dateRDV: { gte: rangeStart } },
    select: { dateRDV: true },
  });

  const buckets = new Map<string, { weekStart: Date; count: number }>();

  for (let i = weeksCount - 1; i >= 0; i -= 1) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const key = weekStart.toISOString();
    buckets.set(key, { weekStart, count: 0 });
  }

  for (const { dateRDV } of rendezVous) {
    const weekStart = startOfWeek(dateRDV, { weekStartsOn: 1 });
    const key = weekStart.toISOString();
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return Array.from(buckets.values()).map(({ weekStart, count }) => ({
    semaine: `${weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`,
    rendezVous: count,
  }));
}

export async function getCommercialComparison() {
  const commerciaux: Commercial[] = ["LOUIS", "CHLOE"];

  const results = await Promise.all(
    commerciaux.map(async (commercial) => {
      const [total, qualifies] = await Promise.all([
        prisma.rendezVous.count({ where: { commercial } }),
        prisma.rendezVous.count({ where: { commercial, qualifie: true } }),
      ]);
      return { commercial, total, qualifies };
    }),
  );

  return results;
}

export async function getUpcomingRendezVous(limit = 5) {
  return prisma.rendezVous.findMany({
    where: { dateRDV: { gte: new Date() } },
    orderBy: { dateRDV: "asc" },
    take: limit,
  });
}

export async function getRelancesNecessaires() {
  const now = new Date();
  return prisma.rendezVous.findMany({
    where: { dateRDV: { lt: now }, honore: false },
    orderBy: { dateRDV: "desc" },
    take: 5,
  });
}
