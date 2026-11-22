import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../../api'
import { Button, ErrorText, Field } from '../../components/Field'
import type { Category } from '../../types'

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    api<Category[]>('/api/categories')
      .then(setCategories)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Не вдалося завантажити категорії.'))
  }

  useEffect(() => {
    load()
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editingId === null)
        await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name }) })
      else
        await api(`/api/admin/categories/${editingId}`, { method: 'PUT', body: JSON.stringify({ name }) })
      setName('')
      setEditingId(null)
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зберегти категорію.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Видалити категорію «${category.name}»? Якщо в ній є товари, видалення не пройде.`))
      return
    setError('')
    try {
      await api(`/api/admin/categories/${category.id}`, { method: 'DELETE' })
      load()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося видалити категорію.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span>{category.name}</span>
            <span>
              <button type="button" className="px-2 text-sm text-brand-800 hover:underline" onClick={() => { setEditingId(category.id); setName(category.name) }}>Змінити</button>
              <button type="button" className="px-2 text-sm text-red-700 hover:underline" onClick={() => void remove(category)}>Видалити</button>
            </span>
          </li>
        ))}
        {categories.length === 0 ? <li className="px-4 py-3 text-stone-600">Категорій ще немає.</li> : null}
      </ul>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void save(event)}>
        <h2 className="text-lg font-semibold">{editingId === null ? 'Нова категорія' : 'Змінити категорію'}</h2>
        <Field label="Назва" name="name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={busy}>{editingId === null ? 'Додати' : 'Зберегти'}</Button>
        <ErrorText>{error}</ErrorText>
      </form>
    </div>
  )
}
