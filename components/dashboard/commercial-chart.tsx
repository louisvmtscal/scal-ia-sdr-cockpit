"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  total: {
    label: "Rendez-vous",
    color: "var(--chart-2)",
  },
  qualifies: {
    label: "Qualifiés",
    color: "var(--chart-4)",
  },
};

export function CommercialChart({ data }: { data: { nom: string; total: number; qualifies: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="nom" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
        <Bar dataKey="qualifies" fill="var(--color-qualifies)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
