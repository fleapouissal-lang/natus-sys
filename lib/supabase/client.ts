import { createBrowserClient } from "@supabase/ssr";
import { asBrowserSessionCookieOptions } from "@/lib/supabase/session-cookies";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split(";").reduce<Array<{ name: string; value: string }>>(
            (acc, part) => {
              const [name, ...rest] = part.trim().split("=");
              if (!name) return acc;
              acc.push({ name, value: rest.join("=") });
              return acc;
            },
            []
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const sessionOptions = asBrowserSessionCookieOptions(options);
            let cookie = `${name}=${encodeURIComponent(value)}`;
            cookie += `; path=${sessionOptions.path ?? "/"}`;
            cookie += `; samesite=${sessionOptions.sameSite ?? "lax"}`;
            if (sessionOptions.secure) cookie += "; secure";
            if (sessionOptions.domain) cookie += `; domain=${sessionOptions.domain}`;
            if (sessionOptions.maxAge !== undefined && sessionOptions.maxAge <= 0) {
              cookie += "; max-age=0";
            }
            document.cookie = cookie;
          });
        },
      },
    }
  );
}
