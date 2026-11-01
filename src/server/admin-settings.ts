import "server-only";
import { Prisma, type ApplicationStatus } from "@/generated/prisma/client";
import { requireAdmin } from "./admin";
import { prisma } from "./db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (form: FormData, name: string, max = 200) => String(form.get(name) ?? "").trim().slice(0, max);
function int(form: FormData, name: string, min: number, max: number) {
  const value = Number(text(form, name));
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

export async function getSettingsForAdmin() {
  await requireAdmin();
  const [settings, cities] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.deliveryCity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  return { settings, cities };
}

/** Fees apply to new orders only: every bill keeps the amounts it was created with. */
export async function saveSettings(form: FormData): Promise<string | null> {
  await requireAdmin();
  const data = {
    deliveryFeeRsd: int(form, "deliveryFeeRsd", 0, 100_000),
    platformFeeRsd: int(form, "platformFeeRsd", 0, 100_000),
    deliveryMinimumRsd: int(form, "deliveryMinimumRsd", 0, 10_000_000),
    pendingPaymentMinutes: int(form, "pendingPaymentMinutes", 5, 24 * 60),
    servingoOrdersEmail: text(form, "servingoOrdersEmail").toLowerCase(),
    contactEmail: text(form, "contactEmail").toLowerCase(),
  };
  if (data.deliveryFeeRsd === null || data.platformFeeRsd === null || data.deliveryMinimumRsd === null) {
    return "Iznosi moraju biti celi brojevi dinara.";
  }
  if (data.pendingPaymentMinutes === null) return "Rok za uplatu mora biti između 5 i 1440 minuta.";
  if (!EMAIL.test(data.servingoOrdersEmail) || !EMAIL.test(data.contactEmail)) return "Proveri email adrese.";
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...data,
      deliveryFeeRsd: data.deliveryFeeRsd,
      platformFeeRsd: data.platformFeeRsd,
      deliveryMinimumRsd: data.deliveryMinimumRsd,
      pendingPaymentMinutes: data.pendingPaymentMinutes,
    },
  });
  return null;
}

export async function addDeliveryCity(form: FormData): Promise<string | null> {
  await requireAdmin();
  const name = text(form, "name", 80);
  if (name.length < 2) return "Upiši naziv mesta.";
  const last = await prisma.deliveryCity.aggregate({ _max: { sortOrder: true } });
  try {
    await prisma.deliveryCity.create({ data: { name, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return `„${name}“ je već na listi.`;
    throw error;
  }
  return null;
}

/** Cities are switched off rather than deleted, so the checkout list can be restored. */
export async function toggleDeliveryCity(id: number) {
  await requireAdmin();
  const city = await prisma.deliveryCity.findUnique({ where: { id } });
  if (city) await prisma.deliveryCity.update({ where: { id }, data: { isActive: !city.isActive } });
}

export async function listInbox() {
  await requireAdmin();
  const [messages, applications] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.partnerApplication.findMany({ orderBy: [{ createdAt: "desc" }], take: 200 }),
  ]);
  return { messages, applications };
}

export const APPLICATION_STATUSES = ["new", "contacted", "accepted", "rejected"] as const satisfies ApplicationStatus[];

export async function setApplicationStatus(id: string, status: string) {
  await requireAdmin();
  const valid = APPLICATION_STATUSES.find((s) => s === status);
  if (valid) await prisma.partnerApplication.update({ where: { id }, data: { status: valid } });
}
