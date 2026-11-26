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

const tiles = ['Ноутбуки', 'Смартфони', 'Телевізори', 'Товари для геймерів', 'Енергонезалежність', 'Товари для дому']

const benefits = [
  ['Доставка по Україні', 'Безкоштовно від 1 500 ₴'],
  ['Офіційна гарантія', 'До 36 місяців на техніку'],
  ['Легке повернення', '14 днів без пояснень'],
  ['Оплата частинами', 'До 24 платежів без переплат'],
]

function tileImage(products: Product[], label: string) {
  const hints: Record<string, string> = {
    'Ноутбуки': 'ноутбук',
    'Смартфони': 'смартфон',
    'Телевізори': 'телевізор',
    'Товари для геймерів': 'консоль',
    'Енергонезалежність': 'станція',
    'Товари для дому': 'чайник',
  }
  const hint = hints[label] ?? ''
  return products.find((product) => product.name.toLowerCase().includes(hint) && product.imageUrl && !product.imageUrl.endsWith('.svg'))?.imageUrl
    ?? '/hopely/laptop.svg'
}

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
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-line bg-white">
          <ul>
            {sidebar.map((label) => (
              <li key={label}>
                <Link to={categoryHref(categories, label)} className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm last:border-b-0 hover:bg-cream">
                  {label}
                  <span className="text-muted">›</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/catalog" className="block px-4 py-2.5 text-sm font-semibold text-brand-700">Всі акції</Link>
            </li>
          </ul>
        </aside>
        <div className="flex min-h-[280px] flex-col justify-between rounded-xl bg-brand-700 p-8 text-[#fffdf9]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Чорна п’ятниця</p>
            <h1 className="mt-2 max-w-lg text-4xl font-bold leading-tight">Чорна п’ятниця вже в Hopely</h1>
            <p className="mt-3 max-w-md text-lg">Знижки до −50% на техніку та товари для дому</p>
            <Link to="/catalog" className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700">Переглянути пропозиції</Link>
          </div>
          <div className="mt-8 flex gap-3 text-sm font-semibold">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 text-center leading-tight">до −50%</span>
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 text-center leading-tight">Безкоштовна доставка</span>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Акційні пропозиції</h2>
        <Link to="/catalog" className="text-sm font-semibold text-brand-700">Усі акції</Link>
      </div>
      <ErrorText>{error}</ErrorText>
      {loading ? <p className="mt-4 text-muted">Завантажуємо товари…</p> : null}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {promo.map((product) => (
          <li key={product.id}><ProductCard product={product} /></li>
        ))}
      </ul>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Популярні категорії</h2>
        <Link to="/catalog" className="text-sm font-semibold text-brand-700">Весь каталог</Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((label) => (
          <li key={label}>
            <Link to={categoryHref(categories, label)} className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white px-3 py-5 text-center text-sm font-medium hover:border-brand-700">
              <img src={tileImage(products, label)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-2xl font-bold">Рекомендовані для вас</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {recommended.map((product) => (
          <li key={product.id}><ProductCard product={product} /></li>
        ))}
      </ul>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {benefits.map(([title, text]) => (
          <li key={title} className="rounded-xl bg-cream px-4 py-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
