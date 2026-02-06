import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./src/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseEnv());
  } catch {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Pass pathname to server components
  response.headers.set("x-pathname", pathname);

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
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*", "/"],
};
