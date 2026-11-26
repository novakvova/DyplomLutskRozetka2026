import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function AuthPanel({
  title,
  children,
  alternateTo,
  alternateLabel,
  closeTo = '/',
  overlay = false,
}: {
  title: string
  children: ReactNode
  alternateTo: string
  alternateLabel: string
  closeTo?: string
  overlay?: boolean
}) {
  const card = (
    <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(26,26,26,0.12)] md:min-h-[460px] md:grid-cols-[0.92fr_1.08fr]">
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
      <div className="relative p-6 sm:p-8">
        <Link to={closeTo} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Закрити">
          ×
        </Link>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )

  if (!overlay)
    return card

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/40 p-4">
      {card}
    </div>
  )
}
