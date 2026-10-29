import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, Field, SelectField, TextArea } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Cart, Order } from '../types'

export function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState<Cart | null>(null)
  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    city: '',
    deliveryMethod: 'nova_poshta',
    deliveryAddress: '',
    paymentMethod: 'cash_on_delivery',
    comment: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user)
      return
    setForm((current) => ({
      ...current,
      recipientName: `${user.firstName} ${user.lastName}`,
      phone: user.phone ?? '',
    }))
  }, [user])

  useEffect(() => {
    api<Cart>('/api/cart')
      .then(setCart)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити кошик.'))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const order = await api<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ ...form, comment: form.comment || null }),
      })
      navigate(`/orders/${order.id}`)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося оформити замовлення.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void onSubmit(event)}>
        <h1 className="text-2xl font-semibold">Оформлення замовлення</h1>
        <Field label="Ім’я та прізвище" name="recipientName" required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} />
        <Field label="Телефон" name="phone" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Field label="Місто" name="city" required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        <SelectField label="Доставка" name="deliveryMethod" value={form.deliveryMethod} onChange={(event) => setForm({ ...form, deliveryMethod: event.target.value })}>
          <option value="nova_poshta">Нова пошта</option>
          <option value="ukrposhta">Укрпошта</option>
          <option value="pickup">Самовивіз</option>
        </SelectField>
        <Field label="Відділення або адреса" name="deliveryAddress" required value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })} />
        <SelectField label="Оплата" name="paymentMethod" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
          <option value="cash_on_delivery">Під час отримання</option>
          <option value="card">Карткою</option>
        </SelectField>
        {form.paymentMethod === 'card' ? (
          <p className="text-sm text-stone-600">Оплата карткою поки не списується. Замовлення збережеться зі статусом «Очікує оплату».</p>
        ) : null}
        <TextArea label="Коментар" name="comment" rows={3} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy || !cart || cart.items.length === 0}>Підтвердити замовлення</Button>
      </form>
      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">У замовленні</h2>
        {!cart ? <p className="mt-2 text-sm text-stone-600">Завантаження…</p> : null}
        {cart?.items.length === 0 ? <p className="mt-2 text-sm">Кошик порожній. <Link className="text-brand-800" to="/">До товарів</Link></p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {cart?.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        {cart && cart.items.length > 0 ? <p className="mt-4 font-semibold">Разом {formatMoney(cart.total)}</p> : null}
      </aside>
    </section>
  )
}
