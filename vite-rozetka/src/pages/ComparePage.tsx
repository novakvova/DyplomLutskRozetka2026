import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { ErrorText } from '../components/Field'
import { compareIds, toggleCompare } from '../lib/browse'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export function ComparePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function load() {
    const ids = compareIds()
    if (ids.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    api<Product[]>(`/api/products?ids=${ids.join(',')}`)
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити порівняння.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Порівняння</h1>
      <p className="text-sm text-stone-600">Можна зіставити до чотирьох товарів. Список зберігається в цьому браузері.</p>
      <ErrorText>{error}</ErrorText>
      {loading ? <p className="text-stone-600">Завантаження…</p> : null}
      {!loading && products.length === 0 ? <p className="text-stone-600">Ще нічого не додано до порівняння.</p> : null}
      {products.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 font-medium text-stone-500"> </th>
                {products.map((product) => (
                  <th key={product.id} className="px-3 py-2 font-medium">
                    <Link className="hover:text-brand-800" to={`/products/${product.id}`}>{product.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-stone-100">
                <th className="px-3 py-2 font-medium text-stone-500">Фото</th>
                {products.map((product) => (
                  <td key={product.id} className="px-3 py-2">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-16 w-16 object-contain" /> : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-stone-100">
                <th className="px-3 py-2 font-medium text-stone-500">Ціна</th>
                {products.map((product) => <td key={product.id} className="px-3 py-2">{formatMoney(product.price)}</td>)}
              </tr>
              <tr className="border-t border-stone-100">
                <th className="px-3 py-2 font-medium text-stone-500">Категорія</th>
                {products.map((product) => <td key={product.id} className="px-3 py-2">{product.categoryName}</td>)}
              </tr>
              <tr className="border-t border-stone-100">
                <th className="px-3 py-2 font-medium text-stone-500">На складі</th>
                {products.map((product) => <td key={product.id} className="px-3 py-2">{product.stock}</td>)}
              </tr>
              <tr className="border-t border-stone-100">
                <th className="px-3 py-2" />
                {products.map((product) => (
                  <td key={product.id} className="px-3 py-2">
                    <button
                      type="button"
                      className="text-red-700 hover:underline"
                      onClick={() => {
                        toggleCompare(product.id)
                        load()
                      }}
                    >
                      Прибрати
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
