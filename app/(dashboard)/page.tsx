import { CalendarIcon, CheckCircle2Icon, CoinsIcon, GaugeIcon, PiggyBankIcon, TargetIcon } from "lucide-react";

import { redirect } from "next/navigation";

import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDashboardStats, getWeeklySeries } from "@/services/rendez-vous";
import { formatCurrency, formatPercent } from "@/utils/format";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const scope = { userId: session.user.id, role: session.user.role };

  const [stats, weeklySeries] = await Promise.all([
    getDashboardStats(scope),
    getWeeklySeries(scope),
  ]);

  const moisEnCours = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(),
  );

  const statCards = [
    { label: "RDV ce mois", value: String(stats.ceMois), icon: CalendarIcon },
    {
      label: "RDV honoré et qualifié",
      value: `${stats.honoreEtQualifie} / ${stats.ceMoisEcoule}`,
      icon: CheckCircle2Icon,
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
      label: "Mes primes",
      value: formatCurrency(stats.mesPrimes),
      icon: CoinsIcon,
      hint: `RDV honorés et qualifiés — ${moisEnCours}`,
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
