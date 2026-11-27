import { Logo } from './Logo'

export function Splash() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#fffdf9]">
      <div className="flex w-[min(420px,88vw)] flex-col items-center">
        <Logo />
        <div className="ornament-brand mt-8 w-full" />
        <span className="mt-8 h-8 w-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" aria-label="Завантаження" />
      </div>
    </div>
  )
}
