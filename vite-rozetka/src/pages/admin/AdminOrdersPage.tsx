import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api'
import { ErrorText } from '../../components/Field'
import { deliveryLabel, formatDate, formatMoney, orderStatusLabel, paymentLabel } from '../../lib/format'
import type { AdminOrder, OrderStatus } from '../../types'

const statuses = Object.keys(orderStatusLabel) as OrderStatus[]

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)

  useEffect(() => {
    api<AdminOrder[]>('/api/admin/orders')
      .then(setOrders)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити замовлення.'))
      .finally(() => setLoading(false))
  }, [])

  async function changeStatus(order: AdminOrder, status: OrderStatus) {
    setPendingId(order.id)
    setError('')
    try {
      const updated = await api<AdminOrder>(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося змінити статус.')
    } finally {
      setPendingId(null)
    }
  }

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <div className="space-y-3">
      <ErrorText>{error}</ErrorText>
      {orders.length === 0 ? <p className="text-stone-600">Замовлень ще немає.</p> : null}
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">№{order.id} · {order.userEmail}</p>
                <p className="text-sm text-stone-600">{formatDate(order.createdAt)} · {order.recipientName}, {order.phone}</p>
                <p className="text-sm text-stone-600">{order.city}, {deliveryLabel[order.deliveryMethod] ?? order.deliveryMethod}: {order.deliveryAddress}</p>
                <p className="text-sm text-stone-600">{paymentLabel[order.paymentMethod] ?? order.paymentMethod}</p>
                {order.comment ? <p className="text-sm text-stone-600">Коментар: {order.comment}</p> : null}
              </div>
              <label className="text-sm text-stone-700">
                Статус
                <select
                  className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2"
                  value={order.status}
                  disabled={pendingId === order.id || order.status === 'Cancelled'}
                  onChange={(event) => void changeStatus(order, event.target.value as OrderStatus)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{orderStatusLabel[status]}</option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {order.items.map((item) => (
                <li key={`${order.id}-${item.productId}-${item.productName}`}>
                  {item.productName} × {item.quantity} — {formatMoney(item.lineTotal)}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">{formatMoney(order.total)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
