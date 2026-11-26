import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { Cart, Category } from '../types'
import { Logo } from './Logo'

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
    navigate(`/catalog?${next.toString()}`)
  }

  async function onLogout() {
    await logout()
    navigate('/')
  }

  const accountTo = user ? '/profile' : '/login'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-[#fffdf9]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-5 px-4 py-4 lg:px-10">
          <Logo />
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <img src="/hopely/icon-grid.svg" alt="" className="h-4 w-4 brightness-0 invert" />
              Каталог
            </button>
            {menuOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <Link to="/catalog" className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50" onClick={() => setMenuOpen(false)}>
                  Усі товари
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/catalog?category=${category.id}`}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <form className="flex min-w-[220px] flex-1 items-center gap-2" onSubmit={onSearch}>
            <div className="flex h-11 w-full items-center gap-2 rounded-lg bg-cream px-3">
              <img src="/hopely/icon-search.svg" alt="" className="h-4 w-4" />
              <input
                className="h-full w-full bg-transparent text-sm outline-none"
                placeholder="Я шукаю…"
                aria-label="Пошук товарів"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button type="submit" className="h-11 shrink-0 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
              Знайти
            </button>
          </form>
          <nav className="ml-auto flex items-center gap-4">
            <IconLabel to={accountTo} label={user ? user.firstName : 'Увійти'}>
              <img src="/hopely/icon-user.svg" alt="" className="h-5 w-5" />
            </IconLabel>
            <IconLabel to={user ? '/favorites' : '/login'} label="Обране">
              <img src="/hopely/icon-heart.svg" alt="" className="h-5 w-5" />
            </IconLabel>
            <IconLabel to={user ? '/cart' : '/login'} label="Кошик" badge={cartCount}>
              <img src="/hopely/icon-cart.svg" alt="" className="h-5 w-5" />
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
      <footer className="bg-ink text-sm text-[#d9cfc3]">
        <div className="h-[75px] bg-[url('/hopely/ornament.svg')] bg-repeat-x" aria-hidden />
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs">Інтернет-магазин техніки та товарів для дому. Швидка доставка по всій Україні.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Покупцям</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="hover:text-white" to="/catalog">Доставка та оплата</Link></li>
              <li><Link className="hover:text-white" to="/orders">Повернення товару</Link></li>
              <li><Link className="hover:text-white" to="/catalog">Гарантія</Link></li>
              <li><Link className="hover:text-white" to="/catalog">Питання та відповіді</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Компанія</p>
            <ul className="mt-3 space-y-2">
              <li><Link className="hover:text-white" to="/">Про Hopely</Link></li>
              <li><a className="hover:text-white" href="mailto:support@hopely.ua">Контакти</a></li>
              <li><Link className="hover:text-white" to="/register">Вакансії</Link></li>
              <li><Link className="hover:text-white" to="/register">Умови використання</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Контакти</p>
            <ul className="mt-3 space-y-2">
              <li>0 800 123 456</li>
              <li><a className="hover:text-white" href="mailto:support@hopely.ua">support@hopely.ua</a></li>
              <li>Щодня 8:00–21:00</li>
              <li>Київ, вул. Хрещатик, 1</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs lg:px-10">
            <p>© 2026 Hopely. Навчальний студентський проєкт</p>
            <p>Visa · Mastercard · Apple Pay · Google Pay</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
