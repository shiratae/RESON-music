import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const heroCards = [
  { title: "夜が明けるまで", artist: "ミナミ", completion: 88, color: "#c8f23d" },
  { title: "アスファルトの花", artist: "Kento Rui", completion: 92, color: "#3dc8f2" },
  { title: "波と風と", artist: "海音", completion: 81, color: "#f23d8c" },
];

const artistTiles = [
  { name: "ミナミ", genre: "Lo-fi / Bedroom Pop", color: "#c8f23d" },
  { name: "Kento Rui", genre: "Alternative Rock", color: "#3dc8f2" },
  { name: "海音", genre: "Ambient / Folk", color: "#f23d8c" },
  { name: "ヨル猫", genre: "City Pop", color: "#f2c83d" },
];

export default function LandingPage() {
  const t = useTranslations("Landing");
  const format = useFormatter();

  const features = [
    { title: t("features.distribution.title"), desc: t("features.distribution.desc") },
    { title: t("features.formula.title"), desc: t("features.formula.desc") },
    { title: t("features.discovery.title"), desc: t("features.discovery.desc") },
    { title: t("features.gratitude.title"), desc: t("features.gratitude.desc") },
  ];

  const plans = [
    {
      name: "Free",
      tag: t("pricing.plans.free.tag"),
      price: 0,
      features: [
        t("pricing.plans.free.features.hours"),
        t("pricing.plans.free.features.ads"),
      ],
      featured: false,
      cta: t("pricing.plans.free.cta"),
      href: "/register",
    },
    {
      name: "Standard",
      tag: t("pricing.plans.standard.tag"),
      price: 750,
      features: [
        t("pricing.plans.standard.features.unlimited"),
        t("pricing.plans.standard.features.noAds"),
        t("pricing.plans.standard.features.support"),
      ],
      featured: true,
      cta: t("pricing.plans.standard.cta"),
      href: "/register",
    },
    {
      name: "Support+",
      tag: t("pricing.plans.support.tag"),
      price: 1000,
      features: [
        t("pricing.plans.support.features.quality"),
        t("pricing.plans.support.features.bonus"),
        t("pricing.plans.support.features.fee"),
      ],
      featured: false,
      cta: t("pricing.plans.support.cta"),
      href: "/register",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl font-bold tracking-tight">RESON</span>
          <nav className="hidden gap-8 text-sm text-[var(--dim)] sm:flex">
            <a href="#about" className="hover:text-[var(--text)]">{t("nav.about")}</a>
            <a href="#pricing" className="hover:text-[var(--text)]">{t("nav.pricing")}</a>
            <a href="#artists" className="hover:text-[var(--text)]">{t("nav.artists")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LocaleSwitcher
              href="/"
              className="rounded-full border border-[var(--line-md)] px-3 py-2 text-xs font-semibold text-[var(--dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
            />
            <Link href="/login" className="text-sm text-[var(--dim)] hover:text-[var(--text)]">
              {t("nav.login")}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
            >
              {t("nav.start")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:grid-cols-2 sm:items-center">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {t.rich("hero.title", {
                highlight: (chunks) => (
                  <span className="text-[var(--accent)]">{chunks}</span>
                ),
              })}
            </h1>
            <p className="mt-6 text-base leading-7 text-[var(--dim)]">
              {t("hero.description")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
              >
                {t("hero.listen")}
              </Link>
              <a
                href="#about"
                className="rounded-full border border-[var(--line-md)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
              >
                {t("hero.learnMore")}
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--faint)]">{t("hero.note")}</p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="mb-3 text-xs font-medium text-[var(--faint)]">{t("hero.trending")}</p>
            <ul className="flex flex-col gap-3">
              {heroCards.map((card) => (
                <li
                  key={card.title}
                  className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
                >
                  <span
                    className="h-12 w-12 shrink-0 rounded-lg"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{card.title}</p>
                    <p className="text-xs text-[var(--dim)]">{card.artist}</p>
                  </div>
                  <span className="text-xs text-[var(--faint)]">
                    {t("hero.completion", { value: card.completion })}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-4 block text-center text-xs text-[var(--dim)] hover:text-[var(--text)]"
            >
              {t("hero.viewAll")}
            </Link>
          </div>
        </section>

        <section id="about" className="border-t border-[var(--line)] bg-[var(--panel)] px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display max-w-2xl text-3xl font-bold leading-tight">
              {t("about.title")}
            </h2>
            <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-[var(--dim)]">
              <p>{t("about.paragraph1")}</p>
              <p>{t("about.paragraph2")}</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <h3 className="font-display text-base font-bold text-[var(--accent)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--dim)]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-bold">{t("pricing.title")}</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    plan.featured
                      ? "border-[var(--accent)] bg-[var(--surface)]"
                      : "border-[var(--line)] bg-[var(--panel)]"
                  }`}
                >
                  <p className="text-xs font-medium text-[var(--faint)]">{plan.tag}</p>
                  <h3 className="font-display mt-1 text-xl font-bold">{plan.name}</h3>
                  <p className="mt-4 text-3xl font-bold">
                    {format.number(plan.price, {
                      style: "currency",
                      currency: "JPY",
                      maximumFractionDigits: 0,
                    })}
                    <span className="text-sm font-normal text-[var(--dim)]">{t("pricing.perMonth")}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm text-[var(--dim)]">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                      plan.featured
                        ? "bg-[var(--accent)] text-[var(--ink)] hover:opacity-90"
                        : "border border-[var(--line-md)] text-[var(--text)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-[var(--faint)]">
              {t("pricing.student", {
                price: format.number(250, {
                  style: "currency",
                  currency: "JPY",
                  maximumFractionDigits: 0,
                }),
              })}
            </p>
          </div>
        </section>

        <section id="artists" className="border-t border-[var(--line)] bg-[var(--panel)] px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight">{t("artists.title")}</h2>
              <p className="mt-6 text-sm leading-7 text-[var(--dim)]">{t("artists.description")}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
                >
                  {t("artists.register")}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[var(--line-md)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
                >
                  {t("artists.distribution")}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {artistTiles.map((artist) => (
                <div key={artist.name} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <span
                    className="block h-16 w-16 rounded-lg"
                    style={{ backgroundColor: artist.color }}
                  />
                  <p className="mt-3 text-sm font-medium">{artist.name}</p>
                  <p className="text-xs text-[var(--dim)]">{artist.genre}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-sm font-bold">RESON</span>
          <nav className="flex gap-6 text-xs text-[var(--dim)]">
            <a href="#about" className="hover:text-[var(--text)]">{t("nav.about")}</a>
            <a href="#pricing" className="hover:text-[var(--text)]">{t("nav.pricing")}</a>
            <a href="#artists" className="hover:text-[var(--text)]">{t("nav.artists")}</a>
            <Link href="/privacy" className="hover:text-[var(--text)]">{t("footer.privacy")}</Link>
          </nav>
          <p className="text-xs text-[var(--faint)]">© {new Date().getFullYear()} RESON</p>
        </div>
      </footer>
    </div>
  );
}
