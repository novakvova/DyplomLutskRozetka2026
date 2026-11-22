import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../../api'
import { Button, ErrorText, Field, TextArea } from '../../components/Field'
import { formatMoney } from '../../lib/format'
import type { AdminProduct, Category, Characteristic, Product } from '../../types'

type Draft = {
  id: number | null
  name: string
  shortDescription: string
  fullDescription: string
  price: string
  stock: string
  categoryId: string
  manufacturerUrl: string
  imageUrls: string
  characteristics: Characteristic[]
}

const emptyDraft: Draft = {
  id: null,
  name: '',
  shortDescription: '',
  fullDescription: '',
  price: '',
  stock: '',
  categoryId: '',
  manufacturerUrl: '',
  imageUrls: '',
  characteristics: [{ name: '', value: '' }],
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([api<Product[]>('/api/products'), api<Category[]>('/api/categories')])
      .then(([nextProducts, nextCategories]) => {
        setProducts(nextProducts)
        setCategories(nextCategories)
        setDraft((current) => current.categoryId ? current : { ...current, categoryId: nextCategories[0] ? String(nextCategories[0].id) : '' })
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити товари.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function edit(product: Product) {
    setError('')
    try {
      const details = await api<AdminProduct>(`/api/admin/products/${product.id}`)
      setDraft({
        id: details.id,
        name: details.name,
        shortDescription: details.shortDescription,
        fullDescription: details.fullDescription,
        price: String(details.price),
        stock: String(details.stock),
        categoryId: String(details.categoryId),
        manufacturerUrl: details.manufacturerUrl ?? '',
        imageUrls: details.imageUrls.join('\n'),
        characteristics: details.characteristics.length > 0 ? details.characteristics : [{ name: '', value: '' }],
      })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося відкрити товар.')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const price = Number(draft.price.replace(',', '.'))
    const stock = Number(draft.stock)
    if (!Number.isFinite(price) || !Number.isInteger(stock)) {
      setError('Ціна і залишок мають бути числами.')
      return
    }
    if (!draft.categoryId) {
      setError('Спочатку додайте категорію.')
      return
    }

    setBusy(true)
    setError('')
    const body = JSON.stringify({
      name: draft.name,
      shortDescription: draft.shortDescription,
      fullDescription: draft.fullDescription,
      price,
      stock,
      categoryId: Number(draft.categoryId),
      manufacturerUrl: draft.manufacturerUrl || null,
      imageUrls: draft.imageUrls.split('\n').map((line) => line.trim()).filter(Boolean),
      characteristics: draft.characteristics.filter((item) => item.name.trim() && item.value.trim()),
    })
    try {
      if (draft.id === null)
        await api('/api/admin/products', { method: 'POST', body })
      else
        await api(`/api/admin/products/${draft.id}`, { method: 'PUT', body })
      setDraft({ ...emptyDraft, categoryId: draft.categoryId })
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зберегти товар.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File) {
    setError('')
    const body = new FormData()
    body.set('file', file)
    try {
      const uploaded = await api<{ url: string }>('/api/admin/uploads', { method: 'POST', body })
      setDraft((current) => ({
        ...current,
        imageUrls: current.imageUrls.trim() ? `${current.imageUrls.trim()}\n${uploaded.url}` : uploaded.url,
      }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити фото.')
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Видалити «${product.name}»? Відгуки й позиції в кошиках зникнуть. Товар із незавершеного замовлення видалити не можна.`))
      return
    setError('')
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      if (draft.id === product.id)
        setDraft({ ...emptyDraft, categoryId: draft.categoryId })
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося видалити товар.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
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
                  <p className="text-stone-500">{product.categoryName}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatMoney(product.price)}</td>
                <td className="px-3 py-2">{product.stock}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button type="button" className="px-2 text-brand-800 hover:underline" onClick={() => void edit(product)}>Змінити</button>
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
        <label className="block text-sm font-medium text-stone-700">
          Категорія
          <select className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <TextArea label="Короткий опис" name="shortDescription" required rows={3} value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} />
        <TextArea label="Повний опис" name="fullDescription" rows={4} value={draft.fullDescription} onChange={(event) => setDraft({ ...draft, fullDescription: event.target.value })} />
        <Field label="Сайт виробника" name="manufacturerUrl" value={draft.manufacturerUrl} onChange={(event) => setDraft({ ...draft, manufacturerUrl: event.target.value })} />
        <Field label="Ціна, грн" name="price" inputMode="decimal" required value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
        <Field label="На складі" name="stock" inputMode="numeric" required value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
        <TextArea label="Фото, по одному посиланню в рядку" name="imageUrls" rows={3} value={draft.imageUrls} onChange={(event) => setDraft({ ...draft, imageUrls: event.target.value })} />
        <label className="block text-sm text-stone-700">
          Завантажити фото
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file)
                void upload(file)
              event.target.value = ''
            }}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Характеристики</p>
          {draft.characteristics.map((item, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <input className="rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="Назва" value={item.name} onChange={(event) => {
                const characteristics = draft.characteristics.slice()
                characteristics[index] = { ...item, name: event.target.value }
                setDraft({ ...draft, characteristics })
              }} />
              <input className="rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="Значення" value={item.value} onChange={(event) => {
                const characteristics = draft.characteristics.slice()
                characteristics[index] = { ...item, value: event.target.value }
                setDraft({ ...draft, characteristics })
              }} />
            </div>
          ))}
          <button type="button" className="text-sm text-brand-800 hover:underline" onClick={() => setDraft({ ...draft, characteristics: [...draft.characteristics, { name: '', value: '' }] })}>
            Ще характеристика
          </button>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{draft.id === null ? 'Додати' : 'Зберегти'}</Button>
          {draft.id !== null ? (
            <button type="button" className="rounded-lg px-3 text-sm text-stone-700 hover:bg-stone-100" onClick={() => setDraft({ ...emptyDraft, categoryId: draft.categoryId })}>Скасувати</button>
          ) : null}
        </div>
        <ErrorText>{error}</ErrorText>
      </form>
    </div>
  )
}
