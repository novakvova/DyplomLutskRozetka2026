import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ProductCard } from '../components/ProductCard'
import { ErrorText } from '../components/Field'
import { compareIds, toggleCompare } from '../lib/browse'
import type { Category, Product } from '../types'

const pageSize = 8

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'new'
  const minPrice = params.get('min') ?? ''
  const maxPrice = params.get('max') ?? ''
  const inStock = params.get('stock') === '1'

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [compared, setCompared] = useState<number[]>(() => compareIds())
  const [visible, setVisible] = useState(pageSize)
  const [draft, setDraft] = useState({ category: categoryId, min: minPrice, max: maxPrice, stock: inStock })

  useEffect(() => {
    setDraft({ category: categoryId, min: minPrice, max: maxPrice, stock: inStock })
    setVisible(pageSize)
  }, [categoryId, minPrice, maxPrice, inStock, query, sort])

  useEffect(() => {
    api<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const search = new URLSearchParams()
    if (query.trim())
      search.set('query', query.trim())
    if (sort !== 'new')
      search.set('sort', sort)
    if (categoryId)
      search.set('categoryId', categoryId)
    if (minPrice.trim())
      search.set('minPrice', minPrice.trim())
    if (maxPrice.trim())
      search.set('maxPrice', maxPrice.trim())
    const suffix = search.toString()
    setLoading(true)
    setError('')
    api<Product[]>(`/api/products${suffix ? `?${suffix}` : ''}`)
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }, [query, sort, categoryId, minPrice, maxPrice])

  const shown = useMemo(
    () => products.filter((product) => !inStock || product.stock > 0),
    [products, inStock],
  )
  const page = shown.slice(0, visible)
  const activeCategory = categories.find((category) => String(category.id) === categoryId)

  function writeParams(next: { category?: string, min?: string, max?: string, stock?: boolean, sort?: string }) {
    const search = new URLSearchParams(params)
    const category = next.category ?? categoryId
    const min = next.min ?? minPrice
    const max = next.max ?? maxPrice
    const stock = next.stock ?? inStock
    const nextSort = next.sort ?? sort
    if (category)
      search.set('category', category)
    else
      search.delete('category')
    if (min.trim())
      search.set('min', min.trim())
    else
      search.delete('min')
    if (max.trim())
      search.set('max', max.trim())
    else
      search.delete('max')
    if (stock)
      search.set('stock', '1')
    else
      search.delete('stock')
    if (nextSort !== 'new')
      search.set('sort', nextSort)
    else
      search.delete('sort')
    setParams(search)
  }

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{query ? `Пошук: ${query}` : activeCategory?.name ?? 'Каталог'}</h1>
        <p className="mt-1 text-sm text-stone-500">{loading ? 'Шукаємо товари' : `${shown.length} товарів`}</p>
      </div>

      <div id="catalog" className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Фільтри</p>
          <fieldset className="mt-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-stone-500">Категорія</legend>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="radio" name="category" checked={draft.category === ''} onChange={() => setDraft({ ...draft, category: '' })} />
              Усі категорії
            </label>
            {categories.map((category) => (
              <label key={category.id} className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="category"
                  checked={draft.category === String(category.id)}
                  onChange={() => setDraft({ ...draft, category: String(category.id) })}
                />
                {category.name}
              </label>
            ))}
          </fieldset>
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Ціна</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm"
                inputMode="decimal"
                placeholder="0 грн"
                aria-label="Ціна від"
                value={draft.min}
                onChange={(event) => setDraft({ ...draft, min: event.target.value })}
              />
              <input
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm"
                inputMode="decimal"
                placeholder="140 000"
                aria-label="Ціна до"
                value={draft.max}
                onChange={(event) => setDraft({ ...draft, max: event.target.value })}
              />
            </div>
          </div>
          <label className="mt-5 flex items-center justify-between gap-3 text-sm">
            Тільки в наявності
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-700"
              checked={draft.stock}
              onChange={(event) => setDraft({ ...draft, stock: event.target.checked })}
            />
          </label>
          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            onClick={() => writeParams({ category: draft.category, min: draft.min, max: draft.max, stock: draft.stock })}
          >
            Застосувати
          </button>
          <button
            type="button"
            className="mt-2 w-full py-2 text-sm text-stone-500 hover:text-brand-700"
            onClick={() => {
              setDraft({ category: '', min: '', max: '', stock: false })
              writeParams({ category: '', min: '', max: '', stock: false, sort: 'new' })
            }}
          >
            Скинути фільтри
          </button>
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">{loading ? 'Завантаження…' : `Показано ${page.length} з ${shown.length}`}</p>
            <label className="text-sm text-stone-600">
              Сортування
              <select
                className="ml-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
                aria-label="Сортування"
                value={sort}
                onChange={(event) => writeParams({ sort: event.target.value })}
              >
                <option value="new">Спочатку нові</option>
                <option value="name">За назвою</option>
                <option value="price_asc">Спочатку дешевші</option>
                <option value="price_desc">Спочатку дорожчі</option>
              </select>
            </label>
          </div>
          <ErrorText>{error}</ErrorText>
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" aria-label="Завантаження" />
            </div>
          ) : null}
          {!loading && page.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-stone-600">
              {query || categoryId || minPrice || maxPrice || inStock ? 'Нічого не знайдено. Скиньте фільтри або змініть запит.' : 'Каталог порожній.'}
            </p>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {page.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
                <button
                  type="button"
                  className="mt-2 text-left text-xs text-muted hover:text-brand-700"
                  onClick={() => setCompared(toggleCompare(product.id))}
                >
                  {compared.includes(product.id) ? 'У порівнянні' : 'Порівняти'}
                </button>
              </li>
            ))}
          </ul>
          {!loading && visible < shown.length ? (
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-brand-700 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              onClick={() => setVisible((count) => count + pageSize)}
            >
              Показати ще {Math.min(pageSize, shown.length - visible)} товарів
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
