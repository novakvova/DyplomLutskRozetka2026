import { Link } from 'react-router-dom'

export function CartGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Logo({ light = false, to = '/' }: { light?: boolean, to?: string }) {
  const tone = light ? 'brightness-0 invert' : ''
  return (
    <Link to={to} className="inline-flex items-center gap-2" aria-label="Hopely">
      <img src="/hopely/logo-mark.svg" alt="" className={`h-8 w-auto ${tone}`} />
      <img src="/hopely/logo-word.svg" alt="" className={`h-6 w-auto ${tone}`} />
    </Link>
  )
}
