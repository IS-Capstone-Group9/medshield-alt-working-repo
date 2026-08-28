interface BadgeProps {
  status: 'ready' | 'draft' | 'blocked' | 'critical' | 'warning' | 'stable'
  label?: string
}

export function Badge({ status, label }: BadgeProps) {
  const styles = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    draft: 'bg-blue-50 text-blue-700 border-blue-200',
    blocked: 'bg-red-50 text-red-700 border-red-200',
    critical: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    stable: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const defaultLabels = {
    ready: 'Ready',
    draft: 'Draft',
    blocked: 'Blocked',
    critical: 'Critical',
    warning: 'Warning',
    stable: 'Stable',
  }

  return (
    <span
      className={`status-pill border text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${styles[status]}`}
    >
      {label || defaultLabels[status]}
    </span>
  )
}
