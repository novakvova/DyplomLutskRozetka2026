import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Button, ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Cart } from '../types'

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    api<Cart>('/api/cart')
      .then(setCart)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити кошик.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function update(productId: number, quantity: number) {
    setError('')
    try {
      setCart(await api<Cart>('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity }),
      }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося оновити кошик.')
    }
  }

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Кошик</h1>
      <ErrorText>{error}</ErrorText>
      {cart && cart.items.length === 0 ? (
        <p className="text-stone-600">Кошик порожній. <Link className="text-brand-800" to="/">Перейти до товарів</Link></p>
      ) : null}
      <ul className="space-y-3">
        {cart?.items.map((item) => (
          <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <Link className="font-medium hover:text-brand-800" to={`/products/${item.productId}`}>{item.name}</Link>
              <p className="text-sm text-stone-500">{formatMoney(item.unitPrice)} · на складі {item.stock}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-20 rounded-lg border border-stone-300 px-2 py-1"
                type="number"
                min={1}
                max={Math.min(20, item.stock)}
                value={item.quantity}
                onChange={(event) => void update(item.productId, Number(event.target.value))}
              />
              <span className="w-28 text-right font-medium">{formatMoney(item.lineTotal)}</span>
              <button type="button" className="text-sm text-red-700" onClick={() => void update(item.productId, 0)}>Прибрати</button>
            </div>
          </li>
        ))}
      </ul>
      {cart && cart.items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-semibold">Разом {formatMoney(cart.total)}</p>
          <Link to="/checkout"><Button type="button">Оформити замовлення</Button></Link>
        </div>
      ) : null}
    </section>
  )
}
