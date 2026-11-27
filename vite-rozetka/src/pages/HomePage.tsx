import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ProductCard } from '../components/ProductCard'
import { ErrorText } from '../components/Field'
import type { Category, Product } from '../types'

const sidebar = [
  'Енергонезалежність',
  'Ноутбуки та комп’ютери',
  'Смартфони, ТВ і електроніка',
  'Товари для геймерів',
  'Побутова техніка',
  'Товари для дому',
  'Авто і мото',
  'Інструменти та обладнання',
  'Сантехніка та ремонт',
  'Дача, сад і город',
  'Спорт і захоплення',
  'Одяг, взуття та прикраси',
  'Краса та здоров’я',
  'Дитячі товари',
  'Зоотовари',
  'Офіс, школа, книги',
  'Побутова хімія',
]

const tiles = [
  ['Ноутбуки', 'laptop'],
  ['Смартфони', 'phone'],
  ['Телевізори', 'tv'],
  ['Для геймерів', 'game'],
  ['Енергонезалежність', 'zap'],
  ['Товари для дому', 'home'],
] as const

const benefits = [
  ['Доставка по Україні', 'Безкоштовно від 1 500 ₴', 'truck'],
  ['Офіційна гарантія', 'До 36 місяців на техніку', 'shield'],
  ['Легке повернення', '14 днів без пояснень', 'back'],
  ['Оплата частинами', 'До 24 платежів без переплат', 'card'],
] as const

