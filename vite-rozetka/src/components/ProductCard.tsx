import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

function Stars({ value }: { value: number | null }) {
  const score = value === null ? 0 : Math.round(value)
  return (
    <span className="inline-flex" aria-hidden>
      {[1, 2, 3, 4, 5].map((step) => (
        <img key={step} src="/hopely/icon-star.svg" alt="" className={`h-3.5 w-3.5 ${step <= score ? '' : 'opacity-25'}`} />
      ))}
    </span>
  )
}

export function ProductCard({ product, loved = false, onLoved }: { product: Product, loved?: boolean, onLoved?: (loved: boolean) => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null

  function askLogin() {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
  }

  async function addToCart() {
    if (!user) {
      askLogin()
      return
    }
    setPending(true)
    try {
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ productId: product.id }) })
      navigate('/cart')
    } finally {
      setPending(false)
    }
  }

  async function toggleFavorite() {
    if (!user) {
      askLogin()
      return
    }
    if (loved)
      await api(`/api/favorites/${product.id}`, { method: 'DELETE' })
    else
      await api('/api/favorites', { method: 'POST', body: JSON.stringify({ productId: product.id }) })
    onLoved?.(!loved)
  }

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-line bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.08)]">
      <Link to={`/products/${product.id}`} className="relative block h-[180px] overflow-hidden rounded-lg bg-cream">
        {discount ? <span className="absolute left-2 top-2 rounded bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">−{discount}%</span> : null}
        <img src={product.imageUrl || '/hopely/laptop.svg'} alt="" className="h-full w-full object-contain p-4" />
      </Link>
      <button type="button" className="absolute right-6 top-6 grid h-8 w-8 place-items-center rounded-full bg-white/90" aria-label={loved ? 'Прибрати з обраного' : 'В обране'} onClick={() => void toggleFavorite()}>
        <img src="/hopely/icon-heart.svg" alt="" className={`h-4 w-4 ${loved ? '' : 'opacity-60'}`} />
      </button>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted">
        <Stars value={product.averageRating} />
        <span>{product.reviewCount} відгуків</span>
      </div>
      <Link to={`/products/${product.id}`} className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-ink hover:text-brand-700">
        {product.name}
      </Link>
      <p className="mt-1 text-sm text-ok">{product.stock > 0 ? 'Є в наявності' : 'Немає в наявності'}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div>
          {product.oldPrice ? <p className="text-sm text-muted line-through">{formatMoney(product.oldPrice)}</p> : null}
          <p className="text-xl font-bold leading-7 text-brand-700">{formatMoney(product.price)}</p>
        </div>
        <button type="button" aria-label="Додати в кошик" disabled={product.stock === 0 || pending} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-700 disabled:opacity-40" onClick={() => void addToCart()}>
          <img src="/hopely/icon-cart.svg" alt="" className="h-5 w-5 brightness-0 invert" />
        </button>
      </div>
    </article>
  )
}
