import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function GoogleSignIn({ onToken, onError }: { onToken: (idToken: string) => void, onError: (message: string) => void }) {
  if (!clientId) {
    return (
      <p className="text-sm text-stone-500">
        Вхід через Google увімкнеться, коли в проєкті з’явиться Client ID.
      </p>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={(response) => {
          if (!response.credential) {
            onError('Google не повернув токен.')
            return
          }
          onToken(response.credential)
        }}
        onError={() => onError('Не вдалося увійти через Google.')}
        useOneTap={false}
        text="signin_with"
      />
    </GoogleOAuthProvider>
  )
}
