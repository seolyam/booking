import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./src/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes that don't need auth, and public assets
  // This significantly reduces response time for these resources
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.includes(".") || // Static files like .ico, .png, .css, .js
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseEnv());
  } catch {
    // Allow the app to run even when env vars are not set (e.g. CI / first-time setup)
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          response.cookies.set({
            name,
            value,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        }
      },
    },
  });

  // Refresh session if needed (safe no-op when not logged in)
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // More restrictive matcher - only run on pages that need auth
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*", "/"],
};
