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

  const monthly = Math.ceil(product.price / 24)
  return (
    <article>
      <p className="text-sm text-muted">
        <Link to="/" className="hover:text-brand-700">Головна</Link>
        <span> · </span>
        <Link to={`/catalog?category=${product.categoryId}`} className="hover:text-brand-700">{product.categoryName}</Link>
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        {product.images.length > 0 ? (
          <div className="relative">
            {product.oldPrice && product.oldPrice > product.price ? (
              <span className="absolute left-3 top-3 z-10 rounded bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">−{Math.round((1 - product.price / product.oldPrice) * 100)}%</span>
            ) : null}
            <img src={product.images[photo] ?? product.images[0]} alt={product.name} className="h-80 w-full rounded-2xl bg-cream object-contain p-6" />
            {product.images.length > 1 ? (
              <div className="mt-2 flex gap-2">
                {product.images.map((image, index) => (
                  <button key={image} type="button" className={`h-16 w-16 overflow-hidden rounded-lg border bg-cream ${index === photo ? 'border-brand-700' : 'border-line'}`} onClick={() => setPhoto(index)}>
                    <img src={image} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div>
        <h1 className="text-2xl font-bold leading-8">{product.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {product.averageRating !== null ? `${product.averageRating.toFixed(1)} · ` : ''}
          {product.reviewCount} відгуків
        </p>
        <div className="mt-4">
          {product.oldPrice ? <p className="text-sm text-muted line-through">{formatMoney(product.oldPrice)}</p> : null}
          <p className="text-3xl font-bold text-brand-700">{formatMoney(product.price)}</p>
          <p className="text-sm text-muted">або від {formatMoney(monthly)}/міс.</p>
        </div>
        <p className={`mt-2 text-sm font-medium ${product.stock > 0 ? 'text-ok' : 'text-muted'}`}>{product.stock > 0 ? 'Є в наявності' : 'Немає в наявності'}</p>
        <label className="mt-3 block text-sm">
          Кількість
          <input className="mt-1 w-24 rounded-lg border border-line px-3 py-2" type="number" min={1} max={Math.min(20, product.stock || 1)} value={quantity} disabled={product.stock === 0} onChange={(event) => setQuantity(Number(event.target.value))} />
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" disabled={busy || product.stock === 0} onClick={() => void saveCart()}>
            {product.cartQuantity > 0 ? 'Оновити кошик' : 'Купити'}
          </Button>
          <button type="button" className="rounded-lg border border-line px-4 py-2 hover:bg-cream disabled:opacity-50" disabled={busy} onClick={() => void toggleFavorite()}>
            {product.isFavorite ? 'У обраному' : 'В обране'}
          </button>
          <button type="button" className="rounded-lg border border-line px-4 py-2 hover:bg-cream" onClick={() => setCompared(toggleCompare(product.id))}>
            {compared.includes(product.id) ? 'У порівнянні' : 'Порівняти'}
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>Нова пошта — відділення</li>
          <li>Офіційна гарантія</li>
          <li>14 днів на повернення</li>
        </ul>
        <div className="mt-3"><ErrorText>{error}</ErrorText></div>
      </div>
      </div>
      <div className="mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">Усе про товар</h2>
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
    </article>
  )
}
