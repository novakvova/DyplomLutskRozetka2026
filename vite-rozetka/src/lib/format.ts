export function formatMoney(value: number) {
  const hasCents = Math.round(value * 100) % 100 !== 0
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value)
  return `${formatted} ₴`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const orderStatusLabel: Record<string, string> = {
  New: 'Нове',
  AwaitingPayment: 'Очікує оплату',
  Processing: 'Комплектується',
  Completed: 'Виконано',
  Cancelled: 'Скасовано',
}

export const deliveryLabel: Record<string, string> = {
  nova_poshta: 'Нова пошта',
  ukrposhta: 'Укрпошта',
  pickup: 'Самовивіз',
}

export const paymentLabel: Record<string, string> = {
  cash_on_delivery: 'Під час отримання',
  card: 'Карткою',
}
