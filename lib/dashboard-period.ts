import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getQuarter,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

export const PERIOD_KEYS = [
  "semaine",
  "mois",
  "mois_precedent",
  "trimestre",
  "annee",
  "personnalise",
] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

/** Libellés affichés dans le sélecteur de période. */
export const PERIOD_LABELS: Record<PeriodKey, string> = {
  semaine: "Cette semaine",
  mois: "Ce mois-ci",
  mois_precedent: "Le mois précédent",
  trimestre: "Ce trimestre",
  annee: "Cette année",
  personnalise: "Période personnalisée",
};

/** Forme courte utilisée dans les libellés de stats ("RDV prévus {court}", "RDV pris {court}"). */
export const PERIOD_SHORT_LABELS: Record<PeriodKey, string> = {
  semaine: "cette semaine",
  mois: "ce mois-ci",
  mois_precedent: "le mois précédent",
  trimestre: "ce trimestre",
  annee: "cette année",
  personnalise: "sur la période",
};

export type PeriodRange = { key: PeriodKey; start: Date; end: Date; label: string };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Résout la période sélectionnée (query params de l'URL) en une plage de dates concrète. */
export function resolvePeriodRange(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): PeriodRange {
  const now = new Date();
  const key = PERIOD_KEYS.includes(searchParams.period as PeriodKey)
    ? (searchParams.period as PeriodKey)
    : "mois";

  if (key === "personnalise") {
    const from = searchParams.from ? parseISO(searchParams.from) : null;
    const to = searchParams.to ? parseISO(searchParams.to) : null;
    if (from && to && isValid(from) && isValid(to) && from <= to) {
      const start = startOfDay(from);
      const end = endOfDay(to);
      return {
        key,
        start,
        end,
        label: `Du ${format(start, "d MMM yyyy", { locale: fr })} au ${format(end, "d MMM yyyy", { locale: fr })}`,
      };
    }
    // Plage invalide ou incomplète -> on retombe sur le mois en cours.
    return resolvePeriodRange({ period: "mois" });
  }

  if (key === "semaine") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return {
      key,
      start,
      end,
      label: `Semaine du ${format(start, "d MMM", { locale: fr })} au ${format(end, "d MMM yyyy", { locale: fr })}`,
    };
  }

  if (key === "mois_precedent") {
    const moisPrecedent = subMonths(now, 1);
    const start = startOfMonth(moisPrecedent);
    const end = endOfMonth(moisPrecedent);
    return {
      key,
      start,
      end,
      label: capitalize(format(moisPrecedent, "MMMM yyyy", { locale: fr })),
    };
  }

  if (key === "trimestre") {
    const start = startOfQuarter(now);
    const end = endOfQuarter(now);
    return { key, start, end, label: `T${getQuarter(now)} ${format(now, "yyyy")}` };
  }

  if (key === "annee") {
    const start = startOfYear(now);
    const end = endOfYear(now);
    return { key, start, end, label: format(now, "yyyy") };
  }

  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return { key: "mois", start, end, label: capitalize(format(now, "MMMM yyyy", { locale: fr })) };
}
