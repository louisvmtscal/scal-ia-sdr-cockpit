import "server-only";

import { prisma } from "@/lib/prisma";
import type { HonoreStatus, Origine } from "@/lib/generated/prisma/enums";

type SheetRow = {
  prenom: string;
  nom: string;
  societe: string;
  dateRaw: string;
  honoreRaw: string;
  qualifieRaw: string;
  origineRaw: string;
  note: string;
};

/**
 * Insensible aux accents, à la casse et aux tirets/underscores (traités
 * comme des espaces) — un nom écrit différemment entre le Sheet et la base
 * (ex. "Jean-Pierre" vs "jean pierre") faisait échouer le rapprochement et
 * recréait une ligne fantôme à chaque passage du cron, y compris juste après
 * sa suppression manuelle (signalé par Louis le 2026-10-21). Même technique
 * que services/fireflies/matching.ts et services/hubspot-sync.ts.
 */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

function mapHonore(value: string): HonoreStatus {
  const v = value.toLowerCase();
  if (v === "oui") return "OUI";
  if (v === "non") return "NON";
  if (v.includes("reprog")) return "A_REPLACER";
  return "EN_ATTENTE";
}

function mapQualifie(value: string): boolean {
  return value.toLowerCase() === "oui";
}

function mapOrigine(value: string): Origine {
  return value.toLowerCase().startsWith("in") ? "INBOUND" : "OUTBOUND";
}

/** DD/MM/YYYY -> minuit UTC ; ISO datetime déjà horodaté -> tel quel. */
function parseDate(dateRaw: string): Date | null {
  if (!dateRaw) return null;

  if (dateRaw.includes("T") && dateRaw.includes("Z")) {
    const parsed = new Date(dateRaw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
}

function parseCsv(raw: string): SheetRow[] {
  const lines = raw.split("\n").slice(1); // ignore l'en-tête
  const rows: SheetRow[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const [prenom, nom, societe, dateRaw, honoreRaw, qualifieRaw, origineRaw, note] =
      line.split(",");

    rows.push({
      prenom: (prenom ?? "").trim(),
      nom: (nom ?? "").trim(),
      societe: (societe ?? "").trim(),
      dateRaw: (dateRaw ?? "").trim(),
      honoreRaw: (honoreRaw ?? "").trim(),
      qualifieRaw: (qualifieRaw ?? "").trim(),
      origineRaw: (origineRaw ?? "").trim(),
      note: (note ?? "").trim(),
    });
  }

  return rows.filter((r) => r.prenom && r.prenom.toLowerCase() !== "bonus total");
}

export type SyncSheetResult = {
  lignesLues: number;
  crees: number;
  misAJour: number;
  inchanges: number;
  ignores: Array<{ prenom: string; nom: string; societe: string }>;
};

/**
 * Synchronise le tableau Google Sheet vers RendezVous. Ne supprime jamais une
 * ligne absente du sheet, et ne touche jamais `honore`/`qualifie` sur un RDV
 * déjà existant : ce sont des cases cochées/modifiées à la main dans le
 * Cockpit (voir rendez-vous-table.tsx), et le Sheet n'est plus tenu à jour en
 * parallèle — un écrasement quotidien les "décochait" silencieusement
 * (signalé par Louis le 2026-10-16). Seuls `dateRDV`/`origine` sont corrigés
 * sur une ligne existante ; `honore`/`qualifie` ne sont posés qu'à la
 * création. Les nouvelles lignes sont créées avec Louis comme commercial par
 * défaut (le sheet n'a pas de colonne Commercial — 100% des RDV existants
 * étaient déjà Louis au moment où cette sync a été introduite). Chaque
 * nouvelle ligne est marquée éligible au digest Agathe (voir
 * services/digest-agathe.ts), jamais sur une simple mise à jour d'un RDV
 * existant.
 */
export async function syncRendezVousFromSheet(): Promise<SyncSheetResult> {
  const csvUrl = process.env.RDV_SHEET_CSV_URL;
  if (!csvUrl) {
    throw new Error("RDV_SHEET_CSV_URL manquante.");
  }

  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impossible de lire le Google Sheet (HTTP ${response.status}).`);
  }
  const raw = await response.text();

  const rows = parseCsv(raw);
  const [existing, louis] = await Promise.all([
    prisma.rendezVous.findMany(),
    prisma.user.findUniqueOrThrow({ where: { email: "louis@scal-ia.fr" } }),
  ]);

  let crees = 0;
  let misAJour = 0;
  let inchanges = 0;
  const ignores: SyncSheetResult["ignores"] = [];

  for (const row of rows) {
    const date = parseDate(row.dateRaw);
    const honore = mapHonore(row.honoreRaw);
    const qualifie = mapQualifie(row.qualifieRaw);
    const origine = mapOrigine(row.origineRaw);

    if (!date) {
      ignores.push({ prenom: row.prenom, nom: row.nom, societe: row.societe });
      continue;
    }

    const match = existing.find(
      (e) =>
        normalize(e.prenom) === normalize(row.prenom) && normalize(e.nom) === normalize(row.nom),
    );

    if (match) {
      const needsUpdate = match.origine !== origine || match.dateRDV.getTime() !== date.getTime();

      if (needsUpdate) {
        await prisma.rendezVous.update({
          where: { id: match.id },
          data: {
            origine,
            dateRDV: date,
            notes: match.notes ?? (row.note || null),
          },
        });
        misAJour++;
      } else {
        inchanges++;
      }
    } else {
      await prisma.rendezVous.create({
        data: {
          commercialId: louis.id,
          origine,
          nom: row.nom,
          prenom: row.prenom,
          societe: row.societe,
          dateRDV: date,
          honore,
          qualifie,
          notes: row.note || null,
          digestAgatheEnvoye: false,
        },
      });
      crees++;
    }
  }

  return { lignesLues: rows.length, crees, misAJour, inchanges, ignores };
}
