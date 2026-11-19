import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../../api'
import { Button, ErrorText, Field, TextArea } from '../../components/Field'
import { formatMoney } from '../../lib/format'
import type { Product } from '../../types'

type Draft = {
  id: number | null
  name: string
  shortDescription: string
  price: string
  stock: string
}

const emptyDraft: Draft = { id: null, name: '', shortDescription: '', price: '', stock: '' }

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    api<Product[]>('/api/products')
      .then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    const price = Number(draft.price.replace(',', '.'))
    const stock = Number(draft.stock)
    if (!Number.isFinite(price) || !Number.isInteger(stock)) {
      setError('Ціна і залишок мають бути числами.')
      return
    }

    setBusy(true)
    setError('')
    const body = JSON.stringify({
      name: draft.name,
      shortDescription: draft.shortDescription,
      price,
      stock,
    })
    try {
      if (draft.id === null)
        await api('/api/admin/products', { method: 'POST', body })
      else
        await api(`/api/admin/products/${draft.id}`, { method: 'PUT', body })
      setDraft(emptyDraft)
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зберегти товар.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Видалити «${product.name}»? Відгуки й позиції в кошиках зникнуть. Замовлення залишаться.`))
      return
    setError('')
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      if (draft.id === product.id)
        setDraft(emptyDraft)
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося видалити товар.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {loading ? <p className="p-4 text-stone-600">Завантаження…</p> : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Товар</th>
              <th className="px-3 py-2 font-medium">Ціна</th>
              <th className="px-3 py-2 font-medium">Склад</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-stone-100">
                <td className="px-3 py-2">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-stone-500">{product.shortDescription}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatMoney(product.price)}</td>
                <td className="px-3 py-2">{product.stock}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button type="button" className="px-2 text-brand-800 hover:underline" onClick={() => setDraft({
                    id: product.id,
                    name: product.name,
                    shortDescription: product.shortDescription,
                    price: String(product.price),
                    stock: String(product.stock),
                  })}>Змінити</button>
                  <button type="button" className="px-2 text-red-700 hover:underline" onClick={() => void remove(product)}>Видалити</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void save(event)}>
        <h2 className="text-lg font-semibold">{draft.id === null ? 'Новий товар' : `Товар №${draft.id}`}</h2>
        <Field label="Назва" name="name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <TextArea label="Короткий опис" name="shortDescription" required rows={4} value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} />
        <Field label="Ціна, грн" name="price" inputMode="decimal" required value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
        <Field label="На складі" name="stock" inputMode="numeric" required value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{draft.id === null ? 'Додати' : 'Зберегти'}</Button>
          {draft.id !== null ? (
            <button type="button" className="rounded-lg px-3 text-sm text-stone-700 hover:bg-stone-100" onClick={() => setDraft(emptyDraft)}>Скасувати</button>
          ) : null}
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    </div>
  )
}
