import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";

/**
 * Sign-in for Servingo staff at /admin. Email and password only, no public sign-up:
 * accounts are made with `npm run admin:create`. Reads BETTER_AUTH_SECRET.
 * Sign-in and sign-out run as Server Actions, so no /api/auth route is mounted.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  user: { additionalFields: { role: { type: "string", input: false, defaultValue: "admin" } } },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  // Must stay last: lets Server Actions set the session cookie.
  plugins: [nextCookies()],
});
