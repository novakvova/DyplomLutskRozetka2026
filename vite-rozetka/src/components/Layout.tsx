import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { Cart, Category } from '../types'
import { CartGlyph, Logo } from './Logo'

function IconLabel({
  to,
  label,
  children,
  badge,
}: {
  to: string
  label: string
  children: ReactNode
  badge?: number
}) {
  return (
    <NavLink to={to} className="relative flex min-w-14 flex-col items-center gap-0.5 text-[11px] text-ink hover:text-brand-700">
      <span className="relative">
        {children}
        {badge && badge > 0 ? (
          <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </NavLink>
  )
}

export function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [cartCount, setCartCount] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState(params.get('q') ?? '')

  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setMenuOpen(false)
  }, [params, location.pathname])

  useEffect(() => {
    api<Category[]>('/api/categories').then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!user) {
      setCartCount(0)
      return
    }
    let cancelled = false
    api<Cart>('/api/cart')
      .then((cart) => {
        if (!cancelled)
          setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))
      })
      .catch(() => {
        if (!cancelled)
          setCartCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [user, location.pathname])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (query.trim())
      next.set('q', query.trim())
    navigate(`/?${next.toString()}`)
  }

  async function onLogout() {
    await logout()
    navigate('/')
  }

  const accountTo = user ? '/profile' : '/login'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Logo />
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:border-brand-700"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
              Каталог
            </button>
            {menuOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <Link to="/" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50" onClick={() => setMenuOpen(false)}>
                  Усі товари
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/?category=${category.id}`}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <form className="flex min-w-[220px] flex-1 items-center" onSubmit={onSearch}>
            <input
              className="h-11 w-full rounded-l-xl border border-r-0 border-brand-100 bg-white px-4 text-sm outline-none focus:border-brand-700"
              placeholder="Я шукаю..."
              aria-label="Пошук товарів"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="h-11 shrink-0 rounded-r-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
              Знайти
            </button>
          </form>
          <nav className="ml-auto flex items-center gap-3 sm:gap-4">
            <IconLabel to="/?sort=price_asc" label="Знижки">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 14l8-8h6v6l-8 8a2 2 0 0 1-2.8 0L4 16.8A2 2 0 0 1 4 14z" strokeLinejoin="round" />
                <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </IconLabel>
            <IconLabel to={user ? '/favorites' : '/login'} label="Обране">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" strokeLinejoin="round" />
              </svg>
            </IconLabel>
            <IconLabel to={user ? '/cart' : '/login'} label="Кошик" badge={cartCount}>
              <CartGlyph />
            </IconLabel>
            <IconLabel to={accountTo} label={user ? user.firstName : 'Увійти'}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 19.2c1.4-2.6 3.8-4 7-4s5.6 1.4 7 4" strokeLinecap="round" />
              </svg>
            </IconLabel>
          </nav>
        </div>
        {!loading && user ? (
          <div className="border-t border-stone-100">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-stone-600">
              <Link to="/orders" className="hover:text-brand-700">Замовлення</Link>
              <Link to="/compare" className="hover:text-brand-700">Порівняння</Link>
              <Link to="/recent" className="hover:text-brand-700">Переглянуті</Link>
              {user.role === 'Admin' ? <Link to="/admin" className="hover:text-brand-700">Адмінка</Link> : null}
              <button type="button" className="ml-auto hover:text-brand-700" onClick={() => void onLogout()}>Вийти</button>
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-[#1c1c1c] text-sm text-stone-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-stone-400">Магазин техніки з доставкою Новою поштою по Україні.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Покупцям</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="hover:text-white" to="/">Каталог</Link></li>
              <li><Link className="hover:text-white" to="/compare">Порівняння</Link></li>
              <li><Link className="hover:text-white" to="/recent">Переглянуті</Link></li>
              <li><Link className="hover:text-white" to={user ? '/orders' : '/login'}>Замовлення</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Компанія</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="hover:text-white" to="/">Про Hopely</Link></li>
              <li><a className="hover:text-white" href="mailto:support@hopely.ua">Контакти</a></li>
              <li><Link className="hover:text-white" to="/register">Реєстрація</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Контакти</p>
            <ul className="mt-3 space-y-2">
              <li>0 800 123 456</li>
              <li><a className="text-sky-300 hover:underline" href="mailto:support@hopely.ua">support@hopely.ua</a></li>
              <li>Щодня 9:00–21:00</li>
              <li>Київ, вул. Хрещатик, 1</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-stone-500">© 2026 Hopely. Усі права захищені.</p>
        </div>
      </footer>
    </div>
  )
}
