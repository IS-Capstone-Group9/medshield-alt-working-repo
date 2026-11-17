/** Shared helpers for gateway-backed panels: lazy loading on page open, escaping and formatting. */
export const peso = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? '—' : '₱' + Math.round(v).toLocaleString('en-PH')
export const pesoShort = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? '—'
  : Math.abs(v) >= 1e6 ? '₱' + (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? '₱' + Math.round(v / 1e3) + 'k' : '₱' + Math.round(v)
export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!))
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthLabel = (p: string) => `${MON[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`

/** Calls load() when the page opens (nav click/Enter) or immediately if it is already active. Returns a disposer. */
export function onPageOpen(root: HTMLElement, host: HTMLElement, page: string, load: () => void) {
  const activate = (event: Event) => {
    if (event.type === 'keydown' && !['Enter', ' '].includes((event as KeyboardEvent).key)) return
    if ((event.target as HTMLElement)?.closest?.(`[data-dashboard-page="${page}"]`)) load()
  }
  root.addEventListener('click', activate); root.addEventListener('keydown', activate)
  if (host.classList.contains('active')) load()
  return () => { root.removeEventListener('click', activate); root.removeEventListener('keydown', activate) }
}

export const PANEL_CSS = (id: string) => `
  #${id}{min-width:0}#${id} p{line-height:1.5;margin:var(--space-2) 0}#${id} h3{font-size:14px;margin:var(--space-4) 0 var(--space-2)}
  #${id} .pk-lead{color:var(--text-secondary);font-size:13px;max-width:78ch}
  #${id} .pk-tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;border:1px solid var(--border);color:var(--text-secondary);white-space:nowrap;vertical-align:middle}
  #${id} .pk-pass{color:#2f7d5b;border-color:color-mix(in srgb,#2f7d5b 50%,transparent)}#${id} .pk-fail{color:#b23b3b;border-color:color-mix(in srgb,#b23b3b 50%,transparent)}
  #${id} .pk-wait{color:#a06a12;border-color:color-mix(in srgb,#a06a12 50%,transparent)}
  #${id} .pk-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin:var(--space-3) 0}
  #${id} .pk-card{padding:var(--space-3) var(--space-4);border:1px solid var(--border);border-radius:var(--radius-card);min-width:0}
  #${id} .pk-card span{display:block;font-size:12px;font-weight:600;color:var(--text-secondary)}
  #${id} .pk-card strong{display:block;font-size:22px;margin-top:var(--space-1);color:var(--text-primary);overflow-wrap:anywhere}
  #${id} .pk-card small{display:block;font-size:12px;color:var(--text-secondary);margin-top:2px;line-height:1.4}
  #${id} .pk-scroll{overflow:auto;max-width:100%;margin:var(--space-2) 0}
  #${id} table{border-collapse:collapse;font-size:12px;width:100%}#${id} th,#${id} td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
  #${id} td.num,#${id} th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  #${id} .pk-seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--border);border-radius:var(--radius-control);overflow:hidden}
  #${id} .pk-seg button{border:0;background:transparent;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;color:var(--text-secondary);cursor:pointer}
  #${id} .pk-seg button+button{border-left:1px solid var(--border)}#${id} .pk-seg button[aria-pressed=true]{background:var(--accent);color:#fff}
  #${id} input[type=search],#${id} select,#${id} textarea{padding:var(--space-1) var(--space-2);border:1px solid var(--border);border-radius:var(--radius-control);background:var(--bg-card,#fff);color:var(--text-primary);font:inherit;font-size:13px;max-width:100%}
  #${id} input[type=search],#${id} select{height:var(--control-h)}
  #${id} :is(button,select,input,textarea,summary,a):focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  #${id} details{margin:var(--space-2) 0}#${id} summary{cursor:pointer;font-weight:600;font-size:13px;padding:var(--space-2) 0}`
