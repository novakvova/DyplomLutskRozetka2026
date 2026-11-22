import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ErrorText } from '../components/Field'
import { recentIds } from '../lib/browse'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export function RecentPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = recentIds()
    if (ids.length === 0) {
      setLoading(false)
      return
    }
    api<Product[]>(`/api/products?ids=${ids.join(',')}`)
      .then((items) => {
        const order = new Map(ids.map((id, index) => [id, index]))
        setProducts([...items].sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)))
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити переглянуті товари.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Переглянуті</h1>
      <p className="text-sm text-stone-600">Останні товари, які ви відкривали в цьому браузері.</p>
      <ErrorText>{error}</ErrorText>
      {loading ? <p className="text-stone-600">Завантаження…</p> : null}
      {!loading && products.length === 0 ? <p className="text-stone-600">Ви ще не відкривали товари.</p> : null}
      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-14 w-14 rounded-lg bg-stone-100 object-contain" /> : null}
            <div>
              <Link className="font-medium hover:text-brand-800" to={`/products/${product.id}`}>{product.name}</Link>
              <p className="text-sm text-stone-600">{product.categoryName}</p>
              <p className="mt-1 font-medium">{formatMoney(product.price)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
