import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  microHint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  /** Ligne complémentaire, affichée encore plus petite que `hint` (ex: un total historique à côté d'une valeur bornée dans le temps). */
  microHint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
        {microHint ? <p className="text-muted-foreground/70 mt-0.5 text-[10px]">{microHint}</p> : null}
      </CardContent>
    </Card>
  );
}
