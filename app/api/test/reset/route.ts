import { NextResponse } from "next/server";
import { resetTasks } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  resetTasks();
  return NextResponse.json({ ok: true });
}
