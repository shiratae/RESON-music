import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isPublicPath } from "@/lib/auth/public-paths";
import { routing } from "@/i18n/routing";
import {
  getLocalePathname,
  localizePathname,
} from "@/i18n/locales";

const handleI18nRouting = createIntlMiddleware(routing);

// These endpoints authenticate server-to-server requests themselves (Stripe signature / CRON_SECRET).
// They must not require a Supabase browser session in middleware.
const SERVICE_AUTH_PATHS = new Set([
  "/api/stripe/webhook",
  "/api/distribution/run",
  "/api/fraud/run",
  "/api/curator/run",
  "/api/payout/batch",
  "/api/payout/process",
  "/api/tracks/review",
  "/api/artist/review",
  "/api/dev/seed-account",
]);

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()"
  );
  return response;
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isApiPath(path)) {
    if (SERVICE_AUTH_PATHS.has(path)) {
      return withSecurityHeaders(NextResponse.next());
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/login", request.url))
      );
    }

    return withSecurityHeaders(response);
  }

  const { locale, pathname } = getLocalePathname(path);
  let response = handleI18nRouting(request);

  // Public pages do not need a Supabase session refresh.
  if (isPublicPath(pathname)) {
    return withSecurityHeaders(response);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = handleI18nRouting(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath = localizePathname("/login", locale);
    return withSecurityHeaders(
      NextResponse.redirect(new URL(loginPath, request.url))
    );
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
