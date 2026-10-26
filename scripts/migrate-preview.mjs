// Neon gives every preview deployment its own database branch, copied from production when the
// git branch is first deployed; it misses migrations added after that. Bring it up to date here.
// Production is migrated by hand, never from a build.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "preview") {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
