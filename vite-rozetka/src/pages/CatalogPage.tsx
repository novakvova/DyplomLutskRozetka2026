import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ProductCard } from '../components/ProductCard'
import { ErrorText } from '../components/Field'
import type { Category, Favorite, Product } from '../types'

const pageSize = 8

type Facet = 'game' | 'ultra' | 'study' | 'mac' | 'oled' | 'cheap' | null

type Filters = {
  brands: string[]
  cpus: string[]
  rams: string[]
  screens: string[]
  inStock: boolean
  min: number | null
  max: number | null
  facet: Facet
}

const emptyFilters: Filters = { brands: [], cpus: [], rams: [], screens: [], inStock: false, min: null, max: null, facet: null }

const facets: { id: Facet, label: string }[] = [
  { id: 'game', label: 'Ігрові' },
  { id: 'ultra', label: 'Ультрабуки' },
  { id: 'study', label: 'Для навчання' },
  { id: 'mac', label: 'Apple MacBook' },
  { id: 'oled', label: 'З OLED-екраном' },
  { id: 'cheap', label: 'До 25 000 ₴' },
]

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
  const [view, setView] = useState<'grid' | 'list'>('grid')

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
      const haystack = `${product.name} ${product.shortDescription} ${spec(product, 'екран')}`.toLowerCase()
      if (applied.facet === 'game' && !/tuf|legion|nitro|playstation|консол/.test(haystack))
        return false
      if (applied.facet === 'ultra' && !/zenbook|macbook air|slim/.test(haystack))
        return false
      if (applied.facet === 'study' && !/studybook|aspire|ideapad|навчан/.test(haystack))
        return false
      if (applied.facet === 'mac' && !haystack.includes('macbook'))
        return false
      if (applied.facet === 'oled' && !haystack.includes('oled'))
        return false
      if (applied.facet === 'cheap' && product.price > 25000)
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
    applied.facet ? facets.find((item) => item.id === applied.facet)?.label ?? '' : '',
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

  const countLabel = new Intl.NumberFormat('uk-UA').format(shown.length)
  const more = Math.max(0, shown.length - slice.length)

  if (loading)
    return <CatalogSkeleton title={category?.name} />

  return (
    <section>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Link to="/" className="hover:text-brand-700" aria-label="Головна">⌂</Link>
        <span>›</span>
        {category?.name === 'Ноутбуки' ? <Link to="/catalog" className="hover:text-brand-700">Ноутбуки та комп’ютери</Link> : <Link to="/catalog" className="hover:text-brand-700">Каталог</Link>}
        {category ? <><span>›</span><span className="text-ink">{category.name}</span></> : null}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-[32px] font-bold leading-10">{query ? `Пошук: ${query}` : category?.name ?? 'Каталог'}</h1>
        <p className="text-sm text-muted">{countLabel} товарів</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {facets.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm ${applied.facet === item.id ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-transparent bg-white'}`}
            onClick={() => setApplied({ ...applied, facet: applied.facet === item.id ? null : item.id })}
          >
            {item.label}
          </button>
        ))}
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
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="text-brand-700" aria-hidden>☰</span>
            Фільтри
          </h2>
          <p className="mt-4 flex items-center justify-between text-sm font-medium">Ціна, ₴ <span className="text-muted">⌄</span></p>
          <div className="mt-2 flex items-center gap-2">
            <input className="w-full rounded-full border border-line px-3 py-1.5 text-sm" inputMode="numeric" value={draft.min ?? floor} onChange={(event) => setDraft({ ...draft, min: Number(event.target.value) })} />
            <span className="text-muted">—</span>
            <input className="w-full rounded-full border border-line px-3 py-1.5 text-sm" inputMode="numeric" value={draft.max ?? ceil} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} />
          </div>
          <input className="mt-3 w-full accent-brand-700" type="range" min={floor} max={ceil || 1} value={draft.max ?? ceil} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} />
          <FilterGroup title="Бренд" options={brands} selected={draft.brands} onToggle={(value) => setDraft({ ...draft, brands: toggle(draft.brands, value) })} />
          <FilterGroup title="Діагональ екрана" options={screens} selected={draft.screens} onToggle={(value) => setDraft({ ...draft, screens: toggle(draft.screens, value) })} />
          <FilterGroup title="Процесор" options={cpus} selected={draft.cpus} onToggle={(value) => setDraft({ ...draft, cpus: toggle(draft.cpus, value) })} />
          <FilterGroup title="Обсяг оперативної пам’яті" options={rams} selected={draft.rams} onToggle={(value) => setDraft({ ...draft, rams: toggle(draft.rams, value) })} />
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
            Тільки в наявності
            <button type="button" role="switch" aria-checked={draft.inStock} className={`relative h-6 w-11 rounded-full ${draft.inStock ? 'bg-brand-700' : 'bg-[#e7e0d6]'}`} onClick={() => setDraft({ ...draft, inStock: !draft.inStock })}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${draft.inStock ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
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
                  facet: facets.some((item) => item.label === chip) ? null : applied.facet,
                })}>
                  {chip} ×
                </button>
              ))}
              {chips.length > 0 ? <button type="button" className="text-sm text-brand-700" onClick={() => setApplied(emptyFilters)}>Скинути все</button> : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              Сортування
              <select className="rounded-full border border-line bg-white px-3 py-1.5 text-ink" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="price_asc">Від дешевих до дорогих</option>
                <option value="price_desc">Від дорогих до дешевих</option>
                <option value="new">Спочатку нові</option>
                <option value="name">За назвою</option>
              </select>
              <button type="button" aria-label="Плитка" className={`grid h-9 w-9 place-items-center rounded-lg ${view === 'grid' ? 'bg-brand-50 text-brand-700' : 'bg-white'}`} onClick={() => setView('grid')}>▦</button>
              <button type="button" aria-label="Список" className={`grid h-9 w-9 place-items-center rounded-lg ${view === 'list' ? 'bg-brand-50 text-brand-700' : 'bg-white'}`} onClick={() => setView('list')}>☰</button>
            </div>
          </div>
          {!loading && shown.length === 0 ? <p className="rounded-2xl bg-white p-6 text-muted">Нічого не знайдено. Скиньте фільтри або змініть запит.</p> : null}
          <ul className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-3'}>
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
          {more > 0 ? (
            <button type="button" className="mt-6 w-full rounded-xl border border-brand-700 py-3 text-sm font-semibold text-brand-700" onClick={() => setPage((current) => Math.min(pages, current + 1))}>
              Показати ще {goods(Math.min(pageSize, more))}
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

function goods(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11)
    return `${count} товар`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${count} товари`
  return `${count} товарів`
}

function FilterGroup({ title, options, selected, onToggle }: { title: string, options: [string, number][], selected: string[], onToggle: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  if (options.length === 0)
    return null
  const shown = expanded ? options : options.slice(0, 6)
  return (
    <fieldset className="mt-4 border-t border-line pt-4">
      <legend className="flex w-full items-center justify-between text-sm font-medium">{title}<span className="text-muted">⌄</span></legend>
      <ul className="mt-2 space-y-1.5">
        {shown.map(([name, count]) => (
          <li key={name}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={selected.includes(name)} onChange={() => onToggle(name)} />
              <span className="flex-1">{name}</span>
              <span className="text-muted">{count}</span>
            </label>
          </li>
        ))}
      </ul>
      {options.length > 6 ? (
        <button type="button" className="mt-2 text-sm font-medium text-brand-700" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Згорнути' : `Показати ще ${options.length - 6}`}
        </button>
      ) : null}
    </fieldset>
  )
}

function CatalogSkeleton({ title }: { title?: string }) {
  return (
    <section>
      <div className="h-4 w-56 animate-pulse rounded bg-cream" />
      <h1 className="mt-3 text-[32px] font-bold leading-10">{title ?? 'Каталог'}</h1>
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 6 }, (_, index) => <span key={index} className="h-8 w-28 animate-pulse rounded-full bg-white" />)}
      </div>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="h-[560px] animate-pulse rounded-2xl bg-white" />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="rounded-xl bg-white p-4">
              <div className="h-[180px] animate-pulse rounded-lg bg-cream" />
              <div className="mt-3 h-3 w-24 animate-pulse rounded bg-cream" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-cream" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-cream" />
              <div className="mt-4 h-6 w-24 animate-pulse rounded bg-brand-100" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
