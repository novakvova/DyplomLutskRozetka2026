import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Button, ErrorText, Field } from '../components/Field'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('Паролі не збігаються.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      })
      navigate('/login')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося змінити пароль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Новий пароль</h1>
      {!token ? <p className="text-sm text-red-700">У посиланні немає токена відновлення.</p> : null}
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Новий пароль" name="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <Field label="Повторіть пароль" name="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy || !token}>Зберегти пароль</Button>
      </form>
      <p className="text-sm"><Link className="text-brand-800" to="/login">До входу</Link></p>
    </section>
  )
}
