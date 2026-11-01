"use server";

import { refresh } from "next/cache";
import type { BillStatus } from "@/generated/prisma/client";
import { advanceBillAsAdmin } from "@/server/admin-orders";

export async function advanceBill(billId: string, from: BillStatus) {
  await advanceBillAsAdmin(billId, from);
  refresh();
}
