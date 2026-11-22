import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api'
import { ErrorText } from '../../components/Field'
import { useAuth } from '../../auth/AuthContext'
import { formatDate } from '../../lib/format'
import type { AdminUser } from '../../types'

export function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)

  useEffect(() => {
    api<AdminUser[]>('/api/admin/users')
      .then(setUsers)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити користувачів.'))
      .finally(() => setLoading(false))
  }, [])

  async function setRole(target: AdminUser, role: 'Admin' | 'Buyer') {
    setPendingId(target.id)
    setError('')
    try {
      const updated = await api<AdminUser>(`/api/admin/users/${target.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      })
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося змінити роль.')
    } finally {
      setPendingId(null)
    }
  }

  async function setBlocked(target: AdminUser, isBlocked: boolean) {
    setPendingId(target.id)
    setError('')
    try {
      const updated = await api<AdminUser>(`/api/admin/users/${target.id}/blocked`, {
        method: 'PUT',
        body: JSON.stringify({ isBlocked }),
      })
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося змінити доступ.')
    } finally {
      setPendingId(null)
    }
  }

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <div className="space-y-3">
      <ErrorText>{error}</ErrorText>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Користувач</th>
              <th className="px-3 py-2 font-medium">Роль</th>
              <th className="px-3 py-2 font-medium">Створено</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-b border-stone-100">
                <td className="px-3 py-2">
                  <p className="font-medium">{item.firstName} {item.lastName}</p>
                  <p className="text-stone-500">{item.email}{item.phone ? ` · ${item.phone}` : ''}</p>
                </td>
                <td className="px-3 py-2">{item.role === 'Admin' ? 'Адміністратор' : 'Покупець'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  {item.id === user?.id ? (
                    <span className="text-stone-400">Це ви</span>
                  ) : (
                    <span className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="text-brand-800 hover:underline disabled:opacity-50"
                        disabled={pendingId === item.id}
                        onClick={() => void setRole(item, item.role === 'Admin' ? 'Buyer' : 'Admin')}
                      >
                        {item.role === 'Admin' ? 'Зробити покупцем' : 'Зробити адміністратором'}
                      </button>
                      {item.role === 'Admin' ? null : (
                        <button
                          type="button"
                          className="text-brand-800 hover:underline disabled:opacity-50"
                          disabled={pendingId === item.id}
                          onClick={() => void setBlocked(item, !item.isBlocked)}
                        >
                          {item.isBlocked ? 'Розблокувати' : 'Заблокувати'}
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
