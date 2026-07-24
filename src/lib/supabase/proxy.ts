import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

const authenticationPages = ["/sign-in", "/sign-up"];

function isProtectedPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const config = getPublicSupabaseConfig();

  if (!config) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/sign-in";
      destination.searchParams.set("error", "configuration");
      destination.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(destination);
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedRoute = isProtectedPath(pathname);
  const authenticationPage = authenticationPages.includes(pathname);

  if (!user && protectedRoute) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/sign-in";
    destination.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(destination);
  }

  if (user && authenticationPage) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/app";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return response;
}
