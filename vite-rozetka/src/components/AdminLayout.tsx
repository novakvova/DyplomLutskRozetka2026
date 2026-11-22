import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-brand-800 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'}`

export function AdminLayout() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Адмін-панель</h1>
        <nav className="flex flex-wrap gap-2">
          <NavLink to="/admin" end className={linkClass}>Товари</NavLink>
          <NavLink to="/admin/categories" className={linkClass}>Категорії</NavLink>
          <NavLink to="/admin/orders" className={linkClass}>Замовлення</NavLink>
          <NavLink to="/admin/users" className={linkClass}>Користувачі</NavLink>
        </nav>
      </div>
      <Outlet />
    </section>
  )
}
