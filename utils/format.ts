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
