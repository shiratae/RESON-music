export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ja";
export const localeDetection = false as const;

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function getLocalePathname(pathname: string): {
  locale: Locale;
  pathname: string;
} {
  const [, candidate, ...rest] = pathname.split("/");

  if (!isLocale(candidate)) {
    return { locale: defaultLocale, pathname };
  }

  const normalizedPathname = `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  return { locale: candidate, pathname: normalizedPathname };
}

export function localizePathname(pathname: string, locale: Locale): string {
  if (locale === defaultLocale) return pathname;
  if (pathname === "/") return `/${locale}`;
  return `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
