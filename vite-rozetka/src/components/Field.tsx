import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const controlClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/30'

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      <input id={id} className={controlClass} {...props} />
    </label>
  )
}

export function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? props.name
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      <textarea id={id} className={controlClass} {...props} />
    </label>
  )
}

export function SelectField({ label, children, ...props }: { label: string, children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = props.id ?? props.name
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      <select id={id} className={controlClass} {...props}>{children}</select>
    </label>
  )
}

export function Button({ children, className = '', ...props }: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-brand-800 px-4 py-2 font-medium text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children)
    return null
  return <p className="text-sm text-red-700" role="alert">{children}</p>
}
