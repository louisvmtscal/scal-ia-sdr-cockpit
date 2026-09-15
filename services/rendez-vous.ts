import { endOfWeek, startOfWeek, subWeeks } from "date-fns";

import { ARR_POTENTIEL_PAR_RDV_QUALIFIE, PRIME_PAR_ORIGINE } from "@/lib/constants/rendez-vous";
import type { Commercial, Origine } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

function sommePrimes(rendezVous: Array<{ origine: Origine }>) {
  return rendezVous.reduce((total, rdv) => total + PRIME_PAR_ORIGINE[rdv.origine], 0);
}

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

  const [
    aujourdHui,
    cetteSemaine,
    ceMois,
    honores,
    nonHonores,
    aReplacer,
    totalQualifies,
    qualifiesEtHonores,
    total,
    rdvPrimablesMois,
    rdvPrimablesTotal,
    rdvPotentiels,
  ] = await Promise.all([
    prisma.rendezVous.count({ where: { dateRDV: { gte: startToday, lt: endToday } } }),
    prisma.rendezVous.count({ where: { dateRDV: { gte: startWeek, lte: endWeek } } }),
    prisma.rendezVous.count({ where: { dateRDV: { gte: startMonth, lt: startNextMonth } } }),
    prisma.rendezVous.count({ where: { honore: "OUI" } }),
    prisma.rendezVous.count({ where: { honore: "NON" } }),
    prisma.rendezVous.count({ where: { honore: "A_REPLACER" } }),
    prisma.rendezVous.count({ where: { qualifie: true } }),
    prisma.rendezVous.count({ where: { qualifie: true, honore: "OUI" } }),
    prisma.rendezVous.count(),
    prisma.rendezVous.findMany({
      where: {
        honore: "OUI",
        qualifie: true,
        dateRDV: { gte: startMonth, lt: startNextMonth },
      },
      select: { origine: true },
    }),
    prisma.rendezVous.findMany({ where: { honore: "OUI", qualifie: true }, select: { origine: true } }),
    prisma.rendezVous.findMany({ where: { honore: "EN_ATTENTE" }, select: { origine: true } }),
  ]);

  const rdvPasses = honores + nonHonores;
  const tauxPresence = rdvPasses > 0 ? (honores / rdvPasses) * 100 : 0;
  // Taux de qualification = RDV honorés ET qualifiés / RDV honorés.
  const tauxQualification = honores > 0 ? (qualifiesEtHonores / honores) * 100 : 0;
  const arrPotentiel = totalQualifies * ARR_POTENTIEL_PAR_RDV_QUALIFIE;
  // "Mes primes" = mois en cours uniquement. "Mes primes totales" = historique complet, sans limite de temps.
  const mesPrimes = sommePrimes(rdvPrimablesMois);
  const mesPrimesTotal = sommePrimes(rdvPrimablesTotal);
  // Primes potentielles (RDV en attente) : jamais bornées dans le temps.
  const primesPotentielles = sommePrimes(rdvPotentiels);

  return {
    aujourdHui,
    cetteSemaine,
    ceMois,
    honores,
    nonHonores,
    aReplacer,
    tauxPresence,
    tauxQualification,
    arrPotentiel,
    mesPrimes,
    mesPrimesTotal,
    primesPotentielles,
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
    where: { dateRDV: { lt: now }, honore: "NON" },
    orderBy: { dateRDV: "desc" },
    take: 5,
  });
}
