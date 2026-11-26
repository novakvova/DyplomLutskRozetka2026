import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Button, ErrorText } from '../components/Field'
import { deliveryLabel, formatDate, formatMoney, orderStatusLabel, paymentLabel } from '../lib/format'
import type { Order, PaymentStart } from '../types'

export function OrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [payMessage, setPayMessage] = useState('')
  const [liqpay, setLiqpay] = useState<PaymentStart | null>(null)

  useEffect(() => {
    api<Order>(`/api/orders/${id}`)
      .then(setOrder)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Замовлення не знайдено.'))
  }, [id])

  if (error && !order)
    return <ErrorText>{error}</ErrorText>
  if (!order)
    return <p className="text-stone-600">Завантаження…</p>

  const current = order
  const canCancel = current.status === 'New' || current.status === 'AwaitingPayment'

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      setOrder(await api<Order>(`/api/orders/${current.id}/cancel`, { method: 'POST' }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося скасувати замовлення.')
    } finally {
      setBusy(false)
    }
  }

  async function pay() {
    setBusy(true)
    setError('')
    setPayMessage('')
    try {
      const started = await api<PaymentStart>(`/api/orders/${current.id}/pay`, { method: 'POST' })
      setPayMessage(started.message)
      if (started.mode === 'liqpay')
        setLiqpay(started)
      if (started.order)
        setOrder(started.order)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося почати оплату.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
        <img src="/hopely/ornament.svg" alt="" className="mx-auto h-14 w-full max-w-md object-cover" />
        <h1 className="mt-4 text-3xl font-bold">Дякуємо! Замовлення оформлено</h1>
        <p className="mt-2 text-sm text-brand-700">Замовлення № {order.id}</p>
        <p className="mt-2 text-sm text-muted">Деталі надіслані на пошту. Статус: {orderStatusLabel[order.status] ?? order.status}.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/catalog" className="rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-semibold text-brand-700">Продовжити покупки</Link>
          <Link to="/orders" className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white">Відстежити замовлення</Link>
        </div>
      </div>
      <h2 className="text-xl font-semibold">Замовлення №{order.id}</h2>
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
      {current.status === 'AwaitingPayment' ? (
        <Button type="button" disabled={busy} onClick={() => void pay()}>Оплатити карткою</Button>
      ) : null}
      {liqpay?.data && liqpay.signature ? (
        <form action="https://www.liqpay.ua/api/3/checkout" method="POST">
          <input type="hidden" name="data" value={liqpay.data} />
          <input type="hidden" name="signature" value={liqpay.signature} />
          <Button type="submit">Перейти до LiqPay</Button>
        </form>
      ) : null}
      {payMessage ? <p className="text-sm text-stone-600">{payMessage}</p> : null}
      {canCancel ? (
        <Button type="button" disabled={busy} onClick={() => void cancel()}>Скасувати замовлення</Button>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </section>
  )
}
