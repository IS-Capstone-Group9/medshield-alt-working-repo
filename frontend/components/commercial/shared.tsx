'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Download, X } from 'lucide-react'
import { csvText, money, type ChartPoint } from './model'

export function Badge({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'purple' | 'green' | 'slate' }) { return <span className={`ms-badge ${tone}`}>{children}</span> }
export function Panel({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) { return <section className="ms-panel"><header><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</header>{children}</section> }
export function Kpi({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) { return <article className={`ms-kpi ${tone || ''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article> }
export function Empty({ children }: { children: ReactNode }) { return <div className="ms-empty" role="status">{children}</div> }
export function Export({ name, headers, rows, context }: { name: string; headers: string[]; rows: unknown[][]; context: Record<string, unknown> }) {
  return <button className="ms-button" disabled={!rows.length} onClick={() => { const time = new Date().toISOString(); const url = URL.createObjectURL(new Blob([csvText(headers, rows, { ...context, exported_at: time })], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `${name}-${time.slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }}><Download size={14} /> Export CSV</button>
}
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => { previous?.focus() } }, [])
  return <dialog ref={ref} className="ms-drawer" onCancel={onClose}><header><h2>{title}</h2><button className="ms-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></header>{children}</dialog>
}
export function SalesChart({ points, boundary, label = 'Sales by month' }: { points: ChartPoint[]; boundary?: string; label?: string }) {
  const id = useId().replace(/:/g, '')
  const [selected, setSelected] = useState<number | null>(null)
  const width = 920, height = 280, left = 76, right = 18, top = 22, bottom = 36
  const values = points.flatMap(p => [p.actual, p.prior, p.forecast, p.upper, p.lower]).filter((v): v is number => v != null && Number.isFinite(v))
  if (!values.length) return <Empty>No values are available for this calendar window. Missing months are not zero sales.</Empty>
  const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min || 1
  const x = (i: number) => left + i * (width - left - right) / Math.max(1, points.length - 1)
  const y = (v: number) => top + (max - v) / span * (height - top - bottom)
  const path = (key: 'actual' | 'prior' | 'forecast') => { let open = false; return points.map((p, i) => { const value = p[key]; if (value == null || !Number.isFinite(value)) { open = false; return '' } const part = `${open ? 'L' : 'M'}${x(i)},${y(value)}`; open = true; return part }).join(' ') }
  const boundaryIndex = boundary ? points.findIndex(p => p.period > boundary) : -1
  const active = selected == null ? undefined : points[selected]
  return <div className="ms-chart"><div className="ms-legend"><span><i /> Recorded sales</span><span><i className="prior" /> Prior year</span>{boundary && <span><i className="forecast" /> Forward estimate</span>}</div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <defs><linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#1e3a5f" stopOpacity=".12" /><stop offset="1" stopColor="#1e3a5f" stopOpacity="0" /></linearGradient></defs>
    {[0, 1, 2, 3, 4].map(t => { const value = min + span * t / 4; return <g key={t}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#e2e8f0" /><text x={left - 12} y={y(value) + 4} textAnchor="end">{money(value, true)}</text></g> })}
    {points.map((p, i) => { const next = points[i + 1]; return p.actual != null && next?.actual != null ? <path key={`area-${p.period}`} d={`M${x(i)},${y(0)} L${x(i)},${y(p.actual)} L${x(i + 1)},${y(next.actual)} L${x(i + 1)},${y(0)} Z`} fill={`url(#${id}-fill)`} /> : null })}
    {points.map((p, i) => { const next = points[i + 1]; return p.lower != null && p.upper != null && next?.lower != null && next.upper != null ? <path key={`band-${p.period}`} d={`M${x(i)},${y(p.lower)} L${x(i)},${y(p.upper)} L${x(i + 1)},${y(next.upper)} L${x(i + 1)},${y(next.lower)} Z`} fill="#9333ea" fillOpacity=".12" stroke="#9333ea" strokeOpacity=".3" strokeDasharray="4 4" /> : null })}
    <path d={path('actual')} fill="none" stroke="#1e3a5f" strokeWidth="2.5" /><path d={path('prior')} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="5 5" /><path d={path('forecast')} fill="none" stroke="#9333ea" strokeWidth="2.5" />
    {boundaryIndex > 0 && <g><line x1={x(boundaryIndex) - 4} x2={x(boundaryIndex) - 4} y1={top} y2={height - bottom} stroke="#9333ea" strokeDasharray="4 4" /><text x={Math.min(x(boundaryIndex), width - 145)} y={14} fill="#9333ea">Forward estimates →</text>{points[boundaryIndex - 1].actual != null && points[boundaryIndex].forecast != null && <path d={`M${x(boundaryIndex - 1)},${y(points[boundaryIndex - 1].actual!)} L${x(boundaryIndex)},${y(points[boundaryIndex].forecast!)}`} stroke="#9333ea" strokeDasharray="3 4" />}</g>}
    {points.map((p, i) => <g key={p.period}>{(i % Math.max(1, Math.ceil(points.length / 8)) === 0 || i === points.length - 1) && <text x={x(i)} y={height - 10} textAnchor="middle">{p.period}</text>}<rect x={x(i) - Math.max(4, (width - left - right) / Math.max(1, points.length - 1) / 2)} y={top} width={Math.max(8, (width - left - right) / Math.max(1, points.length - 1))} height={height - top - bottom} fill="transparent" tabIndex={0} role="button" aria-label={`${p.period}: recorded ${money(p.actual)}, forecast ${money(p.forecast)}`} onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} /></g>)}
    {selected != null && <line x1={x(selected)} x2={x(selected)} y1={top} y2={height - bottom} stroke="#94a3b8" />}
  </svg><div className="ms-chart-detail" aria-live="polite">{active ? <><strong>{active.period}</strong><span>Recorded {money(active.actual)}</span><span>Prior year {money(active.prior)}</span>{boundary && <span>Forward {money(active.forecast)} · Range {money(active.lower)} – {money(active.upper)}</span>}</> : 'Hover or focus a month to inspect its values. Gaps indicate unavailable observations.'}</div></div>
}
