const decimalFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

const integerFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
})

export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatKcal(value: number): string {
  return integerFormatter.format(Math.round(value || 0))
}

export function formatGrams(value: number): string {
  return decimalFormatter.format(value || 0)
}

export function formatKg(value: number, decimals = 1): string {
  return formatNumber(value || 0, decimals)
}

export function formatPercent(value: number): string {
  return `${Math.round(value || 0)} %`
}

export function formatSigned(value: number, unit = '', decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, decimals)}${unit ? ` ${unit}` : ''}`
}

export function formatDecimal(value: number, decimals = 1): string {
  return formatNumber(value, decimals)
}
