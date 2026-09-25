"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  rendezVous: {
    label: "RDV bookés",
    color: "var(--chart-1)",
  },
};

export function WeeklyChart({ data }: { data: { semaine: string; rendezVous: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="semaine" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="rendezVous"
          type="monotone"
          fill="var(--color-rendezVous)"
          fillOpacity={0.15}
          stroke="var(--color-rendezVous)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
