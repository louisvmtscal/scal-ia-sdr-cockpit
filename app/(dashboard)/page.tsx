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
import { SdrFilter } from "@/components/dashboard/sdr-filter";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { PERIOD_SHORT_LABELS, resolvePeriodRange } from "@/lib/dashboard-period";
import { getTeamMembers } from "@/lib/team";
import { getDashboardStats, getWeeklySeries } from "@/services/rendez-vous";
import { formatCurrency, formatPercent } from "@/utils/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; commercial?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const scope = { userId: session.user.id, role: session.user.role };
  const estAdminOuManager = scope.role !== "SDR";

  const { commercial: commercialIdFiltre, ...periodParams } = await searchParams;
  const periode = resolvePeriodRange(periodParams);

  const [stats, weeklySeries, teamMembers] = await Promise.all([
    getDashboardStats(scope, { start: periode.start, end: periode.end }, commercialIdFiltre),
    getWeeklySeries(scope, 8, commercialIdFiltre),
    estAdminOuManager ? getTeamMembers() : Promise.resolve([]),
  ]);

  const periodeCourt = PERIOD_SHORT_LABELS[periode.key];

  const statCards = [
    {
      label: `RDV prévus ${periodeCourt}`,
      value: String(stats.totalPeriode),
      icon: CalendarIcon,
      hint: "Date du rendez-vous dans la période, quelle que soit la date à laquelle il a été pris",
    },
    {
      label: `RDV pris ${periodeCourt}`,
      value: String(stats.bookesPeriode),
      icon: PhoneOutgoingIcon,
      hint: "Date de prise du rendez-vous dans la période, quelle que soit la date du rendez-vous",
    },
    {
      label: "RDV honorés et qualifiés",
      value: `${stats.honoreEtQualifie} / ${stats.periodeEcoulee}`,
      icon: CheckCircle2Icon,
      hint: `Déjà passés à ce jour — ${periode.label}`,
    },
    {
      label: "Taux de présence",
      value: formatPercent(stats.tauxPresence),
      icon: GaugeIcon,
      hint: `Sur les RDV déjà passés à ce jour — ${periode.label}`,
    },
    {
      label: "Taux de qualification",
      value: formatPercent(stats.tauxQualification),
      icon: TargetIcon,
      hint: `Sur les RDV honorés uniquement — ${periode.label}`,
    },
    {
      label: "Mes primes",
      value: formatCurrency(stats.mesPrimes),
      icon: CoinsIcon,
      hint: `RDV honorés et qualifiés — ${periode.label}`,
      microHint: `Primes totales depuis le début : ${formatCurrency(stats.mesPrimesTotal)}`,
    },
    {
      label: "Primes potentielles",
      value: formatCurrency(stats.primesPotentielles),
      icon: PiggyBankIcon,
      hint: "RDV dont le statut n'est pas encore renseigné",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-2">
        {estAdminOuManager ? (
          <SdrFilter teamMembers={teamMembers} current={commercialIdFiltre} />
        ) : null}
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
            <CardTitle className="text-base">RDV pris par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={weeklySeries} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
