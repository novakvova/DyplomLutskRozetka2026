import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { Cart } from '../types'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1 ${isActive ? 'bg-brand-50 text-brand-900' : 'text-stone-700 hover:bg-stone-100'}`

export function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)

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

  async function onLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="text-xl font-semibold text-brand-900">Rozetka</Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            <NavLink to="/" className={linkClass} end>Товари</NavLink>
            {user && (
              <>
                <NavLink to="/cart" className={linkClass}>Кошик{cartCount > 0 ? ` (${cartCount})` : ''}</NavLink>
                <NavLink to="/favorites" className={linkClass}>Обране</NavLink>
                <NavLink to="/orders" className={linkClass}>Замовлення</NavLink>
                <NavLink to="/profile" className={linkClass}>Профіль</NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {loading ? null : user ? (
              <>
                <span className="text-stone-600">{user.firstName}</span>
                <button type="button" className="rounded-md px-2 py-1 text-stone-700 hover:bg-stone-100" onClick={() => void onLogout()}>
                  Вийти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-md px-2 py-1 text-stone-700 hover:bg-stone-100">Увійти</Link>
                <Link to="/register" className="rounded-lg bg-brand-800 px-3 py-1.5 font-medium text-white hover:bg-brand-900">Реєстрація</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
