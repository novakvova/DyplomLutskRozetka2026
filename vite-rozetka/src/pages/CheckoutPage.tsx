import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, Field, SelectField, TextArea } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Cart, City, Order, Warehouse } from '../types'

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
  const [cityQuery, setCityQuery] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

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
    if (form.deliveryMethod !== 'nova_poshta' || cityQuery.trim().length < 2) {
      setCities([])
      return
    }
    const timer = window.setTimeout(() => {
      api<City[]>(`/api/delivery/cities?query=${encodeURIComponent(cityQuery.trim())}`)
        .then(setCities)
        .catch(() => setCities([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [cityQuery, form.deliveryMethod])

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

  const methods = [
    ['nova_poshta', 'Нова пошта — у відділення', 'Безкоштовно від 1 500 ₴'],
    ['ukrposhta', 'Укрпошта', '2–4 дні'],
    ['pickup', 'Самовивіз з магазину Hopely', 'Безкоштовно'],
  ] as const
  const pays = [
    ['card', 'Карткою онлайн', 'Visa, Mastercard'],
    ['cash_on_delivery', 'Під час отримання', 'Готівка або картка у відділенні'],
  ] as const

  return (
    <section>
      <p className="text-sm text-muted"><Link to="/cart" className="hover:text-brand-700">Кошик</Link> · Оформлення замовлення</p>
      <h1 className="mt-2 text-3xl font-bold">Оформлення замовлення</h1>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form id="checkout" className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <h2 className="font-semibold">1. Контактні дані</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Ім’я та прізвище" name="recipientName" required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} />
        <Field label="Телефон" name="phone" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <p className="text-sm text-muted sm:col-span-2">Пошта: {user?.email}</p>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <h2 className="font-semibold">2. Доставка</h2>
          <div className="mt-3 space-y-2">
            {methods.map(([value, title, hint]) => (
              <label key={value} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm ${form.deliveryMethod === value ? 'border-brand-700 bg-brand-50' : 'border-line'}`}>
                <span><input className="mr-2 accent-brand-700" type="radio" name="deliveryMethod" checked={form.deliveryMethod === value} onChange={() => setForm({ ...form, deliveryMethod: value })} />{title}</span>
                <span className="text-ok">{hint}</span>
              </label>
            ))}
          </div>
        {form.deliveryMethod === 'nova_poshta' ? (
          <div className="space-y-2">
            <Field label="Пошук міста" name="cityQuery" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Наприклад, Луцьк" />
            {cities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <button
                    key={city.ref}
                    type="button"
                    className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                    onClick={() => {
                      setForm({ ...form, city: city.name, deliveryAddress: '' })
                      setCityQuery(city.name)
                      setCities([])
                      api<Warehouse[]>(`/api/delivery/warehouses?cityRef=${encodeURIComponent(city.ref)}`)
                        .then(setWarehouses)
                        .catch(() => setWarehouses([]))
                    }}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            ) : null}
            {warehouses.length > 0 ? (
              <SelectField label="Відділення" name="warehouse" value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })}>
                <option value="">Оберіть відділення</option>
                {warehouses.map((warehouse) => <option key={warehouse.ref} value={warehouse.name}>{warehouse.name}</option>)}
              </SelectField>
            ) : null}
            {form.city ? <p className="text-sm text-stone-600">Місто: {form.city}</p> : null}
          </div>
        ) : (
          <Field label="Місто" name="city" required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        )}
        <Field label="Відділення або адреса" name="deliveryAddress" required value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })} />
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <h2 className="font-semibold">3. Оплата</h2>
          <div className="mt-3 space-y-2">
            {pays.map(([value, title, hint]) => (
              <label key={value} className={`block rounded-xl border px-3 py-3 text-sm ${form.paymentMethod === value ? 'border-brand-700 bg-brand-50' : 'border-line'}`}>
                <input className="mr-2 accent-brand-700" type="radio" name="paymentMethod" checked={form.paymentMethod === value} onChange={() => setForm({ ...form, paymentMethod: value })} />
                {title}
                <span className="mt-1 block pl-5 text-muted">{hint}</span>
              </label>
            ))}
          </div>
          {form.paymentMethod === 'card' ? (
            <p className="mt-2 text-sm text-muted">Оплата карткою відкриється на сторінці замовлення. До підтвердження статус буде «Очікує оплату».</p>
          ) : null}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <h2 className="font-semibold">4. Коментар до замовлення</h2>
          <div className="mt-3">
        <TextArea label="Коментар (необов’язково)" name="comment" rows={3} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          </div>
        </section>
        <ErrorText>{error}</ErrorText>
      </form>
      <aside className="h-fit rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
        <h2 className="font-semibold">Ваше замовлення</h2>
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
        {cart && cart.items.length > 0 ? <p className="mt-4 text-2xl font-bold">До сплати {formatMoney(cart.total)}</p> : null}
        <Button type="submit" form="checkout" className="mt-4 w-full" disabled={busy || !cart || cart.items.length === 0}>Підтвердити замовлення</Button>
      </aside>
      </div>
    </section>
  )
}
