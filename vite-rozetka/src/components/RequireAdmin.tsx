import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function RequireAdmin() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'Admin')
    return <Navigate to="/" replace />
  return <Outlet />
}
