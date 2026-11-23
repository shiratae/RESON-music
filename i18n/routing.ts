import { defineRouting } from "next-intl/routing";
import { defaultLocale, localeDetection, locales } from "./locales";

export { defaultLocale, locales } from "./locales";
export type { Locale } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection,
});
