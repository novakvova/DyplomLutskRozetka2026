import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ProductCard } from '../components/ProductCard'
import { ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Cart, Product } from '../types'

export function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [also, setAlso] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [codeNote, setCodeNote] = useState('')

  function load() {
    setLoading(true)
    api<Cart>('/api/cart')
      .then(setCart)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити кошик.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api<Product[]>('/api/products').then((items) => setAlso(items.slice(0, 5))).catch(() => setAlso([]))
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
    return <p className="text-muted">Завантаження…</p>

  const items = cart?.items ?? []
  const discount = items.reduce((sum, item) => sum + (item.oldPrice && item.oldPrice > item.unitPrice ? (item.oldPrice - item.unitPrice) * item.quantity : 0), 0)
  const goods = (cart?.total ?? 0) + discount

  if (items.length === 0) {
    return (
      <section>
        <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <img src="/hopely/ornament.svg" alt="" className="mx-auto h-16 w-full max-w-xl object-cover" />
          <span className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-3xl text-brand-700">🛒</span>
          <h1 className="mt-4 text-3xl font-bold">Ваш кошик порожній</h1>
          <p className="mt-2 text-muted">Додайте товари з каталогу — ми швидко доставимо їх по всій Україні.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/catalog" className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white">Перейти до каталогу</Link>
            <Link to="/catalog" className="rounded-lg bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700">Переглянути акції</Link>
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-bold">Популярні товари</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {also.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}
        </ul>
      </section>
    )
  }

  return (
    <section>
      <p className="text-sm text-muted"><Link to="/" className="hover:text-brand-700">Головна</Link> · Кошик</p>
      <h1 className="mt-2 text-3xl font-bold">Кошик <span className="text-base font-normal text-muted">{items.length} {items.length === 1 ? 'товар' : 'товари'}</span></h1>
      <ErrorText>{error}</ErrorText>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ul className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
            {items.map((item) => (
              <li key={item.productId} className="flex flex-wrap items-center gap-4 border-b border-line pb-4 last:border-b-0 last:pb-0">
                <Link to={`/products/${item.productId}`} className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-cream">
                  <img src={item.imageUrl || '/hopely/laptop.svg'} alt="" className="h-14 w-14 object-contain" />
                </Link>
                <div className="min-w-[180px] flex-1">
                  <Link to={`/products/${item.productId}`} className="font-medium hover:text-brand-700">{item.name}</Link>
                  <p className="mt-1 text-sm text-ok">Є в наявності</p>
                  <button type="button" className="mt-2 text-sm text-muted hover:text-brand-700" onClick={() => void update(item.productId, 0)}>Видалити</button>
                </div>
                <div className="flex items-center rounded-lg border border-line">
                  <button type="button" className="px-3 py-1" onClick={() => void update(item.productId, Math.max(0, item.quantity - 1))}>−</button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button type="button" className="px-3 py-1" onClick={() => void update(item.productId, Math.min(item.stock, item.quantity + 1))}>+</button>
                </div>
                <div className="text-right">
                  {item.oldPrice ? <p className="text-sm text-muted line-through">{formatMoney(item.oldPrice * item.quantity)}</p> : null}
                  <p className="text-lg font-bold text-brand-700">{formatMoney(item.lineTotal)}</p>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="rounded-2xl bg-white p-4 shadow-[0_4px_16px_rgba(36,37,31,0.06)]"
            onSubmit={(event) => {
              event.preventDefault()
              setCodeNote(code.trim() ? 'Промокод не діє на це замовлення.' : 'Введіть промокод.')
            }}
          >
            <p className="font-semibold">Маєте промокод?</p>
            <div className="mt-3 flex gap-2">
              <input className="h-11 flex-1 rounded-lg border border-line px-3" placeholder="Введіть промокод" value={code} onChange={(event) => setCode(event.target.value)} />
              <button type="submit" className="rounded-lg bg-brand-50 px-4 text-sm font-semibold text-brand-700">Застосувати</button>
            </div>
            {codeNote ? <p className="mt-2 text-sm text-muted">{codeNote}</p> : null}
          </form>
        </div>
        <aside className="rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(36,37,31,0.06)]">
          <h2 className="text-lg font-bold">Разом</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Товари на суму</dt><dd>{formatMoney(goods)}</dd></div>
            {discount > 0 ? <div className="flex justify-between text-ok"><dt>Знижка</dt><dd>−{formatMoney(discount)}</dd></div> : null}
            <div className="flex justify-between text-ok"><dt>Доставка</dt><dd>{(cart?.total ?? 0) >= 1500 ? 'Безкоштовно' : 'за тарифом'}</dd></div>
          </dl>
          <p className="mt-4 flex items-end justify-between"><span>До сплати</span><span className="text-2xl font-bold">{formatMoney(cart?.total ?? 0)}</span></p>
          <Link to="/checkout" className="mt-4 block rounded-lg bg-brand-700 py-3 text-center text-sm font-semibold text-white">Оформити замовлення</Link>
          <p className="mt-3 text-xs text-muted">Натискаючи «Оформити замовлення», ви погоджуєтесь з умовами використання Hopely.</p>
        </aside>
      </div>
      <h2 className="mt-10 text-2xl font-bold">Вам також може сподобатись</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {also.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}
      </ul>
    </section>
  )
}
