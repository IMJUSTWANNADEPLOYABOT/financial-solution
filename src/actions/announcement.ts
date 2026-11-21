"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { ANNOUNCEMENT } from "@/lib/announcement";
import { requireUser } from "@/lib/auth";

export async function acknowledgeAnnouncement(): Promise<ActionResult> {
  const user = await requireUser();
  db.update(users).set({ seenAnnouncement: ANNOUNCEMENT.id }).where(eq(users.id, user.id)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}
