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
    <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(36,37,31,0.18)] md:min-h-[520px] md:grid-cols-[0.92fr_1.08fr]">
      <div className="relative flex flex-col overflow-hidden bg-brand-700 p-8 text-[#fffdf9]">
        <Logo light />
        <div className="relative z-10 mt-10">
          <h2 className="text-[32px] font-bold leading-10">Вітаємо<br />в Hopely!</h2>
          <p className="mt-4 max-w-[240px] text-sm leading-6 text-[#fffdf9]/95">
            Зберігайте улюблені товари та відстежуйте свої замовлення.
          </p>
          <div className="ornament-light mt-6 w-full" />
        </div>
        <Link
          to={alternateTo}
          className="relative z-10 mb-16 mt-auto inline-flex w-fit rounded-lg border border-white/80 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          {alternateLabel}
        </Link>
        <svg className="pointer-events-none absolute bottom-0 left-0 h-24 w-full" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden>
          <path d="M0 42C40 18 70 18 110 42C150 66 190 70 230 46C270 22 320 18 360 40C380 50 392 58 400 62V90H0Z" fill="#c44718" />
          <path d="M0 62C48 40 90 44 140 64C190 84 240 78 290 58C330 42 360 46 400 60V90H0Z" fill="#9a3612" />
        </svg>
      </div>
      <div className="relative p-6 sm:p-8">
        <Link to={closeTo} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-2xl leading-none text-muted hover:bg-cream" aria-label="Закрити">
          ×
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )

  if (!overlay)
    return card

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/45 p-4">
      {card}
    </div>
  )
}
