import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, TextArea } from '../components/Field'
import { compareIds, rememberProduct, toggleCompare } from '../lib/browse'
import { formatDate, formatMoney } from '../lib/format'
import type { ProductDetails } from '../types'

export function ProductPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState(0)
  const [compared, setCompared] = useState<number[]>(() => compareIds())

  function load(initial: boolean) {
    if (initial)
      setLoading(true)
    setError('')
    api<ProductDetails>(`/api/products/${id}`)
      .then((details) => {
        setProduct(details)
        if (initial)
          setQuantity(details.cartQuantity > 0 ? details.cartQuantity : 1)
        if (details.myReview) {
          setRating(details.myReview.rating)
          setText(details.myReview.text)
        }
        rememberProduct(details.id)
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Товар не знайдено.'))
      .finally(() => {
        if (initial)
          setLoading(false)
      })
  }

  useEffect(() => {
    load(true)
    // Повторне завантаження після входу має підтягнути кошик і відгук цього користувача.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  async function saveCart() {
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}` } })
      return
    }
    setBusy(true)
    setError('')
    try {
      await api('/api/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId: Number(id), quantity }),
      })
      load(false)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося оновити кошик.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFavorite() {
    if (!user || !product) {
      navigate('/login', { state: { from: `/products/${id}` } })
      return
    }
    setBusy(true)
    setError('')
    try {
      if (product.isFavorite)
        await api(`/api/favorites/${product.id}`, { method: 'DELETE' })
      else
        await api('/api/favorites', { method: 'POST', body: JSON.stringify({ productId: product.id }) })
      load(false)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося оновити обране.')
    } finally {
      setBusy(false)
    }
  }

  async function saveReview() {
    if (!user || !product) {
      navigate('/login', { state: { from: `/products/${id}` } })
      return
    }
    setBusy(true)
    setError('')
    try {
      if (product.myReview)
        await api(`/api/reviews/${product.myReview.id}`, { method: 'PUT', body: JSON.stringify({ rating, text }) })
      else
        await api(`/api/products/${product.id}/reviews`, { method: 'POST', body: JSON.stringify({ rating, text }) })
      load(false)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зберегти відгук.')
    } finally {
      setBusy(false)
    }
  }

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>
  if (!product)
    return <ErrorText>{error || 'Товар не знайдено.'}</ErrorText>

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <Link to="/" className="text-sm text-brand-700">До каталогу</Link>
        <p className="mt-2 text-sm text-stone-500">{product.categoryName}</p>
        <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
        {product.images.length > 0 ? (
          <div className="mt-4">
            <img src={product.images[photo] ?? product.images[0]} alt={product.name} className="h-72 w-full rounded-2xl bg-cream object-contain p-4" />
            {product.images.length > 1 ? (
              <div className="mt-2 flex gap-2">
                {product.images.map((image, index) => (
                  <button key={image} type="button" className={`h-14 w-14 overflow-hidden rounded-lg border bg-cream ${index === photo ? 'border-brand-700' : 'border-stone-200'}`} onClick={() => setPhoto(index)}>
                    <img src={image} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="mt-3 max-w-2xl text-stone-700">{product.shortDescription}</p>
        {product.fullDescription ? <p className="mt-3 max-w-2xl whitespace-pre-wrap text-stone-700">{product.fullDescription}</p> : null}
        {product.characteristics.length > 0 ? (
          <table className="mt-4 w-full max-w-2xl text-sm">
            <tbody>
              {product.characteristics.map((item) => (
                <tr key={item.name} className="border-b border-stone-200">
                  <th className="py-2 pr-3 text-left font-medium text-stone-500">{item.name}</th>
                  <td className="py-2">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {product.manufacturerUrl ? (
          <a className="mt-3 inline-block text-sm text-brand-700 hover:underline" href={product.manufacturerUrl} target="_blank" rel="noreferrer">
            Сайт виробника
          </a>
        ) : null}
        <p className="mt-4 text-sm text-stone-500">
          {product.reviewCount > 0 && product.averageRating !== null
            ? `${product.averageRating.toFixed(1)} з 5 · ${product.reviewCount} відгуків`
            : 'Відгуків ще немає'}
        </p>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Відгуки</h2>
          <ul className="mt-3 space-y-3">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-500">{review.authorName} · {review.rating} з 5 · {formatDate(review.createdAt)}</p>
                <p className="mt-1">{review.text}</p>
              </li>
            ))}
          </ul>
          {product.myReview || product.canReview ? (
            <form className="mt-4 max-w-xl space-y-3" onSubmit={(event) => { event.preventDefault(); void saveReview() }}>
              <label className="block text-sm font-medium text-stone-700">
                Оцінка
                <select className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <TextArea label="Відгук" name="review" rows={4} value={text} onChange={(event) => setText(event.target.value)} required minLength={10} />
              <Button type="submit" disabled={busy}>{product.myReview ? 'Оновити відгук' : 'Надіслати відгук'}</Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-stone-600">Відгук можна залишити після покупки цього товару.</p>
          )}
        </section>
      </div>
      <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-3xl font-bold text-brand-700">{formatMoney(product.price)}</p>
        <p className={`mt-1 text-sm font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-stone-400'}`}>{product.stock > 0 ? `Є в наявності · ${product.stock} шт.` : 'Немає в наявності'}</p>
        <label className="mt-4 block text-sm font-medium text-stone-700">
          Кількість
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            type="number"
            min={1}
            max={Math.min(20, product.stock || 1)}
            value={quantity}
            disabled={product.stock === 0}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" disabled={busy || product.stock === 0} onClick={() => void saveCart()}>
            {product.cartQuantity > 0 ? 'Оновити кошик' : 'Додати в кошик'}
          </Button>
          <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-stone-800 hover:bg-stone-50 disabled:opacity-50" disabled={busy} onClick={() => void toggleFavorite()}>
            {product.isFavorite ? 'Прибрати з обраного' : 'В обране'}
          </button>
          <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-stone-800 hover:bg-stone-50" onClick={() => setCompared(toggleCompare(product.id))}>
            {compared.includes(product.id) ? 'У порівнянні' : 'Порівняти'}
          </button>
        </div>
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      </aside>
    </article>
  )
}
