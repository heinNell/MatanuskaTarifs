import { format, isValid, parseISO } from 'date-fns'

/**
 * Format a date string to a display format
 */
export function formatDate(dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy'): string {
  if (!dateString) return '-'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return '-'
    return format(date, formatStr)
  } catch {
    return '-'
  }
}

/**
 * Format a number as currency (ZAR)
 */
export function formatCurrency(amount: number | null | undefined, showSymbol: boolean = true): string {
  if (amount === null || amount === undefined) return '-'
  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return showSymbol ? `R ${formatted}` : formatted
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Calculate adjusted rate based on diesel price change
 */
export function calculateAdjustedRate(
  baseRate: number,
  dieselChangePercent: number,
  dieselImpactPercent: number = 35
): number {
  return baseRate * (1 + (dieselChangePercent / 100) * (dieselImpactPercent / 100))
}

/**
 * Round to specified decimal places
 */
export function roundToDecimal(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Generate a client code
 */
export function generateClientCode(prefix: string = 'CLI'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${prefix}${timestamp.slice(-4)}`
}

/**
 * Generate a route code from origin and destination
 */
export function generateRouteCode(origin: string, destination: string): string {
  const originCode = origin.slice(0, 3).toUpperCase()
  const destCode = destination.slice(0, 3).toUpperCase()
  return `${originCode}-${destCode}`
}

/**
 * Get status badge color class
 */
export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'valid':
    case 'active':
    case 'approved':
      return 'badge-success'
    case 'expiring soon':
    case 'pending':
    case 'warning':
      return 'badge-warning'
    case 'expired':
    case 'missing':
    case 'inactive':
    case 'rejected':
      return 'badge-danger'
    default:
      return 'badge-info'
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Get month name from date string
 */
export function getMonthName(dateString: string): string {
  return formatDate(dateString, 'MMMM yyyy')
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(dateString: string): boolean {
  const date = parseISO(dateString)
  return date < new Date()
}

/**
 * Get days until date
 */
export function getDaysUntil(dateString: string): number {
  const date = parseISO(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
