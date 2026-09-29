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
    include: {
      commercial: true,
      notesInternes: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { dateRDV: "desc" },
  });
}

export async function getRendezVousById(id: string) {
  return prisma.rendezVous.findUnique({ where: { id } });
}

export async function getDashboardStats(scope: Scope, periode: { start: Date; end: Date }) {
  const where = scopeWhere(scope);
  const now = new Date();
  const dansLaPeriode = { gte: periode.start, lte: periode.end };
  // "Écoulé" = la portion de la période déjà arrivée à date — sert de dénominateur
  // pour honoré+qualifié et le taux de présence, pour ne jamais comparer à un total
  // qui inclut encore des RDV à venir dans la période sélectionnée.
  const periodeEcoulee = { gte: periode.start, lte: periode.end < now ? periode.end : now };

  const [
    totalPeriode,
    bookesPeriode,
    ecoule,
    honores,
    qualifiesEtHonores,
    rdvPrimablesPeriode,
    rdvPrimablesTotal,
    rdvPotentiels,
  ] = await Promise.all([
    prisma.rendezVous.count({ where: { ...where, dateRDV: dansLaPeriode } }),
    // Booké = créé (uploadé/synchronisé) dans la période, peu importe la date du meeting
    // (ex: un cold call qui décroche un RDV ce mois-ci pour le mois prochain).
    prisma.rendezVous.count({ where: { ...where, createdAt: dansLaPeriode } }),
    prisma.rendezVous.count({ where: { ...where, dateRDV: periodeEcoulee } }),
    prisma.rendezVous.count({ where: { ...where, honore: "OUI", dateRDV: periodeEcoulee } }),
    prisma.rendezVous.count({
      where: { ...where, qualifie: true, honore: "OUI", dateRDV: periodeEcoulee },
    }),
    prisma.rendezVous.findMany({
      where: { ...where, honore: "OUI", qualifie: true, dateRDV: dansLaPeriode },
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

  // Taux de présence : sur tous les RDV de la période déjà passés à date (un RDV encore
  // EN_ATTENTE ou A_REPLACER compte comme "non honoré" tant qu'il n'a pas été traité).
  const tauxPresence = ecoule > 0 ? (honores / ecoule) * 100 : 0;
  // Taux de qualification : uniquement sur les RDV honorés "OUI" (impossible de
  // qualifier un prospect qui ne s'est pas présenté).
  const tauxQualification = honores > 0 ? (qualifiesEtHonores / honores) * 100 : 0;
  // "Mes primes" = sur la période sélectionnée. "Mes primes totales" = historique complet, sans limite de temps.
  const mesPrimes = sommePrimes(rdvPrimablesPeriode);
  const mesPrimesTotal = sommePrimes(rdvPrimablesTotal);
  // Primes potentielles (RDV en attente) : jamais bornées dans le temps.
  const primesPotentielles = sommePrimes(rdvPotentiels);

  return {
    totalPeriode,
    bookesPeriode,
    periodeEcoulee: ecoule,
    honoreEtQualifie: qualifiesEtHonores,
    tauxPresence,
    tauxQualification,
    mesPrimes,
    mesPrimesTotal,
    primesPotentielles,
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
