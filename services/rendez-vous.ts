import { startOfWeek, subWeeks } from "date-fns";

import { PRIME_PAR_ORIGINE } from "@/lib/constants/rendez-vous";
import type { Origine, Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Portée d'accès aux données : un SDR ne voit que ses propres RDV, admin/manager voient tout. */
export type Scope = { userId: string; role: Role };

function scopeWhere(scope: Scope) {
  return scope.role === "SDR" ? { commercialId: scope.userId } : {};
}

function sommePrimes(rendezVous: Array<{ origine: Origine }>) {
  return rendezVous.reduce((total, rdv) => total + PRIME_PAR_ORIGINE[rdv.origine], 0);
}

export async function listRendezVous(scope: Scope) {
  return prisma.rendezVous.findMany({
    where: scopeWhere(scope),
    include: { commercial: true },
    orderBy: { dateRDV: "desc" },
  });
}

export async function getRendezVousById(id: string) {
  return prisma.rendezVous.findUnique({ where: { id } });
}

export async function getDashboardStats(scope: Scope) {
  const where = scopeWhere(scope);
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    ceMois,
    honores,
    nonHonores,
    aReplacer,
    qualifiesEtHonores,
    total,
    rdvPrimablesMois,
    rdvPrimablesTotal,
    rdvPotentiels,
  ] = await Promise.all([
    prisma.rendezVous.count({ where: { ...where, dateRDV: { gte: startMonth, lt: startNextMonth } } }),
    prisma.rendezVous.count({ where: { ...where, honore: "OUI" } }),
    prisma.rendezVous.count({ where: { ...where, honore: "NON" } }),
    prisma.rendezVous.count({ where: { ...where, honore: "A_REPLACER" } }),
    prisma.rendezVous.count({ where: { ...where, qualifie: true, honore: "OUI" } }),
    prisma.rendezVous.count({ where }),
    prisma.rendezVous.findMany({
      where: {
        ...where,
        honore: "OUI",
        qualifie: true,
        dateRDV: { gte: startMonth, lt: startNextMonth },
      },
      select: { origine: true },
    }),
    prisma.rendezVous.findMany({
      where: { ...where, honore: "OUI", qualifie: true },
      select: { origine: true },
    }),
    prisma.rendezVous.findMany({
      where: { ...where, honore: "EN_ATTENTE" },
      select: { origine: true },
    }),
  ]);

  const rdvPasses = honores + nonHonores;
  const tauxPresence = rdvPasses > 0 ? (honores / rdvPasses) * 100 : 0;
  // Taux de qualification = RDV honorés ET qualifiés / RDV honorés.
  const tauxQualification = honores > 0 ? (qualifiesEtHonores / honores) * 100 : 0;
  // "Mes primes" = mois en cours uniquement. "Mes primes totales" = historique complet, sans limite de temps.
  const mesPrimes = sommePrimes(rdvPrimablesMois);
  const mesPrimesTotal = sommePrimes(rdvPrimablesTotal);
  // Primes potentielles (RDV en attente) : jamais bornées dans le temps.
  const primesPotentielles = sommePrimes(rdvPotentiels);

  return {
    ceMois,
    honores,
    nonHonores,
    aReplacer,
    tauxPresence,
    tauxQualification,
    mesPrimes,
    mesPrimesTotal,
    primesPotentielles,
    total,
  };
}

/** Nombre de RDV bookés par semaine, d'après la date de création (l'upload du RDV), pas la date du meeting. */
export async function getWeeklySeries(scope: Scope, weeksCount = 8) {
  const now = new Date();
  const rangeStart = startOfWeek(subWeeks(now, weeksCount - 1), { weekStartsOn: 1 });

  const rendezVous = await prisma.rendezVous.findMany({
    where: { ...scopeWhere(scope), createdAt: { gte: rangeStart } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, { weekStart: Date; count: number }>();

  for (let i = weeksCount - 1; i >= 0; i -= 1) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const key = weekStart.toISOString();
    buckets.set(key, { weekStart, count: 0 });
  }

  for (const { createdAt } of rendezVous) {
    const weekStart = startOfWeek(createdAt, { weekStartsOn: 1 });
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

export async function getUpcomingRendezVous(scope: Scope, limit = 5) {
  return prisma.rendezVous.findMany({
    where: { ...scopeWhere(scope), dateRDV: { gte: new Date() } },
    include: { commercial: true },
    orderBy: { dateRDV: "asc" },
    take: limit,
  });
}

export async function getRelancesNecessaires(scope: Scope) {
  const now = new Date();
  return prisma.rendezVous.findMany({
    where: { ...scopeWhere(scope), dateRDV: { lt: now }, honore: "NON" },
    include: { commercial: true },
    orderBy: { dateRDV: "desc" },
    take: 5,
  });
}
