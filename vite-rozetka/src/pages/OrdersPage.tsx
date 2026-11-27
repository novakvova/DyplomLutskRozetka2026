import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { AccountMenu } from '../components/AccountMenu'
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

  const steps = ['Оформлено', 'Оплачено', 'Комплектується', 'Відправлено', 'Доставлено']
  function stepIndex(status: string) {
    if (status === 'Completed')
      return 4
    if (status === 'Processing')
      return 2
    if (status === 'AwaitingPayment')
      return 1
    return 0
  }

  return (
    <section className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <AccountMenu active="orders" />
      <div>
        <h1 className="text-3xl font-bold">Мої замовлення</h1>
        <ErrorText>{error}</ErrorText>
        {orders.length === 0 ? <p className="mt-4 text-muted">Замовлень ще немає.</p> : null}
        <ul className="mt-4 space-y-4">
          {orders.map((order) => {
            const current = stepIndex(order.status)
            return (
              <li key={order.id} className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">№ {order.id}</p>
                    <p className="text-sm text-muted">від {formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === 'Completed' ? 'bg-emerald-100 text-ok' : 'bg-brand-50 text-brand-700'}`}>
                    {orderStatusLabel[order.status] ?? order.status}
                  </span>
                </div>
                <ol className="mt-4 flex items-center gap-1 text-[11px] text-muted">
                  {steps.map((label, index) => (
                    <li key={label} className="flex flex-1 items-center gap-1">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${index <= current && order.status !== 'Cancelled' ? 'bg-brand-700 text-white' : 'bg-cream'}`}>{index < current ? '✓' : ''}</span>
                      <span className={index === current ? 'font-semibold text-brand-700' : ''}>{label}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-right font-bold">{formatMoney(order.total)}</p>
                <Link to={`/orders/${order.id}`} className="mt-3 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Деталі замовлення</Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
