"use server";

import { refresh } from "next/cache";
import { setApplicationStatus } from "@/server/admin-settings";

export async function setStatusAction(id: string, form: FormData) {
  await setApplicationStatus(id, String(form.get("status") ?? ""));
  refresh();
}
