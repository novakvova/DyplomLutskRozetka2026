import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'
import { ErrorText } from '../components/Field'
import { GoogleSignIn } from '../components/GoogleSignIn'

type Step = 'phone' | 'code' | 'email'

const RESEND_SECONDS = 110

const help = [
  'перевірте правильність введення номера телефону;',
  'переконайтеся, що є з’єднання з інтернетом;',
  'перевірте, можливо ви випадково обмежили повідомлення від PULS у Telegram;',
  'перевірте пам’ять у телефоні, спробуйте видалити кілька діалогів, щоб переконатися у наявності вільного місця;',
  'перезавантажте телефон.',
]

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [showHelp, setShowHelp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (step !== 'code' || secondsLeft <= 0)
      return
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [step, secondsLeft])

  if (user)
    return <Navigate to={from} replace />

  function close() {
    navigate(from === '/login' ? '/' : from)
  }

  function openCode(nextPhone: string) {
    setSentTo(nextPhone)
    setCode(['', '', '', '', '', ''])
    setSecondsLeft(RESEND_SECONDS)
    setShowHelp(false)
    setError('')
    setStep('code')
  }

  function onPhone(event: FormEvent) {
    event.preventDefault()
    const next = canonicalPhone(phone)
    if (!next) {
      setError('Введіть номер у форматі +380 та 9 цифр.')
      return
    }
    // shortcut: SMS не надсилається, код ніде не перевіряється. Прибрати, коли з’явиться провайдер.
    openCode(next)
  }

  function onConfirmCode(event: FormEvent) {
    event.preventDefault()
    if (code.join('').length < 6) {
      setError('Введіть код із 6 цифр.')
      return
    }
    setError('Код із SMS ще не підключений. Увійдіть через електронну пошту.')
  }

  async function onEmail(event: FormEvent) {
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

  function onDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)
    if (digit && index < 5)
      document.getElementById(`otp-${index + 1}`)?.focus()
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#e8eef5]/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="w-full max-w-[420px] rounded-[20px] bg-[#f1f5f9] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.12)]" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e2e8f0] pb-4">
          <h1 id="login-title" className="text-[28px] font-semibold leading-none text-slate-900">Вхід</h1>
          <button type="button" className="text-2xl leading-none text-slate-500 hover:text-slate-800" aria-label="Закрити" onClick={close}>×</button>
        </div>

        {step === 'phone' && (
          <form className="space-y-4" onSubmit={onPhone}>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-500">Номер телефону</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-[#d5dee8] bg-white px-3 py-3 text-slate-900 outline-none focus:border-[#2563eb]"
              />
            </label>
            <Primary type="submit">Продовжити</Primary>
            <p className="text-center text-[11px] leading-4 text-slate-400">
              Продовжуючи, ви погоджуєтесь, що надаєте згоду до обов’язкового запису PULS та надаєте згоду на обробку персональних даних
            </p>
            <Divider />
            <ErrorText>{error}</ErrorText>
            <GoogleSignIn onToken={(idToken) => void onGoogle(idToken)} onError={setError} />
            <Outline type="button" onClick={() => setError('Вхід через Apple є в макеті, у проєкті його ще немає.')}>
              <AppleMark /> Продовжити через Apple
            </Outline>
            <Outline type="button" onClick={() => { setError(''); setStep('email') }}>
              <MailMark /> Увійти через електронну пошту
            </Outline>
          </form>
        )}

        {step === 'code' && (
          <form className="space-y-4" onSubmit={onConfirmCode}>
            <div>
              <p className="text-sm font-medium text-slate-800">Код підтвердження</p>
              <p className="mt-1 text-sm text-slate-500">На {sentTo} був надісланий код підтвердження</p>
            </div>
            <div className="flex justify-between gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  aria-label={`Цифра ${index + 1}`}
                  onChange={(event) => onDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !code[index] && index > 0)
                      document.getElementById(`otp-${index - 1}`)?.focus()
                  }}
                  className="h-12 w-full rounded-lg border border-[#d5dee8] bg-white text-center text-lg text-slate-900 outline-none focus:border-[#2563eb]"
                />
              ))}
            </div>
            <button type="button" className="text-sm text-slate-700" onClick={() => { setShowHelp((value) => !value); setError('') }}>
              Не отримали код підтвердження?
            </button>
            {showHelp && (
              <div className="rounded-xl bg-[#e8eef5] p-3 text-sm text-slate-600">
                <p>Якщо протягом 60 секунд ви не отримали код, виконайте наступні дії:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {help.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <ErrorText>{error}</ErrorText>
            <Primary type="submit">Підтвердити</Primary>
            {showHelp ? (
              <button type="button" className="w-full text-center text-sm text-slate-500" onClick={() => openCode(sentTo)}>Відправити код повторно</button>
            ) : secondsLeft > 0 ? (
              <p className="text-center text-sm text-slate-500">Відправити код повторно: через {minutes}:{seconds}</p>
            ) : (
              <button type="button" className="w-full text-center text-sm text-slate-500" onClick={() => openCode(sentTo)}>Відправити код повторно</button>
            )}
            {!showHelp && (
              <button type="button" className="w-full text-center text-sm text-slate-600" onClick={() => { setError(''); setStep('phone') }}>Назад</button>
            )}
          </form>
        )}

        {step === 'email' && (
          <form className="space-y-4" onSubmit={(event) => void onEmail(event)}>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-500">Електронна пошта</span>
              <input name="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#d5dee8] bg-white px-3 py-3 text-slate-900 outline-none focus:border-[#2563eb]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-500">Пароль</span>
              <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#d5dee8] bg-white px-3 py-3 text-slate-900 outline-none focus:border-[#2563eb]" />
            </label>
            <ErrorText>{error}</ErrorText>
            <Primary type="submit" disabled={busy}>Увійти</Primary>
            <p className="text-center text-sm text-slate-600">
              <Link className="text-[#2563eb]" to="/forgot-password">Забули пароль?</Link>
            </p>
            <p className="text-center text-sm text-slate-600">
              Немає акаунта? <Link className="text-[#2563eb]" to="/register">Зареєструватися</Link>
            </p>
            <button type="button" className="w-full text-center text-sm text-slate-600" onClick={() => { setError(''); setStep('phone') }}>Інший спосіб входу</button>
            <p className="rounded-xl bg-[#e8eef5] p-3 text-xs text-slate-500">
              Демо: buyer@rozetka.test, пароль Buyer12345. Заблокований: blocked@rozetka.test, пароль Blocked12345.
            </p>
          </form>
        )}
      </section>
    </div>
  )
}

function canonicalPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('380'))
    return `+${digits}`
  if (digits.length === 10 && digits.startsWith('0'))
    return `+38${digits}`
  if (digits.length === 9)
    return `+380${digits}`
  return null
}

function Primary({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-[15px] font-medium text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50" {...props}>
      {children}
    </button>
  )
}

function Outline({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d5dee8] bg-white px-4 py-3 text-[15px] font-medium text-slate-900 hover:bg-slate-50" {...props}>
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-[#d5dee8]" />
      або
      <span className="h-px flex-1 bg-[#d5dee8]" />
    </div>
  )
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M12.6 8.4c0-1.8 1.5-2.7 1.5-2.7-.8-1.2-2.1-1.4-2.6-1.4-1.1-.1-2.1.6-2.7.6s-1.4-.6-2.4-.6c-1.2 0-2.3.7-2.9 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.3 1.9 2.3 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.4.6 1.6-.9 2.2-1.8c.7-1 .9-1.9 1-2-.1 0-1.9-.7-2-2.9zM10.8 3.2c.5-.6.8-1.4.7-2.2-.7 0-1.5.5-2 .1-.5.6-.9 1.5-.8 2.3.8.1 1.6-.4 2.1-1.1z" />
    </svg>
  )
}

function MailMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="4" width="14" height="10" rx="1.5" fill="none" stroke="#64748b" strokeWidth="1.4" />
      <path d="M3 5.5 9 10l6-4.5" fill="none" stroke="#64748b" strokeWidth="1.4" />
    </svg>
  )
}