function categoryHref(categories: Category[], label: string) {
  const match = categories.find((category) => category.name === label)
    ?? categories.find((category) => label.startsWith(category.name) || category.name.startsWith(label.split(' ')[0] ?? label))
  return match ? `/catalog?category=${match.id}` : '/catalog'
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api<Product[]>('/api/products'), api<Category[]>('/api/categories')])
      .then(([nextProducts, nextCategories]) => {
        setProducts(nextProducts)
        setCategories(nextCategories)
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити вітрину.'))
      .finally(() => setLoading(false))
  }, [])

  const deals = products.filter((product) => product.oldPrice && product.oldPrice > product.price)
  const promo = (deals.length > 0 ? deals : products).slice(0, 4)
  const recommended = products.slice(0, 5)

  return (
    <section>
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-xl bg-white py-2">
          <ul>
            {sidebar.map((label) => (
              <li key={label}>
                <Link to={categoryHref(categories, label)} className={`mx-2 flex h-9 items-center justify-between rounded-lg px-3 text-sm hover:bg-brand-50 hover:text-brand-700 ${label.startsWith('Ноутбуки') ? 'bg-brand-50 text-brand-700' : ''}`}>
                  {label}
                  <img src="/hopely/icon-chevron-right.svg" alt="" className="h-4 w-4" />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/catalog" className="mx-2 flex h-9 items-center justify-between rounded-lg px-3 text-sm font-semibold text-brand-700">
                Всі акції
                <img src="/hopely/icon-chevron-orange.svg" alt="" className="h-4 w-4" />
              </Link>
            </li>
          </ul>
        </aside>
        <div className="relative flex h-[360px] items-center justify-between overflow-hidden rounded-2xl bg-brand-700 px-8 text-[#fffdf9] sm:px-[72px]">
          <img src="/hopely/banner-waves.svg" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="relative z-10 max-w-[380px]">
            <h1 className="text-[40px] font-bold leading-[48px] sm:text-[44px] sm:leading-[52px]">Чорна п’ятниця<br />вже в Hopely</h1>
            <p className="mt-3 text-base leading-6">Знижки до −50% на техніку та товари для дому</p>
            <Link to="/catalog" className="mt-5 inline-flex rounded-lg bg-[#fffdf9] px-6 py-3 text-base font-semibold text-brand-700">Дивитися акції</Link>
          </div>
          <div className="relative z-10 hidden items-center sm:flex">
            <div className="z-10 flex h-40 w-40 flex-col items-center justify-center rounded-full bg-cream text-ink">
              <span className="text-sm font-medium">до</span>
              <span className="text-[32px] font-bold leading-10">−50%</span>
            </div>
            <div className="-ml-4 flex h-40 w-40 flex-col items-center justify-center rounded-full bg-ink text-center text-sm font-semibold leading-5">
              <img src="/hopely/icon-truck.svg" alt="" className="mb-1.5 h-7 w-7" />
              Безкоштовна<br />доставка
            </div>
          </div>
          <span className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#fffdf9]">
            <img src="/hopely/icon-chevron-left.svg" alt="" className="h-5 w-5" />
          </span>
          <span className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#fffdf9]">
            <img src="/hopely/icon-chevron-right.svg" alt="" className="h-5 w-5" />
          </span>
          <span className="absolute bottom-[22px] left-1/2 flex -translate-x-1/2 gap-1.5">
            <span className="h-2 w-6 rounded-full bg-[#fffdf9]" />
            <span className="h-2 w-2 rounded-full bg-[#fffdf9]/70" />
            <span className="h-2 w-2 rounded-full bg-[#fffdf9]/70" />
            <span className="h-2 w-2 rounded-full bg-[#fffdf9]/70" />
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[32px] font-bold leading-10">Акційні пропозиції</h2>
        <Link to="/catalog" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Усі акції <img src="/hopely/icon-chevron-orange.svg" alt="" className="h-4 w-4" /></Link>
      </div>
      <ErrorText>{error}</ErrorText>
      {loading ? <p className="mt-4 text-muted">Завантажуємо товари…</p> : null}
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {promo.map((product) => (
          <li key={product.id}><ProductCard product={product} /></li>
        ))}
      </ul>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-[32px] font-bold leading-10">Популярні категорії</h2>
        <Link to="/catalog" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Весь каталог <img src="/hopely/icon-chevron-orange.svg" alt="" className="h-4 w-4" /></Link>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([label, icon]) => (
          <li key={label}>
            <Link to={categoryHref(categories, label === 'Для геймерів' ? 'Товари для геймерів' : label)} className="flex h-[152px] flex-col items-center justify-center gap-3 rounded-xl bg-white text-sm">
              <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-cream text-brand-700">
                <TileIcon name={icon} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-[32px] font-bold leading-10">Рекомендовані для вас</h2>
        <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700" onClick={() => document.getElementById('more')?.scrollIntoView({ behavior: 'smooth' })}>Показати ще <img src="/hopely/icon-chevron-orange.svg" alt="" className="h-4 w-4" /></button>
      </div>
      <ul id="more" className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {recommended.map((product) => (
          <li key={product.id}><ProductCard product={product} /></li>
        ))}
      </ul>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {benefits.map(([title, text, icon]) => (
          <li key={title} className="flex items-center gap-4 rounded-xl bg-white px-5 py-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cream text-brand-700">
              <TileIcon name={icon} />
            </span>
            <span>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TileIcon({ name }: { name: string }) {
  const common = 'h-8 w-8'
  if (name === 'phone')
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" strokeLinecap="round" /></svg>
  if (name === 'tv')
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20h8" strokeLinecap="round" /></svg>
  if (name === 'game')
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 10h12a4 4 0 0 1 3.8 5.2l-.8 2.3A2 2 0 0 1 19.1 19H6.5a3.5 3.5 0 0 1-3.4-4.3L4 11.2A2 2 0 0 1 6 10z" /><path d="M8 14v3M6.5 15.5h3M16 14.5h.01M18 16.5h.01" strokeLinecap="round" /></svg>
  if (name === 'zap')
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" strokeLinejoin="round" /></svg>
  if (name === 'home')
    return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12.5 12 5l8 7.5" strokeLinecap="round" /><path d="M7 11.5V19h10v-7.5" /><path d="M10 19v-4h4v4" /></svg>
  if (name === 'truck')
    return <img src="/hopely/icon-truck-orange.svg" alt="" className="h-6 w-6" />
  if (name === 'shield')
    return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3z" /></svg>
  if (name === 'back')
    return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12a8 8 0 1 0 2.3-5.6" strokeLinecap="round" /><path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (name === 'card')
    return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>
  return <img src="/hopely/laptop.svg" alt="" className={common} />
}
