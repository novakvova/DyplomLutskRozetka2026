import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AuthPanel } from '../components/AuthPanel'
import { Button, ErrorText, Field } from '../components/Field'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', firstName: '', lastName: '', phone: '' })
  const [consent, setConsent] = useState(false)
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
    if (!consent) {
      setError('Потрібна згода на обробку персональних даних.')
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
    <AuthPanel title="Реєстрація" alternateTo="/login" alternateLabel="Увійти">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ім’я" name="firstName" required value={form.firstName} onChange={(event) => update('firstName', event.target.value)} />
          <Field label="Прізвище" name="lastName" required value={form.lastName} onChange={(event) => update('lastName', event.target.value)} />
        </div>
        <Field label="Електронна пошта" name="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => update('email', event.target.value)} />
        <Field label="Номер телефону" name="phone" autoComplete="tel" placeholder="+380" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
        <Field label="Пароль" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={(event) => update('password', event.target.value)} />
        <Field label="Повторіть пароль" name="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(event) => update('confirm', event.target.value)} />
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" className="mt-1 accent-brand-700" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          Даю згоду на обробку персональних даних
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={busy}>Зареєструватись</Button>
      </form>
    </AuthPanel>
  )
}
