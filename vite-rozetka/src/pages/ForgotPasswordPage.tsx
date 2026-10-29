import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Button, ErrorText, Field } from '../components/Field'
import type { MessageResponse } from '../types'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setResetUrl(null)
    try {
      const result = await api<MessageResponse>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(result.message)
      setResetUrl(result.resetUrl ?? null)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося підготувати відновлення.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Відновлення пароля</h1>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Електронна пошта" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <ErrorText>{error}</ErrorText>
        {message ? <p className="text-sm text-stone-700">{message}</p> : null}
        {resetUrl ? (
          <p className="rounded-lg bg-brand-50 p-3 text-sm">
            Локальний режим. <Link className="text-brand-800" to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}>Відкрити посилання для нового пароля</Link>
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>Надіслати посилання</Button>
      </form>
      <p className="text-sm"><Link className="text-brand-800" to="/login">Повернутися до входу</Link></p>
    </section>
  )
}
