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

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
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
 * Synchronise le tableau Google Sheet (source de vérité côté Louis) vers
 * RendezVous. Ne supprime jamais une ligne absente du sheet — additif et
 * correctif uniquement (création + mise à jour honore/qualifie/origine/date).
 * Les nouvelles lignes sont créées avec commercial=LOUIS par défaut (le
 * sheet n'a pas de colonne Commercial — 100% des RDV existants étaient déjà
 * Louis au moment où cette sync a été introduite).
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
  const existing = await prisma.rendezVous.findMany();

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
      (e) => normalize(e.prenom) === normalize(row.prenom) && normalize(e.nom) === normalize(row.nom),
    );

    if (match) {
      const needsUpdate =
        match.honore !== honore ||
        match.qualifie !== qualifie ||
        match.origine !== origine ||
        match.dateRDV.getTime() !== date.getTime();

      if (needsUpdate) {
        await prisma.rendezVous.update({
          where: { id: match.id },
          data: {
            honore,
            qualifie,
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
          commercial: "LOUIS",
          origine,
          nom: row.nom,
          prenom: row.prenom,
          societe: row.societe,
          dateRDV: date,
          honore,
          qualifie,
          notes: row.note || null,
        },
      });
      crees++;
    }
  }

  return { lignesLues: rows.length, crees, misAJour, inchanges, ignores };
}
