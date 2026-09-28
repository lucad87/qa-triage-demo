import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listTasks());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  return NextResponse.json(createTask(title), { status: 201 });
}
