import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ErrorText } from '../components/Field'
import { formatDate, formatMoney, orderStatusLabel } from '../lib/format'
import type { Order } from '../types'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Order[]>('/api/orders')
      .then(setOrders)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити замовлення.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Мої замовлення</h1>
      <ErrorText>{error}</ErrorText>
      {orders.length === 0 ? <p className="text-stone-600">Замовлень ще немає.</p> : null}
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`} className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-brand-700">
              <p className="font-medium">Замовлення №{order.id}</p>
              <p className="text-sm text-stone-600">{formatDate(order.createdAt)} · {orderStatusLabel[order.status] ?? order.status}</p>
              <p className="mt-1 font-semibold">{formatMoney(order.total)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
