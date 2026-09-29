import {
  CalendarIcon,
  CheckCircle2Icon,
  CoinsIcon,
  GaugeIcon,
  PhoneOutgoingIcon,
  PiggyBankIcon,
  TargetIcon,
} from "lucide-react";

import { redirect } from "next/navigation";

import { PeriodFilter } from "@/components/dashboard/period-filter";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { PERIOD_SHORT_LABELS, resolvePeriodRange } from "@/lib/dashboard-period";
import { getDashboardStats, getWeeklySeries } from "@/services/rendez-vous";
import { formatCurrency, formatPercent } from "@/utils/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const scope = { userId: session.user.id, role: session.user.role };

  const periode = resolvePeriodRange(await searchParams);

  const [stats, weeklySeries] = await Promise.all([
    getDashboardStats(scope, { start: periode.start, end: periode.end }),
    getWeeklySeries(scope),
  ]);

  const periodeCourt = PERIOD_SHORT_LABELS[periode.key];

  const statCards = [
    {
      label: `RDV ${periodeCourt}`,
      value: String(stats.totalPeriode),
      icon: CalendarIcon,
      hint: "Meeting prévu dans la période, quelle que soit sa date de booking",
    },
    {
      label: `RDV bookés ${periodeCourt}`,
      value: String(stats.bookesPeriode),
      icon: PhoneOutgoingIcon,
      hint: "Décroché dans la période, quelle que soit la date du meeting",
    },
    {
      label: "RDV honoré et qualifié",
      value: `${stats.honoreEtQualifie} / ${stats.periodeEcoulee}`,
      icon: CheckCircle2Icon,
      hint: `RDV ${periodeCourt} déjà passés à date`,
    },
    {
      label: "Taux de présence",
      value: formatPercent(stats.tauxPresence),
      icon: GaugeIcon,
      hint: `Sur les RDV ${periodeCourt} déjà passés à date`,
    },
    {
      label: "Taux de qualification",
      value: formatPercent(stats.tauxQualification),
      icon: TargetIcon,
      hint: "Sur les RDV honorés",
    },
    {
      label: "Mes primes",
      value: formatCurrency(stats.mesPrimes),
      icon: CoinsIcon,
      hint: `RDV honorés et qualifiés — ${periode.label}`,
      microHint: `Mes primes totales : ${formatCurrency(stats.mesPrimesTotal)}`,
    },
    {
      label: "Primes potentielles",
      value: formatCurrency(stats.primesPotentielles),
      icon: PiggyBankIcon,
      hint: "RDV en attente",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <PeriodFilter current={periode} />
      </div>

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
    </div>
  );
}
