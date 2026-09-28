"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { syncRendezVousFromSheet, type SyncSheetResult } from "@/services/sheet-sync";

export type SyncSheetActionResult = { error: string } | { success: true; result: SyncSheetResult };

export async function syncSheetAction(): Promise<SyncSheetActionResult> {
  const session = await auth();
  if (session?.user?.role === "SDR") {
    return { error: "Réservé aux administrateurs." };
  }

  try {
    const result = await syncRendezVousFromSheet();
    revalidatePath("/");
    revalidatePath("/rendez-vous");
    return { success: true, result };
  } catch (error) {
    console.error("Erreur synchronisation Google Sheet :", error);
    return { error: "La synchronisation a échoué." };
  }
}
