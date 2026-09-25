"use client";

import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteRendezVousAction,
  toggleQualifieAction,
  updateHonoreAction,
  updateOrigineAction,
} from "@/actions/rendez-vous";
import { EmailJ25Dialog } from "@/components/rendez-vous/email-j25-dialog";
import { FirefliesDialog } from "@/components/rendez-vous/fireflies-dialog";
import { ModifierRendezVousDialog } from "@/components/rendez-vous/modifier-rendez-vous-dialog";
import { PreparationDialog } from "@/components/rendez-vous/preparation-dialog";
import { SupprimerRendezVousButton } from "@/components/rendez-vous/supprimer-rendez-vous-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HONORE_LABELS, ORIGINE_LABELS } from "@/lib/constants/rendez-vous";
import type { RendezVous } from "@/lib/generated/prisma/client";
import type { HonoreStatus, Origine, Role } from "@/lib/generated/prisma/enums";
import type { TeamMember } from "@/lib/team";
import { formatDateTime } from "@/utils/format";

export type RendezVousAvecCommercial = RendezVous & {
  commercial: { id: string; name: string | null; email: string };
};

type SortKey = "dateRDV" | "societe";
type SortDir = "asc" | "desc";

const ORIGINE_FILTER_LABELS = {
  TOUTES: "Toutes origines",
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

const HONORE_FILTER_LABELS = {
  TOUS: "Honoré : tous",
  EN_ATTENTE: "Honoré : en attente",
  OUI: "Honoré : oui",
  NON: "Honoré : non",
  A_REPLACER: "Honoré : à replacer",
};

/**
 * Vert = honoré et qualifié, orange = à replacer, rouge = non honoré ou
 * honoré sans être qualifié, blanc = en attente. Purement indicatif — la
 * valeur exacte reste toujours lisible dans les colonnes Honoré/Qualifié.
 */
function rowToneClass(row: { honore: HonoreStatus; qualifie: boolean }) {
  if (row.honore === "A_REPLACER") {
    return "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-950/50";
  }
  if (row.honore === "OUI" && row.qualifie) {
    return "bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50";
  }
  if (row.honore === "NON" || (row.honore === "OUI" && !row.qualifie)) {
    return "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50";
  }
  return "";
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:text-foreground inline-flex items-center gap-1"
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )
      ) : null}
    </button>
  );
}

