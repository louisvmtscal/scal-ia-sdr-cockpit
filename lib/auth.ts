import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

const ALLOWED_DOMAIN = "@scal-ia.fr";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Les comptes Louis/Chloé existent déjà en base (créés par le seed) sans
      // compte OAuth lié : autorise Auth.js à les relier à leur premier
      // login Google plutôt que de rejeter la connexion. Sans risque ici —
      // accès déjà restreint au domaine @scal-ia.fr ci-dessous.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn({ user }) {
      return user.email?.endsWith(ALLOWED_DOMAIN) ?? false;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
