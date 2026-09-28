import { NextResponse } from "next/server";
import { toggleTask } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = toggleTask(id);
  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}
