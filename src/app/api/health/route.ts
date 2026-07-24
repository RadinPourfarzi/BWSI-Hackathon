import { NextResponse } from "next/server";
import { container } from "@/server/bootstrap/container";

export async function GET() {
  try {
    await container.repository.getActiveConfig();
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "not-ready" }, { status: 503 });
  }
}
