import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ErrorText } from '../components/Field'
import { formatMoney } from '../lib/format'
import type { Favorite } from '../types'

export function FavoritesPage() {
  const [items, setItems] = useState<Favorite[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    api<Favorite[]>('/api/favorites')
      .then(setItems)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити обране.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function remove(productId: number) {
    setError('')
    try {
      await api(`/api/favorites/${productId}`, { method: 'DELETE' })
      setItems((current) => current.filter((item) => item.productId !== productId))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося прибрати товар.')
    }
  }

  if (loading)
    return <p className="text-stone-600">Завантаження…</p>

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Обране</h1>
      <ErrorText>{error}</ErrorText>
      {items.length === 0 ? <p className="text-stone-600">В обраному ще нічого немає.</p> : null}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div>
              <Link className="font-medium hover:text-brand-800" to={`/products/${item.productId}`}>{item.name}</Link>
              <p className="text-sm text-stone-600">{item.shortDescription}</p>
              <p className="mt-1 font-medium">{formatMoney(item.price)}</p>
            </div>
            <button type="button" className="text-sm text-red-700" onClick={() => void remove(item.productId)}>Прибрати</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
