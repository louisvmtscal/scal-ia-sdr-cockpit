"use server";

import { signIn, signOut } from "@/lib/auth";

export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/connexion" });
}
