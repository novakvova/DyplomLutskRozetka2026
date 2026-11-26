import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ProductCard } from '../components/ProductCard'
import { ErrorText } from '../components/Field'
import type { Category, Favorite, Product } from '../types'

const pageSize = 8

type Filters = {
  brands: string[]
  cpus: string[]
  rams: string[]
  screens: string[]
  inStock: boolean
  min: number | null
  max: number | null
  oled: boolean
}

const emptyFilters: Filters = { brands: [], cpus: [], rams: [], screens: [], inStock: false, min: null, max: null, oled: false }

function spec(product: Product, includes: string) {
  return product.characteristics?.find((item) => item.name.toLowerCase().includes(includes))?.value ?? ''
}

function brandOf(product: Product) {
  const named = spec(product, 'бренд')
  if (named)
    return named
  return ['ASUS', 'Lenovo', 'Acer', 'HP', 'Dell', 'Apple', 'Samsung'].find((brand) => product.name.includes(brand)) ?? ''
}

function screenOf(value: string) {
  const size = Number.parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(size))
    return ''
  if (size < 15)
    return '13–14"'
  if (size < 16)
    return '15–15,6"'
  if (size < 17)
    return '16"'
  return '17" і більше'
}

function counts(values: string[]) {
  const map = new Map<string, number>()
  for (const value of values) {
    if (value)
      map.set(value, (map.get(value) ?? 0) + 1)
  }
  return [...map.entries()]
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const categoryId = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'new'
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loved, setLoved] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<Filters>(emptyFilters)
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [visible, setVisible] = useState(pageSize)
  const [page, setPage] = useState(1)

  useEffect(() => {
    api<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]))
    api<Favorite[]>('/api/favorites').then((items) => setLoved(items.map((item) => item.productId))).catch(() => setLoved([]))
  }, [])

  useEffect(() => {
    const search = new URLSearchParams()
    if (query.trim())
      search.set('query', query.trim())
    if (categoryId)
      search.set('categoryId', categoryId)
    setLoading(true)
    setError('')
    setVisible(pageSize)
    setPage(1)
    api<Product[]>(`/api/products${search.size ? `?${search}` : ''}`)
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }, [query, categoryId])

  const pool = products
  const brands = counts(pool.map(brandOf))
  const cpus = counts(pool.map((product) => spec(product, 'процесор')))
  const rams = counts(pool.map((product) => spec(product, 'пам')))
  const screens = counts(pool.map((product) => screenOf(spec(product, 'екран'))))
  const prices = pool.map((product) => product.price)
  const floor = prices.length ? Math.floor(Math.min(...prices)) : 0
  const ceil = prices.length ? Math.ceil(Math.max(...prices)) : 0

  const shown = useMemo(() => {
    const next = pool.filter((product) => {
      const brand = brandOf(product)
      const cpu = spec(product, 'процесор')
      const ram = spec(product, 'пам')
      const screen = screenOf(spec(product, 'екран'))
      if (applied.brands.length && !applied.brands.includes(brand))
        return false
      if (applied.cpus.length && !applied.cpus.includes(cpu))
        return false
      if (applied.rams.length && !applied.rams.includes(ram))
        return false
      if (applied.screens.length && !applied.screens.includes(screen))
        return false
      if (applied.inStock && product.stock <= 0)
        return false
      if (applied.min !== null && product.price < applied.min)
        return false
      if (applied.max !== null && product.price > applied.max)
        return false
      if (applied.oled && !`${product.name} ${spec(product, 'екран')}`.toLowerCase().includes('oled'))
        return false
      return true
    })
    const sorted = [...next]
    if (sort === 'price_asc')
      sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc')
      sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'name')
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    return sorted
  }, [pool, applied, sort])

  const pages = Math.max(1, Math.ceil(shown.length / pageSize))
  const slice = shown.slice((page - 1) * pageSize, page * pageSize).slice(0, visible)
  const category = categories.find((item) => String(item.id) === categoryId)
  const chips = [
    ...applied.brands,
    ...applied.cpus,
    ...applied.rams,
    ...applied.screens,
    applied.oled ? 'З OLED-екраном' : '',
    applied.max === 25000 ? 'До 25 000 ₴' : '',
  ].filter(Boolean)

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  function setSort(value: string) {
    const search = new URLSearchParams(params)
    if (value === 'new')
      search.delete('sort')
    else
      search.set('sort', value)
    setParams(search)
  }

  return (
    <section>
      <p className="text-sm text-muted">
        <Link to="/" className="hover:text-brand-700">Головна</Link>
        {category ? <span> · {category.name}</span> : null}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{query ? `Пошук: ${query}` : category?.name ?? 'Каталог'}</h1>
          <p className="text-sm text-muted">{loading ? 'Шукаємо товари' : `${shown.length} товарів`}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {brands.map(([name]) => (
          <button key={name} type="button" className="rounded-full border border-line bg-white px-3 py-1 text-sm" onClick={() => setApplied({ ...applied, brands: toggle(applied.brands, name) })}>{name}</button>
        ))}
        <button type="button" className="rounded-full border border-line bg-white px-3 py-1 text-sm" onClick={() => setApplied({ ...applied, oled: !applied.oled })}>З OLED-екраном</button>
        <button type="button" className="rounded-full border border-line bg-white px-3 py-1 text-sm" onClick={() => setApplied({ ...applied, max: applied.max === 25000 ? null : 25000 })}>До 25 000 ₴</button>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <form
          className="rounded-2xl bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.06)]"
          onSubmit={(event) => {
            event.preventDefault()
            setApplied(draft)
            setPage(1)
            setVisible(pageSize)
          }}
        >
          <h2 className="font-semibold">Фільтри</h2>
          <p className="mt-4 text-sm font-medium">Ціна, ₴</p>
          <div className="mt-2 flex gap-2">
            <input className="w-full rounded-lg border border-line px-2 py-1 text-sm" inputMode="numeric" value={draft.min ?? floor} onChange={(event) => setDraft({ ...draft, min: Number(event.target.value) })} />
            <input className="w-full rounded-lg border border-line px-2 py-1 text-sm" inputMode="numeric" value={draft.max ?? ceil} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} />
          </div>
          <input className="mt-3 w-full accent-brand-700" type="range" min={floor} max={ceil || 1} value={draft.max ?? ceil} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} />
          <FilterGroup title="Бренд" options={brands} selected={draft.brands} onToggle={(value) => setDraft({ ...draft, brands: toggle(draft.brands, value) })} />
          <FilterGroup title="Діагональ екрана" options={screens} selected={draft.screens} onToggle={(value) => setDraft({ ...draft, screens: toggle(draft.screens, value) })} />
          <FilterGroup title="Процесор" options={cpus} selected={draft.cpus} onToggle={(value) => setDraft({ ...draft, cpus: toggle(draft.cpus, value) })} />
          <FilterGroup title="Оперативна пам’ять" options={rams} selected={draft.rams} onToggle={(value) => setDraft({ ...draft, rams: toggle(draft.rams, value) })} />
          <label className="mt-4 flex items-center justify-between text-sm">
            Тільки в наявності
            <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={draft.inStock} onChange={(event) => setDraft({ ...draft, inStock: event.target.checked })} />
          </label>
          <button type="submit" className="mt-4 w-full rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white">Застосувати</button>
          <button
            type="button"
            className="mt-2 w-full rounded-lg bg-brand-50 py-2.5 text-sm font-semibold text-brand-700"
            onClick={() => {
              setDraft(emptyFilters)
              setApplied(emptyFilters)
            }}
          >
            Скинути фільтри
          </button>
        </form>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button key={chip} type="button" className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800" onClick={() => setApplied({
                  ...applied,
                  brands: applied.brands.filter((item) => item !== chip),
                  cpus: applied.cpus.filter((item) => item !== chip),
                  rams: applied.rams.filter((item) => item !== chip),
                  screens: applied.screens.filter((item) => item !== chip),
                  oled: chip === 'З OLED-екраном' ? false : applied.oled,
                  max: chip === 'До 25 000 ₴' ? null : applied.max,
                })}>
                  {chip} ×
                </button>
              ))}
              {chips.length > 0 ? <button type="button" className="text-sm text-brand-700" onClick={() => setApplied(emptyFilters)}>Скинути все</button> : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              Сортування
              <select className="rounded-lg border border-line bg-white px-2 py-1 text-ink" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="new">Спочатку нові</option>
                <option value="price_asc">Від дешевих до дорогих</option>
                <option value="price_desc">Від дорогих до дешевих</option>
                <option value="name">За назвою</option>
              </select>
            </label>
          </div>
          {loading ? <p className="text-muted">Завантажуємо товари…</p> : null}
          {!loading && shown.length === 0 ? <p className="rounded-2xl bg-white p-6 text-muted">Нічого не знайдено. Скиньте фільтри або змініть запит.</p> : null}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {slice.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  loved={loved.includes(product.id)}
                  onLoved={(next) => setLoved((ids) => next ? [...ids, product.id] : ids.filter((id) => id !== product.id))}
                />
              </li>
            ))}
          </ul>
          {visible < pageSize && slice.length > visible ? null : null}
          {shown.length > page * pageSize || visible < Math.min(pageSize, shown.length - (page - 1) * pageSize) ? (
            <button type="button" className="mt-6 w-full rounded-xl border border-brand-700 py-3 text-sm font-semibold text-brand-700" onClick={() => setVisible((count) => count + 4)}>
              Показати ще
            </button>
          ) : null}
          {pages > 1 ? (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" className={`h-9 w-9 rounded-lg text-sm ${number === page ? 'bg-brand-700 text-white' : 'bg-white'}`} onClick={() => { setPage(number); setVisible(pageSize) }}>{number}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function FilterGroup({ title, options, selected, onToggle }: { title: string, options: [string, number][], selected: string[], onToggle: (value: string) => void }) {
  if (options.length === 0)
    return null
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-medium">{title}</legend>
      <ul className="mt-2 space-y-1">
        {options.map(([name, count]) => (
          <li key={name}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-brand-700" checked={selected.includes(name)} onChange={() => onToggle(name)} />
              <span className="flex-1">{name}</span>
              <span className="text-muted">{count}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
