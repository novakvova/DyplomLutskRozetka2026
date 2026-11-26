import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  ['orders', '/orders', 'Мої замовлення'],
  ['favorites', '/favorites', 'Обране'],
  ['profile', '/profile', 'Особисті дані'],
] as const

export function AccountMenu({ active }: { active: 'orders' | 'favorites' | 'profile' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const letter = (user?.firstName || 'Я').slice(0, 1).toUpperCase()

  return (
    <aside className="h-fit rounded-2xl bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-700 text-lg font-semibold text-white">{letter}</span>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted">{user?.phone || user?.email}</p>
        </div>
      </div>
      <nav className="mt-4 space-y-1 text-sm">
        {links.map(([id, to, label]) => (
          <Link key={id} to={to} className={`block rounded-lg px-3 py-2 ${active === id ? 'bg-brand-50 font-semibold text-brand-700' : 'hover:bg-cream'}`}>{label}</Link>
        ))}
        <button
          type="button"
          className="block w-full rounded-lg px-3 py-2 text-left hover:bg-cream"
          onClick={() => void logout().then(() => navigate('/'))}
        >
          Вийти
        </button>
      </nav>
    </aside>
  )
}
