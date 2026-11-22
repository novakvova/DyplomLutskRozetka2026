import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export function CatalogPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('new')
  const [appliedQuery, setAppliedQuery] = useState('')

  function load(search: string, nextSort: string) {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (search.trim())
      params.set('query', search.trim())
    if (nextSort !== 'new')
      params.set('sort', nextSort)
    const suffix = params.toString()
    api<Product[]>(`/api/products${suffix ? `?${suffix}` : ''}`)
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(appliedQuery, sort)
  }, [appliedQuery, sort])

  async function addToCart(product: Product) {
    if (!user) {
      navigate('/login', { state: { from: '/' } })
      return
    }
    setPendingId(product.id)
    setError('')
    try {
      await api('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id }),
      })
      navigate('/cart')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося додати товар.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Товари</h1>
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query) }}>
          <input
            className="w-56 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            placeholder="Назва або опис"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Пошук товарів"
          />
          <Button type="submit">Знайти</Button>
          <select
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            value={sort}
            aria-label="Сортування"
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="new">Спочатку додані</option>
            <option value="name">За назвою</option>
            <option value="price_asc">Спочатку дешевші</option>
            <option value="price_desc">Спочатку дорожчі</option>
          </select>
        </form>
      </div>
      <ErrorText>{error}</ErrorText>
      {loading ? <p className="mt-4 text-stone-600">Завантаження…</p> : null}
      {!loading && products.length === 0 ? (
        <p className="mt-4 text-stone-600">{appliedQuery.trim() ? 'Нічого не знайдено.' : 'Каталог порожній.'}</p>
      ) : null}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className="flex flex-col rounded-xl border border-stone-200 bg-white p-4">
            <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-brand-50 text-3xl font-semibold text-brand-800">
              {product.name.slice(0, 1)}
            </div>
            <h2 className="font-medium">
              <Link to={`/products/${product.id}`} className="hover:text-brand-800">{product.name}</Link>
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-stone-600">{product.shortDescription}</p>
            <p className="mt-3 text-lg font-semibold">{formatMoney(product.price)}</p>
            <p className="text-sm text-stone-500">{product.stock > 0 ? `В наявності: ${product.stock}` : 'Немає в наявності'}</p>
            {product.reviewCount > 0 && product.averageRating !== null ? (
              <p className="text-sm text-stone-500">{product.averageRating.toFixed(1)} · {product.reviewCount} відгуків</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button type="button" disabled={product.stock === 0 || pendingId === product.id} onClick={() => void addToCart(product)}>
                У кошик
              </Button>
              <Link to={`/products/${product.id}`} className="rounded-lg px-3 py-2 text-sm text-brand-800 hover:bg-brand-50">
                Детальніше
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
