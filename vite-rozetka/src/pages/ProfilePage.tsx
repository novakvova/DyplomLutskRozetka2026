import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorText, Field } from '../components/Field'
import type { User } from '../types'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState({ email: '', firstName: '', lastName: '', phone: '' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user)
      return
    setProfile({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
    })
  }, [user])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api<User>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || null,
        }),
      })
      await refreshUser()
      setMessage('Профіль збережено.')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося зберегти профіль.')
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: user?.hasPassword ? currentPassword : null,
          newPassword,
        }),
      })
      await refreshUser()
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Пароль оновлено.')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не вдалося змінити пароль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid max-w-3xl gap-4 lg:grid-cols-2">
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void saveProfile(event)}>
        <h1 className="text-xl font-semibold">Профіль</h1>
        <Field label="Ім’я" name="firstName" required value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} />
        <Field label="Прізвище" name="lastName" required value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} />
        <Field label="Електронна пошта" name="email" type="email" required value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
        <Field label="Телефон" name="phone" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
        <Button type="submit" disabled={busy}>Зберегти</Button>
      </form>
      <form className="space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={(event) => void savePassword(event)}>
        <h2 className="text-xl font-semibold">{user?.hasPassword ? 'Зміна пароля' : 'Задати пароль'}</h2>
        {user?.hasPassword ? (
          <Field label="Поточний пароль" name="currentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        ) : (
          <p className="text-sm text-stone-600">Цей акаунт створено через Google. Можна задати пароль і входити також поштою.</p>
        )}
        <Field label="Новий пароль" name="newPassword" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <Button type="submit" disabled={busy}>Оновити пароль</Button>
      </form>
      <div className="lg:col-span-2">
        <ErrorText>{error}</ErrorText>
        {message ? <p className="text-sm text-brand-800">{message}</p> : null}
      </div>
    </section>
  )
}
