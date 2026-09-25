"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import type { HonoreStatus, Origine } from "@/lib/generated/prisma/enums";
import { KANBAN_COLUMNS, type KanbanColumnId } from "@/lib/kanban-columns";
import { prisma } from "@/lib/prisma";
import {
  honoreStatusSchema,
  origineSchema,
  rendezVousSchema,
  type RendezVousInput,
} from "@/lib/validations/rendez-vous";

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildData(input: RendezVousInput) {
  return {
    commercialId: input.commercialId,
    origine: input.origine,
    nom: input.nom,
    prenom: input.prenom,
    societe: input.societe,
    poste: input.poste || null,
    email: input.email || null,
    telephone: input.telephone || null,
    linkedin: input.linkedin || null,
    notes: input.notes || null,
  };
}

function revalidateRendezVous() {
  revalidatePath("/");
  revalidatePath("/rendez-vous");
}

/**
 * Un SDR ne peut jamais attribuer un RDV à quelqu'un d'autre que lui-même,
 * même si le payload envoyé dit le contraire (défense en profondeur — le
 * formulaire cache déjà ce choix côté UI). Admin/Manager choisissent
 * librement.
 */
async function commercialIdAutorise(demande: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role === "SDR") return session.user.id;
  return demande;
}

export type RendezVousActionResult = { error: string } | { success: true };

export async function createRendezVousAction(
  input: RendezVousInput,
): Promise<RendezVousActionResult> {
  const parsed = rendezVousSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Formulaire invalide, merci de vérifier les champs." };
  }

  const dateRDV = toDate(parsed.data.dateRDV);

  if (!dateRDV) {
    return { error: "La date du rendez-vous est invalide." };
  }

  const commercialId = await commercialIdAutorise(parsed.data.commercialId);
  if (!commercialId) {
    return { error: "Session invalide, merci de te reconnecter." };
  }

  await prisma.rendezVous.create({
    data: { ...buildData(parsed.data), commercialId, dateRDV },
  });

  revalidateRendezVous();
  return { success: true };
}

export async function updateRendezVousAction(
  id: string,
  input: RendezVousInput,
): Promise<RendezVousActionResult> {
  const parsed = rendezVousSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Formulaire invalide, merci de vérifier les champs." };
  }

  const dateRDV = toDate(parsed.data.dateRDV);

  if (!dateRDV) {
    return { error: "La date du rendez-vous est invalide." };
  }

  const commercialId = await commercialIdAutorise(parsed.data.commercialId);
  if (!commercialId) {
    return { error: "Session invalide, merci de te reconnecter." };
  }

  await prisma.rendezVous.update({
    where: { id },
    data: { ...buildData(parsed.data), commercialId, dateRDV },
  });

  revalidateRendezVous();
  return { success: true };
}

export async function deleteRendezVousAction(id: string) {
  await prisma.rendezVous.delete({ where: { id } });
  revalidateRendezVous();
}

export async function updateHonoreAction(id: string, honore: HonoreStatus) {
  const parsed = honoreStatusSchema.safeParse(honore);
  if (!parsed.success) return;

  // "Non honoré" est déprécié au profit de "À replacer" (voir migration) :
  // un no-show se retraite en tentative de reprog, jamais en cul-de-sac.
  const honoreFinal = parsed.data === "NON" ? "A_REPLACER" : parsed.data;

  await prisma.rendezVous.update({ where: { id }, data: { honore: honoreFinal } });
  revalidateRendezVous();
}

export async function toggleQualifieAction(id: string, qualifie: boolean) {
  await prisma.rendezVous.update({ where: { id }, data: { qualifie } });
  revalidateRendezVous();
}

export async function updateOrigineAction(id: string, origine: Origine) {
  const parsed = origineSchema.safeParse(origine);
  if (!parsed.success) return;

  await prisma.rendezVous.update({ where: { id }, data: { origine: parsed.data } });
  revalidateRendezVous();
}

/**
 * Déplace une carte du Kanban vers une colonne. "Lost" ne touche qu'au
 * drapeau lost (honore/qualifie/r2/deal préservés pour la récupération) ;
 * toute autre colonne applique son jeu de champs et sort du lost.
 */
export async function moveKanbanCardAction(id: string, columnId: KanbanColumnId) {
  if (columnId === "LOST") {
    await prisma.rendezVous.update({ where: { id }, data: { lost: true } });
    revalidateRendezVous();
    return;
  }

  const column = KANBAN_COLUMNS.find((c) => c.id === columnId);
  if (!column) return;

  await prisma.rendezVous.update({ where: { id }, data: { ...column.fields, lost: false } });
  revalidateRendezVous();
}

/** Sort une carte de "Lost" sans changer son statut — elle réapparaît là où honore/qualifie/r2/deal la placent. */
export async function restoreFromLostAction(id: string) {
  await prisma.rendezVous.update({ where: { id }, data: { lost: false } });
  revalidateRendezVous();
}
