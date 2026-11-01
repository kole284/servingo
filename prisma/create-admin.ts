// Creates a Servingo admin, or sets a new password for an existing one.
//   npm run admin:create -- ana@servingo.rs "Ana Anić"
//   npm run admin:create -- ana@servingo.rs "Ana Anić" --env .env.neon   (production)
// The password is read from ADMIN_PASSWORD, or asked for.
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const args = process.argv.slice(2);
const envAt = args.indexOf("--env");
const envFile = envAt >= 0 ? args.splice(envAt, 2)[1] : ".env";
const [email, name] = args;
if (!email || !name) {
  console.error('Usage: npm run admin:create -- <email> "<name>" [--env .env.neon]');
  process.exit(1);
}
config({ path: envFile, quiet: true });

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Password (at least 12 characters): ");
  rl.close();
  return password;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL }),
  });
  try {
    const password = await readPassword();
    if (password.length < 12) throw new Error("The password must have at least 12 characters.");
    const hash = await hashPassword(password);
    const normalized = email.trim().toLowerCase();

    const user = await prisma.user.upsert({
      where: { email: normalized },
      create: { id: randomUUID(), email: normalized, name, role: "admin", emailVerified: true },
      update: { name, role: "admin" },
    });
    const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (account) {
      await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
      // A new password signs out every open session.
      await prisma.session.deleteMany({ where: { userId: user.id } });
    } else {
      await prisma.account.create({
        data: { id: randomUUID(), userId: user.id, accountId: user.id, providerId: "credential", password: hash },
      });
    }
    console.log(`${account ? "Updated" : "Created"} admin ${normalized} (${envFile}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
