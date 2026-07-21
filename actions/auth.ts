"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export type LoginActionResult = { error: string } | undefined;

export async function loginAction(input: LoginInput): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Merci de renseigner un email et un mot de passe valides." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/connexion" });
}
