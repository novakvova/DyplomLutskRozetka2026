import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ErrorText } from '../components/Field'
import { deliveryLabel, formatDate, formatMoney, orderStatusLabel, paymentLabel } from '../lib/format'
import type { Order } from '../types'

export function OrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Order>(`/api/orders/${id}`)
      .then(setOrder)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Замовлення не знайдено.'))
  }, [id])

  if (error && !order)
    return <ErrorText>{error}</ErrorText>
  if (!order)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <section className="max-w-2xl space-y-4">
      <Link to="/orders" className="text-sm text-brand-800">До списку замовлень</Link>
      <h1 className="text-2xl font-semibold">Замовлення №{order.id}</h1>
      <p className="text-stone-600">{formatDate(order.createdAt)} · {orderStatusLabel[order.status] ?? order.status}</p>
      <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <p>{order.recipientName}, {order.phone}</p>
        <p>{order.city}, {deliveryLabel[order.deliveryMethod] ?? order.deliveryMethod}: {order.deliveryAddress}</p>
        <p>Оплата: {paymentLabel[order.paymentMethod] ?? order.paymentMethod}</p>
        {order.comment ? <p>Коментар: {order.comment}</p> : null}
      </div>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.productName}`} className="flex justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <span>{item.productName} × {item.quantity}</span>
            <span className="font-medium">{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xl font-semibold">Разом {formatMoney(order.total)}</p>
    </section>
  )
}
