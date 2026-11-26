import { useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { api } from '../api'

type Providers = {
  googleClientId: string
  appleClientId: string
}

type AppleResult = {
  authorization?: { id_token?: string }
  user?: { name?: { firstName?: string, lastName?: string } }
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: { clientId: string, scope: string, redirectURI: string, usePopup: boolean }) => void
        signIn: () => Promise<AppleResult>
      }
    }
  }
}

const googleFromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const appleFromEnv = import.meta.env.VITE_APPLE_CLIENT_ID ?? ''

function loadAppleScript() {
  if (window.AppleID)
    return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-apple-signin]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('apple')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/uk_UA/appleid.auth.js'
    script.async = true
    script.dataset.appleSignin = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('apple'))
    document.head.appendChild(script)
  })
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7C21.6 18.7 23 15.8 23 12.3z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.3A7.2 7.2 0 0 1 4.7 12c0-.8.1-1.6.4-2.3V6.6H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l3.8-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0A12 12 0 0 0 1.3 6.6l3.8 3.1C6.1 7 8.8 4.8 12 4.8z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c.7-1 1.2-2 1.6-3.1-4.1-1.6-3.9-5.9-3.9-6.4zM14.7 6.2c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.3z" />
    </svg>
  )
}

export function SocialSignIn({
  busy,
  onGoogle,
  onApple,
  onError,
}: {
  busy: boolean
  onGoogle: (idToken: string) => void
  onApple: (idToken: string, firstName?: string, lastName?: string) => void
  onError: (message: string) => void
}) {
  const [providers, setProviders] = useState<Providers>({ googleClientId: '', appleClientId: '' })

  useEffect(() => {
    api<Providers>('/api/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ googleClientId: '', appleClientId: '' }))
  }, [])

  const googleClientId = googleFromEnv || providers.googleClientId
  const appleClientId = appleFromEnv || providers.appleClientId

  async function startApple() {
    if (!appleClientId) {
      onError('Вхід через Apple ще не налаштований. Додайте Apple:ClientId у конфігурацію сервера.')
      return
    }
    try {
      await loadAppleScript()
      window.AppleID?.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      })
      const result = await window.AppleID?.auth.signIn()
      const idToken = result?.authorization?.id_token
      if (!idToken) {
        onError('Apple не повернув токен.')
        return
      }
      onApple(idToken, result?.user?.name?.firstName, result?.user?.name?.lastName)
    } catch {
      onError('Не вдалося увійти через Apple.')
    }
  }

  return (
    <div className="space-y-2">
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <div className="flex justify-center overflow-hidden rounded-xl">
            <GoogleLogin
              onSuccess={(response) => {
                if (!response.credential) {
                  onError('Google не повернув токен.')
                  return
                }
                onGoogle(response.credential)
              }}
              onError={() => onError('Не вдалося увійти через Google.')}
              useOneTap={false}
              text="signin_with"
              width="320"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
          onClick={() => onError('Вхід через Google ще не налаштований. Додайте Google:ClientId у конфігурацію сервера.')}
        >
          <GoogleMark />
          Увійти через Google
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        onClick={() => void startApple()}
      >
        <AppleMark />
        Увійти через Apple
      </button>
    </div>
  )
}
