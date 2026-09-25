import {
  CalendarDaysIcon,
  CalendarIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  CoinsIcon,
  GaugeIcon,
  PiggyBankIcon,
  RefreshCcwIcon,
  TargetIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { redirect } from "next/navigation";

import { CommercialChart } from "@/components/dashboard/commercial-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { RendezVous } from "@/lib/generated/prisma/client";
import {
  getCommercialComparison,
  getDashboardStats,
  getRelancesNecessaires,
  getUpcomingRendezVous,
  getWeeklySeries,
} from "@/services/rendez-vous";
import { formatCurrency, formatDateTime, formatPercent } from "@/utils/format";

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
                    {item.commercial.name ?? item.commercial.email} · {formatDateTime(item.dateRDV)}
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
  const estAdminOuManager = scope.role === "ADMIN" || scope.role === "MANAGER";

  const [stats, weeklySeries, commercialComparison, upcoming, relances] = await Promise.all([
    getDashboardStats(scope),
    getWeeklySeries(scope),
    estAdminOuManager ? getCommercialComparison() : Promise.resolve(null),
    getUpcomingRendezVous(scope, 5),
    getRelancesNecessaires(scope),
  ]);

  const moisEnCours = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(),
  );

  const statCards = [
    { label: "RDV aujourd'hui", value: String(stats.aujourdHui), icon: CalendarDaysIcon },
    { label: "RDV cette semaine", value: String(stats.cetteSemaine), icon: CalendarRangeIcon },
    { label: "RDV ce mois", value: String(stats.ceMois), icon: CalendarIcon },
    { label: "RDV honorés", value: String(stats.honores), icon: CheckCircle2Icon },
    { label: "RDV non honorés", value: String(stats.nonHonores), icon: XCircleIcon },
    { label: "Taux de présence", value: formatPercent(stats.tauxPresence), icon: GaugeIcon },
    {
      label: "Taux de qualification",
      value: formatPercent(stats.tauxQualification),
      icon: TargetIcon,
    },
    {
      label: "ARR potentiel",
      value: formatCurrency(stats.arrPotentiel),
      icon: TrendingUpIcon,
      hint: "31 200 € par RDV qualifié",
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

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rendez-vous par semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyChart data={weeklySeries} />
            </CardContent>
          </Card>
        </FadeIn>
        {commercialComparison ? (
          <FadeIn delay={0.25}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparatif par commercial</CardTitle>
              </CardHeader>
              <CardContent>
                <CommercialChart data={commercialComparison} />
              </CardContent>
            </Card>
          </FadeIn>
        ) : null}
      </div>

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
