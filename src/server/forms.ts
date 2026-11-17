import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/i18n/config";
import type { Service } from "@/generated/prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { sign } from "./signing";

export type FormResult = { ok: true } | { ok: false; error: "invalid"; fields: string[] } | { ok: false; error: "too_many" | "failed" } | null;

/** The site's categories, as the form sends them (hyphens) and as the database stores them. */
const SERVICES: Record<string, Service> = { ketering: "ketering", "torte-i-kolaci": "torte_i_kolaci", "kuvana-jela": "kuvana_jela", pica: "pica" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s/()-]{6,}$/;
const clean = (value: string | undefined, max: number) => value?.trim().slice(0, max) || undefined;

/** At most this many sends per form from one address in the window, so a bot cannot flood the inbox. */
const LIMIT = 5;
const WINDOW_MS = 10 * 60_000;

// Only an HMAC of the IP is stored; it is enough to count repeats.
async function senderHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return sign("ip", ip);
}

const since = () => new Date(Date.now() - WINDOW_MS);

async function notifyServingo(subject: string, text: string, replyTo: string) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  const { status, error } = await sendMail({ to: settings.contactEmail, subject, text, replyTo });
  // The message is already saved, so a failed email is logged rather than shown to the sender.
  if (status === "failed") console.error(`[forms] email failed: ${error}`);
}

export async function submitContact(
  input: { name?: string; email?: string; phone?: string; orderCode?: string; message?: string; website?: string },
  locale: Locale,
): Promise<FormResult> {
  // Hidden field only bots fill in: pretend it worked and keep nothing.
  if (input.website) return { ok: true };

  const name = clean(input.name, 120);
  const email = clean(input.email, 200);
  const phone = clean(input.phone, 40);
  const orderCode = clean(input.orderCode, 20)?.toUpperCase();
  const message = clean(input.message, 5000);
  const fields = [
    ...(!name || name.length < 2 ? ["name"] : []),
    ...(!email || !EMAIL.test(email) ? ["email"] : []),
    ...(phone && !PHONE.test(phone) ? ["phone"] : []),
    ...(!message || message.length < 10 ? ["message"] : []),
  ];
  if (fields.length > 0) return { ok: false, error: "invalid", fields };

  const ipHash = await senderHash();
  if ((await prisma.contactMessage.count({ where: { ipHash, createdAt: { gte: since() } } })) >= LIMIT) {
    return { ok: false, error: "too_many" };
  }

  await prisma.contactMessage.create({ data: { name: name!, email: email!, phone, orderCode, message: message!, locale, ipHash } });
  await notifyServingo(
    `Poruka sa sajta: ${name}${orderCode ? `, porudžbina ${orderCode}` : ""}`,
    [`Od: ${name}, ${email}${phone ? `, ${phone}` : ""}`, ...(orderCode ? [`Porudžbina: ${orderCode}`] : []), message!].join("\n\n"),
    email!,
  );
  return { ok: true };
}

const SERVICE_LABEL: Record<Service, string> = {
  ketering: "Ketering",
  torte_i_kolaci: "Torte i kolači",
  kuvana_jela: "Kuvana jela",
  pica: "Pića",
};

export async function submitPartnerApplication(
  input: {
    businessName?: string;
    services?: string[];
    contactName?: string;
    email?: string;
    phone?: string;
    area?: string;
    message?: string;
    website?: string;
  },
  locale: Locale,
): Promise<FormResult> {
  if (input.website) return { ok: true };

  const businessName = clean(input.businessName, 200);
  const services = [...new Set((input.services ?? []).flatMap((id) => (SERVICES[id] ? [SERVICES[id]] : [])))];
  const contactName = clean(input.contactName, 120);
  const email = clean(input.email, 200);
  const phone = clean(input.phone, 40);
  const area = clean(input.area, 120);
  const message = clean(input.message, 5000);
  const fields = [
    ...(!businessName ? ["businessName"] : []),
    ...(services.length === 0 ? ["services"] : []),
    ...(!contactName || contactName.length < 2 ? ["contactName"] : []),
    ...(!email || !EMAIL.test(email) ? ["email"] : []),
    ...(!phone || !PHONE.test(phone) ? ["phone"] : []),
    ...(!area ? ["area"] : []),
  ];
  if (fields.length > 0) return { ok: false, error: "invalid", fields };

  const ipHash = await senderHash();
  if ((await prisma.partnerApplication.count({ where: { ipHash, createdAt: { gte: since() } } })) >= LIMIT) {
    return { ok: false, error: "too_many" };
  }

  await prisma.partnerApplication.create({
    data: { businessName: businessName!, services, contactName: contactName!, email: email!, phone: phone!, area: area!, message, locale, ipHash },
  });
  await notifyServingo(
    `Prijava za saradnju: ${businessName}`,
    [
      `${businessName}, ${area}\nNudi: ${services.map((service) => SERVICE_LABEL[service]).join(", ")}`,
      `Kontakt: ${contactName}, ${phone}, ${email}`,
      ...(message ? [message] : []),
    ].join("\n\n"),
    email!,
  );
  return { ok: true };
}
