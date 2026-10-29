import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Сторінку не знайдено</h1>
      <Link className="text-brand-800" to="/">На головну</Link>
    </section>
  )
}
