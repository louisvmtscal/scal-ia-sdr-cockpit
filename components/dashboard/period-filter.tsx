"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_KEYS, PERIOD_LABELS, type PeriodKey } from "@/lib/dashboard-period";

export function PeriodFilter({ current }: { current: { key: PeriodKey; start: Date; end: Date } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Distinct de `current.key` (dérivé de l'URL) : le Select doit basculer sur
  // "Personnalisé" et afficher le calendrier dès le choix dans la liste, avant
  // même qu'une plage complète soit sélectionnée et qu'on navigue.
  const [selectedKey, setSelectedKey] = useState<PeriodKey>(current.key);
  const [range, setRange] = useState<DateRange | undefined>(
    current.key === "personnalise" ? { from: current.start, to: current.end } : undefined,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  function navigate(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function handlePeriodChange(value: string | null) {
    if (!value) return;
    const key = value as PeriodKey;
    setSelectedKey(key);
    // Pour "personnalisé", on attend que l'utilisateur choisisse une plage
    // dans le calendrier avant de naviguer.
    if (key === "personnalise") return;
    navigate({ period: key, from: undefined, to: undefined });
  }

  function applyRange() {
    if (!range?.from || !range?.to) return;
    navigate({
      period: "personnalise",
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
    });
    setPopoverOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedKey} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {PERIOD_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedKey === "personnalise" ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <CalendarIcon />
                {range?.from
                  ? range.to
                    ? `${format(range.from, "d MMM", { locale: fr })} – ${format(range.to, "d MMM yyyy", { locale: fr })}`
                    : format(range.from, "d MMM yyyy", { locale: fr })
                  : "Choisir une plage"}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={fr}
            />
            <div className="flex justify-end border-t p-2">
              <Button size="sm" onClick={applyRange} disabled={!range?.from || !range?.to}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
