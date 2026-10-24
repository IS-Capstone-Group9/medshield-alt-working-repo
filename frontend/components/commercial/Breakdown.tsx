'use client'

import { useState } from 'react'
import { stlViewModel, type StlRow } from '@/services/api/stl-view-model'
import { money } from './model'
import { Badge, Empty, Export, Kpi, Panel, SalesChart } from './shared'
import { useResource } from './use-resource'

export default function Breakdown({ revision }: { revision: number }) {
  const resource = useResource<{ rows: StlRow[]; release: { dataset_id: string; fact_delta_version: number } }>('/api/seasonality/stl', revision)
  const [position, setPosition] = useState<number | null>(null)
  const rows = resource.data?.rows || []
  if (resource.error || !rows.length) return <Empty>{resource.error || (resource.loading ? 'Loading sales breakdown…' : 'No qualifying history for sales breakdown.')}</Empty>
  const index = Math.min(position ?? rows.length - 1, rows.length - 1)
  const selected = rows[index]
  const delta = selected.observed - selected.trend - selected.seasonal - selected.residual
  const view = stlViewModel(rows)
  const end = view.labels.indexOf(selected.period) + 1
  const begin = Math.max(0, end - 24)
  return <Panel title="Sales breakdown" note="All buyers · full qualifying source history, independent of the filter deck. Components describe historical patterns; unusual movement does not identify its cause." action={<Badge tone={Math.abs(delta) < 0.005 ? 'green' : 'amber'}>Diff {money(delta)} · {Math.abs(delta) < 0.005 ? 'Reconciles to cent precision' : 'Review difference'}</Badge>}>
    <label className="ms-scrubber">Inspect month <strong>{selected.period}</strong><input type="range" min={0} max={rows.length - 1} value={index} onChange={e => setPosition(Number(e.target.value))} aria-label="Sales breakdown month" /><span>{rows[0].period} — {rows[rows.length - 1].period} · {rows.length} qualifying months</span></label>
    <div className="ms-kpis">{([['observed', 'Total recorded sales'], ['trend', 'Core growth baseline'], ['seasonal', 'Seasonal boost / drag'], ['residual', 'Unusual sales movement']] as const).map(([key, title]) => <Kpi key={key} label={title} value={money(selected[key], true)} note={selected.period} />)}</div>
    <div className="ms-grid-two">{([['observed', 'Recorded sales'], ['trend', 'Core growth baseline'], ['seasonal', 'Seasonal cycle'], ['residual', 'Unusual sales movement']] as const).map(([key, title]) => <div key={key}><h3>{title}</h3><SalesChart label={title} points={view.labels.slice(begin, end).map((period, i) => ({ period, actual: view[key][begin + i] }))} /></div>)}</div>
    <Export name="sales-breakdown" headers={['period', 'observed_php', 'baseline_php', 'seasonal_php', 'unusual_php', 'difference_php']} rows={[[selected.period, selected.observed, selected.trend, selected.seasonal, selected.residual, delta]]} context={{ classification: 'Candidate historical breakdown', ...resource.data?.release, scope: 'All buyers, full qualifying history', scenario_multiplier: 1 }} />
  </Panel>
}
