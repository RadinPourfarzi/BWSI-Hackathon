import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = new URL(nextPath, request.url);
      destination.searchParams.set("auth", "confirmed");
      return NextResponse.redirect(destination);
    }
  }

  const destination = new URL("/sign-in", request.url);
  destination.searchParams.set(
    "error",
    supabase ? "callback" : "configuration",
  );
  return NextResponse.redirect(destination);
}
