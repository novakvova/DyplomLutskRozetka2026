import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import { compareIds, toggleCompare } from '../lib/browse'
import type { Category, Product } from '../types'

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
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [compared, setCompared] = useState<number[]>(() => compareIds())

  function load(search: string, nextSort: string, nextCategory: string, min: string, max: string) {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (search.trim())
      params.set('query', search.trim())
    if (nextSort !== 'new')
      params.set('sort', nextSort)
    if (nextCategory)
      params.set('categoryId', nextCategory)
    if (min.trim())
      params.set('minPrice', min.trim())
    if (max.trim())
      params.set('maxPrice', max.trim())
    const suffix = params.toString()
    api<Product[]>(`/api/products${suffix ? `?${suffix}` : ''}`)
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    load(appliedQuery, sort, categoryId, minPrice, maxPrice)
  }, [appliedQuery, sort, categoryId, minPrice, maxPrice])

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
            value={categoryId}
            aria-label="Категорія"
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Усі категорії</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input
            className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder="Ціна від"
            aria-label="Ціна від"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
          <input
            className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder="Ціна до"
            aria-label="Ціна до"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
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
        <p className="mt-4 text-stone-600">{appliedQuery.trim() || categoryId || minPrice || maxPrice ? 'Нічого не знайдено.' : 'Каталог порожній.'}</p>
      ) : null}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className="flex flex-col rounded-xl border border-stone-200 bg-white p-4">
            <Link to={`/products/${product.id}`} className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-lg bg-stone-100">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-3xl font-semibold text-brand-800">{product.name.slice(0, 1)}</span>
              )}
            </Link>
            <p className="text-xs text-stone-500">{product.categoryName}</p>
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
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
                onClick={() => setCompared(toggleCompare(product.id))}
              >
                {compared.includes(product.id) ? 'У порівнянні' : 'Порівняти'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
