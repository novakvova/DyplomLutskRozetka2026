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
  return (
    <Link to={to} className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-white/15' : 'bg-brand-700 text-white'}`}>
        <CartGlyph className="h-5 w-5" />
      </span>
      Hopely
    </Link>
  )
}
