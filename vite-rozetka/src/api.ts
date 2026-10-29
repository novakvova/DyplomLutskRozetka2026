import { clearToken, getToken } from './auth/storage'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const base = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const anonymousAuth = path.startsWith('/api/auth/') && !path.endsWith('/logout')
  const token = anonymousAuth ? null : getToken()
  if (token)
    headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${base}${path}`, { ...options, headers })
  if (response.status === 204)
    return undefined as T

  const data = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken()
      window.dispatchEvent(new Event('rozetka:unauthorized'))
    }
    throw new ApiError(response.status, data.message ?? 'Сталася помилка')
  }

  return data as T
}
