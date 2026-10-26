// Temporary: shows which database a Vercel build talks to (host only) and its migration state.
import { execSync } from "node:child_process";
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
console.log(`[db-check] VERCEL_ENV=${process.env.VERCEL_ENV} host=${url.replace(/.*@([^/:?]+).*/, "$1")}`);
try {
  execSync("npx prisma migrate status", { stdio: "inherit" });
} catch {
  // migrate status exits non-zero when migrations are pending; the output is what matters.
}
