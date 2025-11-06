export function safeNumber(value: any, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? (n as number) : fallback
}

export function safeToFixed(value: any, digits = 2, fallback = '0'): string {
  const n = safeNumber(value, NaN)
  if (!Number.isFinite(n)) return fallback
  try {
    return n.toFixed(digits)
  } catch {
    return fallback
  }
}

export function formatMoneyCents(value: any): string {
  return `$${safeToFixed(value, 2, '0.00')}`
}

export function formatHours(value: any): string {
  return `${safeToFixed(value, 2, '0.00')}`
}


