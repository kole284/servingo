"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminFormState } from "../admin-form";
import { auth } from "@/server/auth";

export async function signIn(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch {
    // Same message for an unknown email and a wrong password.
    return { error: "Pogrešan email ili lozinka." };
  }
  redirect("/admin");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/prijava");
}
