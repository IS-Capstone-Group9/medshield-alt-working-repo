'use client'

import { useMemo, useState } from 'react'
import { addMonths, cutoff, forecastPoints, money, number, type ForecastEvidence } from './model'
import { Badge, Empty, Export, Kpi, Panel, SalesChart } from './shared'
import { useResource } from './use-resource'

export default function Forecast({ anchor, sector, revision }: { anchor: string; sector: string; revision: number }) {
  const [horizon, setHorizon] = useState(24)
  const [history, setHistory] = useState(24)
  const [product, setProduct] = useState('')
  const [model, setModel] = useState('')
  const [leadDays, setLeadDays] = useState(60)
  const query = new URLSearchParams({ sector: sector || 'All', product, metric: 'revenue' })
  const resource = useResource<ForecastEvidence>(`/api/sales/forecast-validation?${query}`, revision)
  const data = resource.data
  const available = data?.views[String(horizon)]?.models || {}
  const selectedModel = available[model] ? model : Object.keys(available)[0] || ''
  const result = available[selectedModel]
  const points = useMemo(() => data ? forecastPoints(data, anchor, horizon, history, selectedModel) : [], [data, anchor, horizon, history, selectedModel])
  const approved = data?.status === 'published' && data.publication_status === 'approved' && Boolean(data.run_id && data.release_id)
  const context = { classification: approved ? 'Approved published forecast' : 'Exploratory forecast evidence', sector: sector || 'All', product: product || 'All', anchor, horizon, source_checksum: data?.source.checksum, origin: data?.origin, publication_status: data?.publication_status, scenario_multiplier: 1, lead_days_assumption: leadDays }
  return <>
    <div className="ms-module-tools"><label>Product<select aria-label="Forecast product" value={product} onChange={e => setProduct(e.target.value)}><option value="">All products · revenue</option>{data?.products?.map(p => <option key={p}>{p}</option>)}</select></label><label>Forecast horizon<select aria-label="Forecast horizon" value={horizon} onChange={e => setHorizon(Number(e.target.value))}>{[3, 6, 12, 24].map(h => <option value={h} key={h}>{h} months</option>)}</select></label><label>Chart window<select aria-label="Chart window" value={history} onChange={e => setHistory(Number(e.target.value))}><option value={0}>Forecast horizon only</option><option value={6}>Trailing 6M + forecast</option><option value={24}>Trailing 24M + forecast</option><option value={120}>Full history (up to 10 years)</option></select></label><label>Forecast method<select aria-label="Forecast method" value={selectedModel} onChange={e => setModel(e.target.value)} disabled={!result}><option value="" disabled>Not available</option>{Object.keys(available).map(key => <option key={key} value={key}>{data?.models[key] || key}</option>)}</select></label></div>
    {resource.error ? <Empty>{resource.error}</Empty> : !data ? <Empty>Loading forecast evidence…</Empty> : <>
      <div className="ms-notice"><Badge tone="purple">{approved ? 'Published forecast' : 'Research evidence'}</Badge><span>{approved ? 'Use only supported calendar months and supplied safety ranges.' : 'No approved production forecast is established for this selection. Historical error is not a guarantee of future accuracy.'} Source origin: {data.origin || 'Unavailable'}.</span></div>
      <div className="ms-kpis"><Kpi label="Average monthly deviation" value={money(result?.metrics?.mae, true)} note="Historical evaluation · peso revenue" /><Kpi label="Weighted historical error" value={result?.metrics?.wape == null ? 'Unavailable' : `${number(result.metrics.wape)}%`} note="Absolute error / recorded sales; lower is better" /><Kpi label="Forecast lean" value={money(result?.metrics?.bias, true)} note="Historical signed error; not a future guarantee" /><Kpi label="Requested forward window" value={`${horizon} months`} note={`${addMonths(anchor, 1)} through ${addMonths(anchor, horizon)}`} tone="purple" /></div>
      <Panel title="Demand & sales outlook" note="Peso sales estimates are separate from physical medicine demand." action={<Export name="forecast" headers={['period', 'recorded_php', 'prior_year_php', 'forecast_php', 'lower_php', 'upper_php', 'po_cutoff_assumption']} rows={points.map(p => [p.period, p.actual, p.prior, p.forecast, p.lower, p.upper, p.period > anchor ? cutoff(p.period, leadDays) : ''])} context={context} />}>
        {!result && <div className="ms-notice">The source does not supply a {horizon}-month forecast for this selection. The requested calendar remains visible; unsupported predictions stay blank.</div>}
        <SalesChart points={points} boundary={anchor} />
      </Panel>
      <div className="ms-grid-two"><Panel title="Commercial forecast review" note="Four checks before a purchasing decision."><ol className="ms-review"><li><strong>01 · Recorded baseline</strong><span>Latest source actual: {data.last_actual_period || 'Unavailable'}.</span></li><li><strong>02 · Seasonal movement</strong><span>Inspect historical breakdown; no automatic disease uplift is assumed.</span></li><li><strong>03 · Forward estimate</strong><span>{points.filter(p => p.forecast != null).length} supported values in the requested window.</span></li><li><strong>04 · Supply decision</strong><span>Validate inventory, units, expiry, supplier capacity and lead time in the planning sandbox.</span></li></ol></Panel><Panel title="Purchase order calendar" note="Indicative dates from an entered lead time; no orders are scheduled."><label className="ms-field">Lead time assumption<select aria-label="Lead time assumption" value={leadDays} onChange={e => setLeadDays(Number(e.target.value))}><option value={45}>45 days</option><option value={60}>60 days</option></select></label><div className="ms-table-wrap"><table><thead><tr><th>Receipt month</th><th>Order by</th><th>Evidence</th></tr></thead><tbody>{points.filter(p => p.period > anchor).map(p => <tr key={p.period}><td>{p.period}</td><td>{cutoff(p.period, leadDays)}</td><td>{p.forecast == null ? 'Forecast unavailable' : 'Planning assumption'}</td></tr>)}</tbody></table></div></Panel></div>
      <Panel title="Forecast evidence table" note={(data.limitations || []).join(' ')}><div className="ms-table-wrap"><table><thead><tr><th>Month</th><th>Recorded sales</th><th>Forward estimate</th><th>Expected safety range</th><th>Classification</th></tr></thead><tbody>{points.map(p => <tr key={p.period}><td>{p.period}</td><td className="ms-num">{money(p.actual)}</td><td className="ms-num">{money(p.forecast)}</td><td className="ms-num">{p.lower == null ? 'Not supplied' : `${money(p.lower)} – ${money(p.upper)}`}</td><td>{p.period <= anchor ? 'Recorded source evidence' : approved ? 'Published forecast' : 'Exploratory / unavailable'}</td></tr>)}</tbody></table></div></Panel>
    </>}
  </>
}
