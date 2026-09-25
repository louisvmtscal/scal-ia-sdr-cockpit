const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});
/** Heure au format Europe/Paris — utilisée dans les SMS de rappel (J-1, H-2). */
const heureParisFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)} %`;
}

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

export function formatHeureParis(date: Date) {
  return heureParisFormatter.format(date);
}

/** Date relative courte ("dans 3j", "il y a 2h") — pour un scan rapide dans les listes. */
export function formatRelativeDate(date: Date, now = new Date()) {
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffMinutes) < 1) return "à l'instant";
  if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `dans ${diffMinutes} min` : `il y a ${Math.abs(diffMinutes)} min`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `dans ${diffHours}h` : `il y a ${Math.abs(diffHours)}h`;
  }
  return diffDays > 0 ? `dans ${diffDays}j` : `il y a ${Math.abs(diffDays)}j`;
}
