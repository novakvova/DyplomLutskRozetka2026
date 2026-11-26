import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api'
import type { AuthResponse, User } from '../types'
import { clearToken, getToken, setToken } from './storage'

type RegisterInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function storeSession(result: AuthResponse, setUser: (user: User) => void) {
  setToken(result.accessToken)
  setUser(result.user)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    setUser(await api<User>('/api/profile'))
  }, [])

  useEffect(() => {
    refreshUser()
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [refreshUser])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('rozetka:unauthorized', onUnauthorized)
    return () => window.removeEventListener('rozetka:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    storeSession(result, setUser)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    storeSession(result, setUser)
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await api<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    storeSession(result, setUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      clearToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout, refreshUser }),
    [user, loading, login, register, loginWithGoogle, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value)
    throw new Error('useAuth має бути всередині AuthProvider')
  return value
}
