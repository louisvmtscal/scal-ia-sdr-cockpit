"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleQualifieAction, updateHonoreAction } from "@/actions/rendez-vous";
import { Badge } from "@/components/ui/badge";
import { ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { HonoreStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/utils/format";

import type { RendezVousAvecCommercial } from "./rendez-vous-table";

type ColumnId = "EN_ATTENTE" | "A_REPLACER" | "NON" | "HONORE" | "QUALIFIE";

const COLUMNS: {
  id: ColumnId;
  label: string;
  honore: HonoreStatus;
  qualifie: boolean;
  toneClass: string;
}[] = [
  { id: "EN_ATTENTE", label: "En attente", honore: "EN_ATTENTE", qualifie: false, toneClass: "" },
  {
    id: "A_REPLACER",
    label: "À replacer",
    honore: "A_REPLACER",
    qualifie: false,
    toneClass: "border-t-orange-400",
  },
  { id: "NON", label: "Non honoré", honore: "NON", qualifie: false, toneClass: "border-t-red-400" },
  { id: "HONORE", label: "Honoré", honore: "OUI", qualifie: false, toneClass: "" },
  {
    id: "QUALIFIE",
    label: "Qualifié",
    honore: "OUI",
    qualifie: true,
    toneClass: "border-t-green-400",
  },
];

function columnIdFor(row: { honore: HonoreStatus; qualifie: boolean }): ColumnId {
  if (row.honore === "EN_ATTENTE") return "EN_ATTENTE";
  if (row.honore === "A_REPLACER") return "A_REPLACER";
  if (row.honore === "NON") return "NON";
  if (row.honore === "OUI" && row.qualifie) return "QUALIFIE";
  return "HONORE";
}

function RendezVousCard({ row }: { row: RendezVousAvecCommercial }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        "bg-card cursor-grab touch-none rounded-lg border p-3 shadow-xs active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm font-medium">
        {row.prenom} {row.nom}
      </p>
      <p className="text-muted-foreground text-xs">{row.societe}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{formatRelativeDate(row.dateRDV)}</span>
        <Badge variant="secondary" className="text-[10px]">
          {ORIGINE_LABELS[row.origine]}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {row.commercial.name ?? row.commercial.email}
      </p>
    </div>
  );
}

function KanbanColumn({
  column,
  rows,
}: {
  column: (typeof COLUMNS)[number];
  rows: RendezVousAvecCommercial[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className={cn("flex items-center justify-between border-t-2 px-1 pt-2", column.toneClass)}>
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <span className="text-muted-foreground text-xs">{rows.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-col gap-2 rounded-lg p-1 transition-colors",
          isOver && "bg-muted/60",
        )}
      >
        {rows.map((row) => (
          <RendezVousCard key={row.id} row={row} />
        ))}
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">Aucun RDV</p>
        ) : null}
      </div>
    </div>
  );
}

export function RendezVousKanban({ data }: { data: RendezVousAvecCommercial[] }) {
  const [optimisticData, setOptimisticData] = useOptimistic(
    data,
    (state, patch: { id: string; honore: HonoreStatus; qualifie: boolean }) =>
      state.map((row) =>
        row.id === patch.id ? { ...row, honore: patch.honore, qualifie: patch.qualifie } : row,
      ),
  );
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const targetColumnId = event.over?.id as ColumnId | undefined;
    if (!targetColumnId) return;

    const row = optimisticData.find((r) => r.id === event.active.id);
    if (!row) return;

    const target = COLUMNS.find((c) => c.id === targetColumnId);
    if (!target || columnIdFor(row) === target.id) return;

    startTransition(async () => {
      setOptimisticData({ id: row.id, honore: target.honore, qualifie: target.qualifie });
      try {
        await updateHonoreAction(row.id, target.honore);
        if (target.qualifie !== row.qualifie) {
          await toggleQualifieAction(row.id, target.qualifie);
        }
      } catch {
        toast.error("La mise à jour a échoué.");
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            rows={optimisticData.filter((row) => columnIdFor(row) === column.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}
