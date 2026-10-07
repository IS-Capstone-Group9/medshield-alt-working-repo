export function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPHPShort(value: number): string {
  if (value >= 1_000_000) {
    return `₱${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `₱${(value / 1_000).toFixed(0)}K`
  }
  return `₱${value.toFixed(0)}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDateString(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
  } catch (e) {
    return isoString
  }
}
