import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

const operator = process.env.PRIVACY_OPERATOR_NAME
const address = process.env.PRIVACY_OPERATOR_ADDRESS
const contact = process.env.PRIVACY_CONTACT_EMAIL
const retention = process.env.PRIVACY_RETENTION_POLICY
const transfer = process.env.PRIVACY_TRANSFER_NOTICE
const representative = process.env.PRIVACY_EU_REPRESENTATIVE

type PrivacyPageProps = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' })
  return { title: t('metadataTitle') }
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' })
  const required = (value: string | undefined) => value ?? t('missing')

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">← RESON</Link>
        <header>
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{t('description')}</p>
        </header>

        <section className="space-y-2 border-t border-zinc-800 pt-6 text-sm leading-6">
          <h2 className="text-lg font-medium">{t('operator.title')}</h2>
          <p className={operator ? '' : 'text-amber-300'}>{t('operator.name', { value: required(operator) })}</p>
          <p className={address ? '' : 'text-amber-300'}>{t('operator.address', { value: required(address) })}</p>
          <p className={contact ? '' : 'text-amber-300'}>{t('operator.contact', { value: required(contact) })}</p>
          {representative && <p>{t('operator.representative', { value: representative })}</p>}
        </section>

        <section className="space-y-3 border-t border-zinc-800 pt-6 text-sm leading-6">
          <h2 className="text-lg font-medium">{t('data.title')}</h2>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>{t('data.email')}</li>
            <li>{t('data.listening')}</li>
            <li>{t('data.social')}</li>
            <li>{t('data.payments')}</li>
            <li>{t('data.minors')}</li>
          </ul>
          <p className="text-zinc-400">{t('data.basis')}</p>
        </section>

        <section className="space-y-3 border-t border-zinc-800 pt-6 text-sm leading-6">
          <h2 className="text-lg font-medium">{t('services.title')}</h2>
          <p className="text-zinc-300">{t('services.providers')}</p>
          <p className={retention ? '' : 'text-amber-300'}>{t('services.retention', { value: required(retention) })}</p>
          <p className={transfer ? '' : 'text-amber-300'}>{t('services.transfer', { value: required(transfer) })}</p>
          <p className="text-zinc-400">{t('services.browser')}</p>
        </section>

        <section className="space-y-3 border-t border-zinc-800 pt-6 text-sm leading-6">
          <h2 className="text-lg font-medium">{t('rights.title')}</h2>
          <p className="text-zinc-300">
            {t.rich('rights.options', {
              settings: (chunks) => <Link href="/settings" className="underline">{chunks}</Link>,
              requests: (chunks) => <Link href="/privacy-requests" className="underline">{chunks}</Link>,
            })}
          </p>
          <p className="text-zinc-300">{t('rights.response')}</p>
        </section>
      </div>
    </main>
  )
}
