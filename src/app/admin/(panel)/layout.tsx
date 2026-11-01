import Link from "next/link";
import { requireAdmin } from "@/server/admin";
import { signOut } from "../prijava/actions";

const NAV = [
  { href: "/admin/porudzbine", label: "Porudžbine" },
  { href: "/admin/nabavka", label: "Pića za nabavku" },
  { href: "/admin/restorani", label: "Restorani" },
  { href: "/admin/pica", label: "Ponuda pića" },
  { href: "/admin/poruke", label: "Poruke i prijave" },
  { href: "/admin/podesavanja", label: "Podešavanja" },
];

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-4 md:px-6 xl:px-12">
          <Link href="/admin" className="text-xl font-semibold text-accent">
            Servingo <span className="caps text-muted">admin</span>
          </Link>
          <form action={signOut} className="flex items-center gap-4 text-[14px] text-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <button type="submit" className="caps border border-ink px-4 py-2 text-ink hover:bg-surface">
              Odjavi se
            </button>
          </form>
          <nav className="w-full overflow-x-auto [scrollbar-width:none]">
            <ul className="flex gap-6">
              {NAV.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link href={item.href} className="caps block py-1 text-muted hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 md:px-6 md:py-10 xl:px-12">{children}</main>
    </div>
  );
}
