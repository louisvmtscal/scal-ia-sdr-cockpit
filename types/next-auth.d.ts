import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

import type { Role } from "@/lib/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
