"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type LocaleSwitcherProps = {
  href: string;
  className?: string;
};

export function LocaleSwitcher({
  href,
  className = "",
}: LocaleSwitcherProps) {
  const locale = useLocale();
  const t = useTranslations("Common.language");
  const targetLocale: Locale = locale === "ja" ? "en" : "ja";
  const label =
    targetLocale === "en" ? t("switchToEnglish") : t("switchToJapanese");
  const languageCode = targetLocale.toUpperCase();

  return (
    <Link
      href={href}
      locale={targetLocale}
      title={label}
      className={className}
    >
      {languageCode}
      <span className="sr-only"> ({label})</span>
    </Link>
  );
}
