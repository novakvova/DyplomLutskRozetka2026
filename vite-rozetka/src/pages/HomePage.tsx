import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { CartGlyph } from '../components/Logo'
import { ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Category, Favorite, Product } from '../types'

function Stars({ value }: { value: number | null }) {
  const filled = value === null ? 0 : Math.round(value)
  return (
    <span className="text-sm tracking-tight text-amber-400" aria-hidden>
      {'★★★★★'.slice(0, filled)}
      <span className="text-stone-300">{'★★★★★'.slice(filled)}</span>
    </span>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api<Product[]>('/api/products'),
      api<Category[]>('/api/categories'),
    ])
      .then(([nextProducts, nextCategories]) => {
        setProducts(nextProducts)
        setCategories(nextCategories)
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити вітрину.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) {
      setFavoriteIds([])
      return
    }
    api<Favorite[]>('/api/favorites')
      .then((items) => setFavoriteIds(items.map((item) => item.productId)))
      .catch(() => setFavoriteIds([]))
  }, [user])

  async function addToCart(product: Product) {
    if (!user) {
      navigate('/login', { state: { from: '/' } })
      return
    }
    setPendingId(product.id)
    try {
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ productId: product.id }) })
      navigate('/cart')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося додати товар.')
    } finally {
      setPendingId(null)
    }
  }

  async function toggleFavorite(product: Product) {
    if (!user) {
      navigate('/login', { state: { from: '/' } })
      return
    }
    try {
      if (favoriteIds.includes(product.id)) {
        await api(`/api/favorites/${product.id}`, { method: 'DELETE' })
        setFavoriteIds((ids) => ids.filter((id) => id !== product.id))
      } else {
        await api('/api/favorites', { method: 'POST', body: JSON.stringify({ productId: product.id }) })
        setFavoriteIds((ids) => [...ids, product.id])
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося оновити обране.')
    }
  }

  return (
    <section>
      <div className="rounded-2xl bg-[#F8E6DC] px-5 py-4 text-sm sm:flex sm:items-center sm:justify-between">
        <p className="font-medium">Чорна п’ятниця: знижки до −50%</p>
        <Link to="/catalog" className="mt-2 inline-flex text-sm font-semibold text-brand-700 sm:mt-0">Переглянути пропозиції</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link key={category.id} to={`/catalog?category=${category.id}`} className="rounded-full bg-white px-4 py-2 text-sm shadow-sm hover:text-brand-700">
            {category.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Популярні товари</h1>
        <Link to="/catalog" className="text-sm font-medium text-brand-700">Весь каталог</Link>
      </div>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" aria-label="Завантаження" />
        </div>
      ) : null}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm">
            <div className="relative">
              <Link to={`/products/${product.id}`} className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-cream">
                {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-4" /> : null}
              </Link>
              <button
                type="button"
                aria-label={favoriteIds.includes(product.id) ? 'Прибрати з обраного' : 'В обране'}
                className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm ${favoriteIds.includes(product.id) ? 'text-brand-700' : 'text-stone-400'}`}
                onClick={() => void toggleFavorite(product)}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill={favoriteIds.includes(product.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
              <Stars value={product.averageRating} />
              <span>{product.reviewCount} відгуків</span>
            </div>
            <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">
              <Link to={`/products/${product.id}`} className="hover:text-brand-700">{product.name}</Link>
            </h2>
            <p className={`mt-1 text-xs font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
              {product.stock > 0 ? 'Є в наявності' : 'Немає в наявності'}
            </p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <p className="text-lg font-bold text-brand-700">{formatMoney(product.price)}</p>
              <button
                type="button"
                aria-label="Додати в кошик"
                disabled={product.stock === 0 || pendingId === product.id}
                className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-40"
                onClick={() => void addToCart(product)}
              >
                <CartGlyph className="h-5 w-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link key={category.id} to={`/catalog?category=${category.id}`} className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-6 text-center text-sm font-medium shadow-sm hover:text-brand-700">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-cream text-brand-700">
              <CartGlyph />
            </span>
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
