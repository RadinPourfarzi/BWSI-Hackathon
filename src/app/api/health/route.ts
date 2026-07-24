import { NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/env";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      application: "Bot or Not",
      configured: Boolean(getPublicSupabaseConfig()),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
