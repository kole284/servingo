import "server-only";
import { Prisma, type Service, type Unit } from "@/generated/prisma/client";
import { requireAdmin } from "./admin";
import { prisma } from "./db";

export const SERVICES = ["ketering", "torte_i_kolaci", "kuvana_jela"] as const satisfies Service[];
export const UNITS = ["kg", "kom", "porcija", "paket"] as const satisfies Unit[];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const text = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().slice(0, max);
const checked = (form: FormData, name: string) => form.get(name) === "on";

/** A whole number from the form, or null when it is missing or out of range. */
function int(form: FormData, name: string, min: number, max: number) {
  const value = Number(text(form, name));
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/** "1,5" or "1.5" in units, stored as tenths (15). */
function tenths(form: FormData, name: string) {
  const value = Number(text(form, name).replace(",", "."));
  const result = Math.round(value * 10);
  return Number.isFinite(value) && result > 0 && Math.abs(value * 10 - result) < 1e-6 && result <= 100_000 ? result : null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function listRestaurantsForAdmin() {
  await requireAdmin();
  return prisma.restaurant.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { services: true, _count: { select: { menuItems: { where: { isActive: true } } } } },
  });
}

export async function getRestaurantForAdmin(id: string) {
  await requireAdmin();
  return prisma.restaurant.findUnique({
    where: { id },
    include: { services: true, menuItems: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
}

/** Creates a restaurant (id given) or updates one; replaces its list of services. */
export async function saveRestaurant(existingId: string | null, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = existingId ?? text(form, "id", 60).toLowerCase();
  const data = {
    name: text(form, "name", 120),
    area: text(form, "area", 120),
    pickupAddress: text(form, "pickupAddress"),
    city: text(form, "city", 120),
    orderEmail: text(form, "orderEmail", 200).toLowerCase(),
    phone: text(form, "phone", 40),
    leadTimeHours: int(form, "leadTimeHours", 0, 24 * 60),
    isActive: checked(form, "isActive"),
  };
  const services = SERVICES.filter((service) => checked(form, `service_${service}`));

  if (!SLUG.test(id)) return { ok: false, error: "Oznaka u adresi sme da ima samo mala slova, brojeve i crtice, npr. bistro-dorcol." };
  if (!data.name || !data.area || !data.pickupAddress || !data.city || !data.phone) return { ok: false, error: "Popuni sva polja." };
  if (!EMAIL.test(data.orderEmail)) return { ok: false, error: "Email za porudžbine nije ispravan." };
  if (data.leadTimeHours === null) return { ok: false, error: "Rok mora biti ceo broj sati." };
  if (services.length === 0) return { ok: false, error: "Izaberi bar jednu uslugu." };

  const fields = { ...data, leadTimeHours: data.leadTimeHours };
  try {
    await prisma.$transaction([
      existingId
        ? prisma.restaurant.update({ where: { id }, data: fields })
        : prisma.restaurant.create({ data: { id, ...fields } }),
      prisma.restaurantService.deleteMany({ where: { restaurantId: id } }),
      prisma.restaurantService.createMany({ data: services.map((service) => ({ restaurantId: id, service })) }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Restoran sa oznakom „${id}“ već postoji.` };
    }
    throw error;
  }
  return { ok: true, id };
}

export async function listDrinksForAdmin() {
  await requireAdmin();
  return prisma.menuItem.findMany({ where: { restaurantId: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getMenuItemForAdmin(id: string) {
  await requireAdmin();
  return prisma.menuItem.findUnique({ where: { id }, include: { restaurant: { include: { services: true } } } });
}

/**
 * Creates or updates a dish (restaurantId set) or a Servingo drink (restaurantId null).
 * Items are switched off rather than deleted, so past bills keep their link.
 */
export async function saveMenuItem(existingId: string | null, restaurantId: string | null, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const service: Service | undefined = restaurantId ? SERVICES.find((s) => s === text(form, "service")) : "pica";
  const unit = UNITS.find((u) => u === text(form, "unit"));
  const data = {
    name: text(form, "name", 120),
    description: text(form, "description", 600),
    priceRsd: int(form, "priceRsd", 0, 10_000_000),
    unitNote: text(form, "unitNote", 120) || null,
    minQtyTenths: tenths(form, "min"),
    stepTenths: tenths(form, "step"),
    isPopular: checked(form, "isPopular"),
    isActive: checked(form, "isActive"),
    sortOrder: int(form, "sortOrder", 0, 10_000) ?? 0,
  };

  if (!service) return { ok: false, error: "Izaberi uslugu." };
  if (!unit) return { ok: false, error: "Izaberi jedinicu." };
  if (!data.name || !data.description) return { ok: false, error: "Naziv i opis su obavezni." };
  if (data.priceRsd === null) return { ok: false, error: "Cena mora biti ceo broj dinara." };
  if (data.minQtyTenths === null || data.stepTenths === null) {
    return { ok: false, error: "Najmanja količina i korak moraju biti pozitivni brojevi sa najviše jednom decimalom." };
  }
  if (restaurantId) {
    const offers = await prisma.restaurantService.findFirst({ where: { restaurantId, service } });
    if (!offers) return { ok: false, error: "Restoran nema ovu uslugu. Dodaj je prvo u podacima restorana." };
  }

  const fields = { ...data, service, unit, priceRsd: data.priceRsd, minQtyTenths: data.minQtyTenths, stepTenths: data.stepTenths };
  const item = existingId
    ? await prisma.menuItem.update({ where: { id: existingId }, data: fields })
    : await prisma.menuItem.create({ data: { ...fields, restaurantId } });
  return { ok: true, id: item.id };
}
