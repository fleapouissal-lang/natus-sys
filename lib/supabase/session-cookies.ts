import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/** Session navigateur : pas de Max-Age → cookie supprimé à la fermeture du navigateur. */
export function asSessionCookieOptions(
  options: Partial<ResponseCookie> = {}
): Partial<ResponseCookie> {
  if (options.maxAge !== undefined && options.maxAge <= 0) {
    return options;
  }

  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}

export type BrowserCookieOptions = {
  maxAge?: number;
  expires?: Date | string;
  path?: string;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
};

export function asBrowserSessionCookieOptions(
  options: BrowserCookieOptions = {}
): BrowserCookieOptions {
  if (options.maxAge !== undefined && options.maxAge <= 0) {
    return options;
  }

  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}
