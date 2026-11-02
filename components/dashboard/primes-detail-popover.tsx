"use client";

import { CoinsIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { Origine } from "@/lib/generated/prisma/enums";
import { formatCurrency } from "@/utils/format";

export type PrimeDetailItem = {
  id: string;
  prenom: string;
  nom: string;
  societe: string;
  origine: Origine;
  montant: number;
};

export function PrimesDetailPopover({
  items,
  periodLabel,
}: {
  items: PrimeDetailItem[];
  periodLabel: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Voir les rendez-vous pris en compte dans le calcul"
        className="text-muted-foreground hover:text-foreground hover:bg-muted -m-1 cursor-pointer rounded-md p-1 transition-colors"
      >
        <CoinsIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">RDV pris en compte</p>
          <p className="text-muted-foreground text-xs">
            Honorés et qualifiés — {periodLabel}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground py-2 text-xs">
            Aucun RDV honoré et qualifié sur cette période.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col divide-y overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {item.prenom} {item.nom}
                  </p>
                  {item.societe && item.societe !== "?" ? (
                    <p className="text-muted-foreground truncate text-xs">{item.societe}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={item.origine === "INBOUND" ? "secondary" : "outline"}>
                    {ORIGINE_LABELS[item.origine]}
                  </Badge>
                  <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                    {formatCurrency(item.montant)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
          <span>
            {items.length} RDV
          </span>
          <span className="tabular-nums">
            {formatCurrency(items.reduce((total, item) => total + item.montant, 0))}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
