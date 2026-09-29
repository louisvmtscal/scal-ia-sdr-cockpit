"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Trash2Icon, TrophyIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { moveKanbanCardAction, restoreFromLostAction } from "@/actions/rendez-vous";
import { Badge } from "@/components/ui/badge";
import { ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import { columnIdFor, KANBAN_COLUMNS, type KanbanColumnId } from "@/lib/kanban-columns";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/utils/format";

import type { RendezVousAvecCommercial } from "./rendez-vous-table";

const LOST_COLUMN = {
  id: "LOST" as const,
  label: "Lost",
  toneClass: "border-t-muted-foreground/40",
};

function RendezVousCard({
  row,
  onRestore,
  justMoved,
}: {
  row: RendezVousAvecCommercial;
  onRestore?: () => void;
  justMoved?: boolean;
}) {
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
        "bg-card cursor-grab touch-none rounded-lg border p-3 shadow-xs transition-all duration-700 active:cursor-grabbing",
        isDragging && "opacity-50",
        row.lost && "opacity-70",
        justMoved && "ring-primary/60 ring-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {row.prenom} {row.nom}
        </p>
        {onRestore ? (
          <button
            type="button"
            title="Récupérer dans le pipe"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRestore}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        ) : null}
      </div>
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
  id,
  label,
  toneClass,
  rows,
  onRestore,
  flashId,
}: {
  id: KanbanColumnId;
  label: string;
  toneClass: string;
  rows: RendezVousAvecCommercial[];
  onRestore?: (id: string) => void;
  flashId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className={cn("flex items-center justify-between border-t-2 px-1 pt-2", toneClass)}>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {id === "DEAL_CLOTURE" ? <TrophyIcon className="size-3.5 text-amber-500" /> : null}
          {label}
        </h3>
        <span className="text-muted-foreground text-xs">{rows.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[22rem] flex-col gap-2 rounded-lg p-1 transition-colors",
          isOver && "bg-muted/60 ring-primary/40 ring-2",
        )}
      >
        {rows.map((row) => (
          <RendezVousCard
            key={row.id}
            row={row}
            onRestore={onRestore ? () => onRestore(row.id) : undefined}
            justMoved={row.id === flashId}
          />
        ))}
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-3 text-center text-xs">Dépose un RDV ici</p>
        ) : null}
      </div>
    </div>
  );
}

function sortByDateAsc(rows: RendezVousAvecCommercial[]) {
  return [...rows].sort((a, b) => a.dateRDV.getTime() - b.dateRDV.getTime());
}

export function RendezVousKanban({ data }: { data: RendezVousAvecCommercial[] }) {
  const [optimisticData, setOptimisticData] = useOptimistic(
    data,
    (state, patch: { id: string; columnId: KanbanColumnId } | { id: string; restore: true }) => {
      if ("restore" in patch) {
        return state.map((row) => (row.id === patch.id ? { ...row, lost: false } : row));
      }
      if (patch.columnId === "LOST") {
        return state.map((row) => (row.id === patch.id ? { ...row, lost: true } : row));
      }
      const column = KANBAN_COLUMNS.find((c) => c.id === patch.columnId);
      if (!column) return state;
      return state.map((row) =>
        row.id === patch.id ? { ...row, ...column.fields, lost: false } : row,
      );
    },
  );
  const [, startTransition] = useTransition();
  const [flashId, setFlashId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const targetColumnId = event.over?.id as KanbanColumnId | undefined;
    if (!targetColumnId) return;

    const row = optimisticData.find((r) => r.id === event.active.id);
    if (!row) return;
    if (columnIdFor(row) === targetColumnId) return;

    startTransition(async () => {
      setOptimisticData({ id: row.id, columnId: targetColumnId });
      setFlashId(row.id);
      setTimeout(() => setFlashId(null), 700);
      try {
        await moveKanbanCardAction(row.id, targetColumnId);
      } catch {
        toast.error("La mise à jour a échoué.");
      }
    });
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      setOptimisticData({ id, restore: true });
      try {
        await restoreFromLostAction(id);
      } catch {
        toast.error("La récupération a échoué.");
      }
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            toneClass={column.toneClass}
            rows={sortByDateAsc(optimisticData.filter((row) => columnIdFor(row) === column.id))}
            flashId={flashId}
          />
        ))}
        <KanbanColumn
          id={LOST_COLUMN.id}
          label={LOST_COLUMN.label}
          toneClass={LOST_COLUMN.toneClass}
          rows={sortByDateAsc(optimisticData.filter((row) => columnIdFor(row) === "LOST"))}
          onRestore={handleRestore}
          flashId={flashId}
        />
      </div>
    </DndContext>
  );
}
