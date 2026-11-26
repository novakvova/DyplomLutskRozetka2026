import { Link } from 'react-router-dom'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export function ProductCard({ product }: { product: Product }) {
  const discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null
  return (
    <article className="relative flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.08)]">
      <Link to={`/products/${product.id}`} className="relative block h-[180px] overflow-hidden rounded-lg bg-cream">
        {discount && (
          <span className="absolute left-2 top-2 rounded bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">−{discount}%</span>
        )}
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-6" />
        ) : (
          <img src="/hopely/laptop.svg" alt="" className="h-full w-full object-contain p-8" />
        )}
      </Link>
      <div className="flex items-center gap-1 text-xs text-muted">
        <img src="/hopely/icon-star.svg" alt="" className="h-3.5 w-3.5" />
        <span>{product.averageRating?.toFixed(1) ?? '—'}</span>
        <span>{product.reviewCount} відгуків</span>
      </div>
      <Link to={`/products/${product.id}`} className="line-clamp-2 min-h-10 text-sm leading-5 text-ink hover:text-brand-700">
        {product.name}
      </Link>
      <p className="text-sm text-ok">{product.stock > 0 ? 'Є в наявності' : 'Немає в наявності'}</p>
      <div className="mt-auto">
        {product.oldPrice && <p className="text-sm text-muted line-through">{formatMoney(product.oldPrice)}</p>}
        <p className="text-xl font-bold text-brand-700">{formatMoney(product.price)}</p>
      </div>
    </article>
  )
}
