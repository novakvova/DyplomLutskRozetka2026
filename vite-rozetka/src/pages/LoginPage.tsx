import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AuthPanel } from '../components/AuthPanel'
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
    <AuthPanel title="Вхід" alternateTo="/register" alternateLabel="Зареєструватися">
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Електронна пошта" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Field label="Пароль" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <p className="text-sm"><Link className="text-brand-700" to="/forgot-password">Забули пароль?</Link></p>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={busy}>Увійти</Button>
      </form>
      <div className="mt-4">
        <GoogleSignIn onToken={(idToken) => void onGoogle(idToken)} onError={setError} />
      </div>
      <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-stone-600">
        Демо-покупець: buyer@rozetka.test, пароль Buyer12345. Адмін: admin@rozetka.test, пароль Admin12345.
      </p>
    </AuthPanel>
  )
}