export function RendezVousTable({
  data,
  teamMembers,
  currentUser,
  isDev = false,
}: {
  data: RendezVousAvecCommercial[];
  teamMembers: TeamMember[];
  currentUser: { id: string; role: Role };
  isDev?: boolean;
}) {
  const [optimisticData, setOptimisticData] = useOptimistic(
    data,
    (
      state,
      update:
        | { type: "patch"; id: string; patch: Partial<RendezVousAvecCommercial> }
        | { type: "remove"; id: string },
    ) => {
      if (update.type === "remove") {
        return state.filter((row) => row.id !== update.id);
      }
      return state.map((row) => (row.id === update.id ? { ...row, ...update.patch } : row));
    },
  );
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [filterCommercial, setFilterCommercial] = useState<string>("TOUS");
  const [filterOrigine, setFilterOrigine] = useState<"TOUTES" | "INBOUND" | "OUTBOUND">("TOUTES");
  const [filterHonore, setFilterHonore] = useState<"TOUS" | HonoreStatus>("TOUS");
  const [sortKey, setSortKey] = useState<SortKey>("dateRDV");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = optimisticData.filter((row) => {
      if (filterCommercial !== "TOUS" && row.commercialId !== filterCommercial) return false;
      if (filterOrigine !== "TOUTES" && row.origine !== filterOrigine) return false;
      if (filterHonore !== "TOUS" && row.honore !== filterHonore) return false;

      if (!term) return true;

      const haystack = [row.nom, row.prenom, row.societe, row.poste, row.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "societe") {
        comparison = a.societe.localeCompare(b.societe);
      } else {
        const aValue = a[sortKey]?.getTime() ?? 0;
        const bValue = b[sortKey]?.getTime() ?? 0;
        comparison = aValue - bValue;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [optimisticData, search, filterCommercial, filterOrigine, filterHonore, sortKey, sortDir]);

  function handleUpdateHonore(row: RendezVousAvecCommercial, honore: HonoreStatus) {
    startTransition(async () => {
      setOptimisticData({ type: "patch", id: row.id, patch: { honore } });
      await updateHonoreAction(row.id, honore);
    });
  }

  function handleUpdateOrigine(row: RendezVousAvecCommercial, origine: Origine) {
    startTransition(async () => {
      setOptimisticData({ type: "patch", id: row.id, patch: { origine } });
      await updateOrigineAction(row.id, origine);
    });
  }

  function handleToggleQualifie(row: RendezVousAvecCommercial, qualifie: boolean) {
    startTransition(async () => {
      setOptimisticData({ type: "patch", id: row.id, patch: { qualifie } });
      await toggleQualifieAction(row.id, qualifie);
    });
  }

  async function handleDelete(row: RendezVousAvecCommercial) {
    setOptimisticData({ type: "remove", id: row.id });
    try {
      await deleteRendezVousAction(row.id);
    } catch {
      toast.error("La suppression a échoué.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Rechercher un nom, une entreprise..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterCommercial} onValueChange={(value) => setFilterCommercial(value ?? "TOUS")}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) =>
                value === "TOUS"
                  ? "Tous les commerciaux"
                  : (teamMembers.find((m) => m.id === value)?.name ??
                    teamMembers.find((m) => m.id === value)?.email ??
                    value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUS">Tous les commerciaux</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name ?? member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterOrigine}
          onValueChange={(value) => setFilterOrigine(value as typeof filterOrigine)}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) =>
                ORIGINE_FILTER_LABELS[value as keyof typeof ORIGINE_FILTER_LABELS]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUTES">Toutes origines</SelectItem>
            <SelectItem value="INBOUND">Inbound</SelectItem>
            <SelectItem value="OUTBOUND">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterHonore}
          onValueChange={(value) => setFilterHonore(value as typeof filterHonore)}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => HONORE_FILTER_LABELS[value as keyof typeof HONORE_FILTER_LABELS]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUS">Honoré : tous</SelectItem>
            <SelectItem value="EN_ATTENTE">Honoré : en attente</SelectItem>
            <SelectItem value="OUI">Honoré : oui</SelectItem>
            <SelectItem value="NON">Honoré : non</SelectItem>
            <SelectItem value="A_REPLACER">Honoré : à replacer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton
                  label="Date RDV"
                  active={sortKey === "dateRDV"}
                  dir={sortDir}
                  onClick={() => toggleSort("dateRDV")}
                />
              </TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead>
                <SortButton
                  label="Entreprise"
                  active={sortKey === "societe"}
                  dir={sortDir}
                  onClick={() => toggleSort("societe")}
                />
              </TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Honoré</TableHead>
              <TableHead>Qualifié</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground h-32 text-center">
                  Aucun rendez-vous ne correspond à ces critères.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className={rowToneClass(row)}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(row.dateRDV)}</TableCell>
                  <TableCell>{row.commercial.name ?? row.commercial.email}</TableCell>
                  <TableCell>
                    <Select
                      value={row.origine}
                      onValueChange={(value) => handleUpdateOrigine(row, value as Origine)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>{(value: string) => ORIGINE_LABELS[value as Origine]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INBOUND">Inbound</SelectItem>
                        <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-medium">{row.societe}</TableCell>
                  <TableCell>{row.nom}</TableCell>
                  <TableCell>{row.prenom}</TableCell>
                  <TableCell>
                    {row.linkedin ? (
                      <a
                        href={row.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <ExternalLinkIcon className="size-4" />
                        Profil
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.honore}
                      onValueChange={(value) => handleUpdateHonore(row, value as HonoreStatus)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue>{(value: string) => HONORE_LABELS[value as HonoreStatus]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                        <SelectItem value="OUI">Oui</SelectItem>
                        <SelectItem value="NON">Non</SelectItem>
                        <SelectItem value="A_REPLACER">À replacer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.qualifie}
                      onCheckedChange={(checked) => handleToggleQualifie(row, checked)}
                    />
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    <EmailJ25Dialog
                      rendezVousId={row.id}
                      label={`${row.prenom} ${row.nom}`}
                      dateRDV={row.dateRDV}
                      emailJ25={row.emailJ25}
                      telephone={row.telephone}
                      whatsappJ1Status={row.whatsappJ1Status}
                      whatsappJ1SentAt={row.whatsappJ1SentAt}
                      whatsappJ1CampaignId={row.whatsappJ1CampaignId}
                      whatsappH2Status={row.whatsappH2Status}
                      whatsappH2SentAt={row.whatsappH2SentAt}
                      whatsappH2CampaignId={row.whatsappH2CampaignId}
                      whatsappLastError={row.whatsappLastError}
                      smsJourJStatus={row.smsJourJStatus}
                      smsJourJSentAt={row.smsJourJSentAt}
                      smsLastError={row.smsLastError}
                      isDev={isDev}
                    />
                    <PreparationDialog
                      rendezVousId={row.id}
                      label={`${row.prenom} ${row.nom}`}
                      preparation={row.preparation}
                    />
                    <FirefliesDialog
                      rendezVousId={row.id}
                      label={`${row.prenom} ${row.nom}`}
                      societe={row.societe}
                      dateRDV={row.dateRDV}
                      firefliesMeetingId={row.firefliesMeetingId}
                      firefliesMeetingTitle={row.firefliesMeetingTitle}
                      firefliesMeetingDate={row.firefliesMeetingDate}
                      firefliesMeetingUrl={row.firefliesMeetingUrl}
                      compteRendu={row.compteRendu}
                    />
                    <ModifierRendezVousDialog
                      rendezVous={row}
                      teamMembers={teamMembers}
                      currentUser={currentUser}
                    />
                    <SupprimerRendezVousButton
                      label={`${row.prenom} ${row.nom}`}
                      onConfirm={() => handleDelete(row)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
