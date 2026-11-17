import "server-only";
import { prisma } from "./db";
import { normalizeCode } from "./promo";

export type CompanyCheck =
  | {
      ok: true;
      company: { id: string; name: string; pib: string; mb: string; address: string; billingEmail: string };
      feePercent: number;
    }
  | { ok: false; reason: "company_invalid" | "company_email" };

/** The part after @, in lower case: "Ana@Firma.RS" → "firma.rs". */
const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/**
 * Whether this employee may order on the company's invoice: the company's code, and an email that is
 * on its member list or on its email domain. There are no passwords, so the code alone is never enough.
 */
export async function findCompany(rawCode: string | undefined, rawEmail: string | undefined): Promise<CompanyCheck> {
  const code = normalizeCode(rawCode);
  const email = (rawEmail ?? "").trim().toLowerCase();
  if (!code) return { ok: false, reason: "company_invalid" };
  const [company, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { orderCode: code },
      include: { members: { where: { email }, select: { id: true } } },
    }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 }, select: { companyFeePercent: true } }),
  ]);
  if (!company || !company.isActive) return { ok: false, reason: "company_invalid" };
  const allowed = company.members.length > 0 || (!!company.emailDomain && domainOf(email) === company.emailDomain);
  if (!email || !allowed) return { ok: false, reason: "company_email" };
  const { id, name, pib, mb, address, billingEmail } = company;
  return { ok: true, company: { id, name, pib, mb, address, billingEmail }, feePercent: company.feePercent ?? settings.companyFeePercent };
}
