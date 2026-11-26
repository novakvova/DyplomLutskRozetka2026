import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function AuthPanel({
  title,
  children,
  alternateTo,
  alternateLabel,
}: {
  title: string
  children: ReactNode
  alternateTo: string
  alternateLabel: string
}) {
  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(26,26,26,0.12)] md:min-h-[460px] md:grid-cols-[0.92fr_1.08fr]">
      <div className="flex flex-col bg-brand-700 p-7 text-white sm:p-8">
        <Logo light />
        <div className="my-8">
          <h2 className="text-3xl font-semibold leading-tight">Вітаємо<br />в Hopely!</h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/90">
            Раді бачити вас! Увійдіть у свій обліковий запис, щоб продовжити покупки.
          </p>
        </div>
        <Link
          to={alternateTo}
          className="mt-auto inline-flex w-fit rounded-lg border border-white/70 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          {alternateLabel}
        </Link>
      </div>
      <div className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )
}
