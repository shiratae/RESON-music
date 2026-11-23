import jaMessages from "@/messages/ja.json";
import type { Locale as AppLocale } from "./locales";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof jaMessages;
  }
}
