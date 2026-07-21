import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/connexion"];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/connexion",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = PUBLIC_ROUTES.includes(request.nextUrl.pathname);

      if (!isLoggedIn && !isPublicRoute) {
        const redirectUrl = new URL("/connexion", request.nextUrl.origin);
        redirectUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      if (isLoggedIn && isPublicRoute) {
        return NextResponse.redirect(new URL("/", request.nextUrl.origin));
      }

      return true;
    },
  },
};
