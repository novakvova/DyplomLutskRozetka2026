import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, Field } from '../components/Field'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', firstName: '', lastName: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.password !== form.confirm) {
      setError('Паролі не збігаються.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      })
      navigate('/')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зареєструватися.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Реєстрація</h1>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Ім’я" name="firstName" required value={form.firstName} onChange={(event) => update('firstName', event.target.value)} />
        <Field label="Прізвище" name="lastName" required value={form.lastName} onChange={(event) => update('lastName', event.target.value)} />
        <Field label="Електронна пошта" name="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => update('email', event.target.value)} />
        <Field label="Телефон" name="phone" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
        <Field label="Пароль" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={(event) => update('password', event.target.value)} />
        <Field label="Повторіть пароль" name="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(event) => update('confirm', event.target.value)} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>Створити акаунт</Button>
      </form>
      <p className="text-sm">Вже є акаунт? <Link className="text-brand-800" to="/login">Увійти</Link></p>
    </section>
  )
}
