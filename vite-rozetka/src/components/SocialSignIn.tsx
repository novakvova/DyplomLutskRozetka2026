import { useEffect, useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { api } from '../api'

export function SocialSignIn({ onGoogle }: { onGoogle: (idToken: string) => void | Promise<void> }) {
  const [googleClientId, setGoogleClientId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ googleClientId: string }>('/api/auth/providers')
      .then((providers) => setGoogleClientId(providers.googleClientId))
      .catch(() => setError('Не вдалося дізнатися налаштування входу.'))
  }, [])

  return (
    <div className="space-y-3">
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) void Promise.resolve(onGoogle(response.credential)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Вхід не вдався.'))
              }}
              onError={() => setError('Google не підтвердив вхід.')}
              text="continue_with"
              shape="rectangular"
              width="320"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        <button type="button" className="w-full rounded-lg border border-line py-2.5 text-sm" onClick={() => setError('Google ще не налаштовано на сервері.')}>
          Продовжити через Google
        </button>
      )}
      <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-sm" onClick={() => setError('Вхід через Apple недоступний: немає Apple Developer Program.')}>
        Продовжити через Apple
      </button>
      {error && <p className="text-sm text-brand-700">{error}</p>}
    </div>
  )
}
