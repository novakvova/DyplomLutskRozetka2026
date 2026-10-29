import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, Field } from '../components/Field'
import { GoogleSignIn } from '../components/GoogleSignIn'

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user)
    return <Navigate to={from} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося увійти.')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle(idToken: string) {
    setBusy(true)
    setError('')
    try {
      await loginWithGoogle(idToken)
      navigate(from, { replace: true })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося увійти через Google.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Вхід</h1>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Електронна пошта" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Field label="Пароль" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>Увійти</Button>
      </form>
      <GoogleSignIn onToken={(idToken) => void onGoogle(idToken)} onError={setError} />
      <p className="text-sm"><Link className="text-brand-800" to="/forgot-password">Забули пароль?</Link></p>
      <p className="text-sm">Немає акаунта? <Link className="text-brand-800" to="/register">Зареєструватися</Link></p>
      <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-600">
        Демо-покупець: buyer@rozetka.test, пароль Buyer12345. Заблокований акаунт: blocked@rozetka.test, пароль Blocked12345.
      </p>
    </section>
  )
}
