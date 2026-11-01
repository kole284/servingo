import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "../globals.css";

const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = { title: "Admin | Servingo", robots: { index: false } };

// Every admin page depends on who is signed in, so there is no static shell to prerender.
export const instant = false;

/** Separate root layout: the admin is Serbian only and has no site header or cart. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="sr" className={`${onest.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans">{children}</body>
    </html>
  );
}
