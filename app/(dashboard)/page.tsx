import {
  CalendarDaysIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CoinsIcon,
  GaugeIcon,
  PiggyBankIcon,
  RefreshCcwIcon,
  TargetIcon,
  XCircleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { redirect } from "next/navigation";

import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { RendezVous } from "@/lib/generated/prisma/client";
import {
  getDashboardStats,
  getRelancesNecessaires,
  getUpcomingRendezVous,
  getWeeklySeries,
} from "@/services/rendez-vous";
import { formatCurrency, formatPercent, formatRelativeDate } from "@/utils/format";

type RendezVousAvecCommercial = RendezVous & { commercial: { name: string | null; email: string } };

function RendezVousMiniList({
  title,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  icon: LucideIcon;
  items: RendezVousAvecCommercial[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {item.prenom} {item.nom} · {item.societe}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {item.commercial.name ?? item.commercial.email} · {formatRelativeDate(item.dateRDV)}
                  </p>
                </div>
                <Badge variant="secondary">{ORIGINE_LABELS[item.origine]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const scope = { userId: session.user.id, role: session.user.role };

  const [stats, weeklySeries, upcoming, relances] = await Promise.all([
    getDashboardStats(scope),
    getWeeklySeries(scope),
    getUpcomingRendezVous(scope, 5),
    getRelancesNecessaires(scope),
  ]);

  const moisEnCours = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(),
  );

  const statCards = [
    { label: "RDV ce mois", value: String(stats.ceMois), icon: CalendarIcon },
    {
      label: "RDV honorés",
      value: `${stats.honores} / ${stats.ceMoisEcoule}`,
      icon: CheckCircle2Icon,
      hint: "RDV du mois déjà passés à date",
    },
    {
      label: "RDV non honorés",
      value: `${stats.nonHonores} / ${stats.ceMoisEcoule}`,
      icon: XCircleIcon,
      hint: "RDV du mois déjà passés à date",
    },
    {
      label: "Taux de présence",
      value: formatPercent(stats.tauxPresence),
      icon: GaugeIcon,
      hint: "Sur les RDV du mois déjà passés à date",
    },
    {
      label: "Taux de qualification",
      value: formatPercent(stats.tauxQualification),
      icon: TargetIcon,
      hint: "Sur les RDV du mois déjà passés à date",
    },
    {
      label: "💰 Mes primes",
      value: formatCurrency(stats.mesPrimes),
      icon: CoinsIcon,
      hint: `RDV honorés et qualifiés — ${moisEnCours}`,
      microHint: `Mes primes totales : ${formatCurrency(stats.mesPrimesTotal)}`,
    },
    {
      label: "💰 Primes potentielles",
      value: formatCurrency(stats.primesPotentielles),
      icon: PiggyBankIcon,
      hint: "RDV en attente",
    },
    {
      label: "RDV à replacer",
      value: String(stats.aReplacer),
      icon: RefreshCcwIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <FadeIn key={card.label} delay={index * 0.03}>
            <StatCard {...card} />
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RDV bookés par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={weeklySeries} />
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.3}>
          <RendezVousMiniList
            title="Prochains rendez-vous"
            icon={CalendarDaysIcon}
            items={upcoming}
            emptyMessage="Aucun rendez-vous à venir."
          />
        </FadeIn>
        <FadeIn delay={0.35}>
          <RendezVousMiniList
            title="À relancer"
            icon={XCircleIcon}
            items={relances}
            emptyMessage="Aucune relance nécessaire."
          />
        </FadeIn>
      </div>
    </div>
  );
}
