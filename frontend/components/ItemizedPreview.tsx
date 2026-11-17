'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { downloadItemizedPreview, getItemizedPreview, type ItemizedPreviewData, type ItemizedPreviewFilters } from '@/services/api/itemized-preview'
import styles from './ItemizedPreview.module.css'
import SalesScope from './SalesScope'

const currency = (value: string | null | undefined) => value == null || value === '' ? '—' :
  new Intl.NumberFormat('en-PH', {style: 'currency', currency: 'PHP', maximumFractionDigits: 2}).format(Number(value))
const count = (value: string | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en-PH').format(Number(value))

export default function ItemizedPreview() {
  const [filters, setFilters] = useState<ItemizedPreviewFilters>({year: 'all', area: 'all', category: 'all'})
  const [data, setData] = useState<ItemizedPreviewData | null>(null)
  const [options, setOptions] = useState({years: [] as string[], areas: [] as string[]})
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [exporting, setExporting] = useState(false), [retry, setRetry] = useState(0)
  useEffect(() => {
    let current = true
    getItemizedPreview(filters).then(result => {
      if (!current) return
      setData(result); setOptions({years: result.available_years, areas: result.available_areas})
    }).catch(reason => {if (current) setError(reason instanceof Error ? reason.message : 'The itemized preview is unavailable.')})
      .finally(() => {if (current) setLoading(false)})
    return () => {current = false}
  }, [filters, retry])
  const change = (name: keyof ItemizedPreviewFilters, value: string) => {
    setData(null); setLoading(true); setError('')
    setFilters(previous => ({...previous, [name]: value}))
  }
  const exportCsv = async (view: 'monthly' | 'products' | 'records') => {
    setExporting(true)
    try {await downloadItemizedPreview(view, filters)}
    catch (reason) {setData(null); setError(reason instanceof Error ? reason.message : 'Export unavailable.')}
    finally {setExporting(false)}
  }
  const canExport = !!data && Number(data.summary.records) > 0 && !loading && !exporting
  return <main className={styles.page}>
    <div className={styles.content}>
      <header className={styles.header}>
        <div><Link href="/" className={styles.back}>← Dashboard</Link>
          <h1>Original itemized sales</h1><p>Contract amounts excluded · Not complete company sales</p></div>
        <span className={styles.badge}>Release preview</span>
      </header>
      <section className={styles.notice} aria-label="Reporting scope">
        This preview reads the newly reconciled itemized records. Contract amounts remain separate while their financial scope is reviewed.
        Product category acceptance does not approve physical units or forecasts. Financial publication remains pending.
      </section>
      <SalesScope value="itemized" disabled={exporting}/>
      <div className={styles.filters}>
        <label>Delivery year<select disabled={exporting} value={filters.year} onChange={event => change('year', event.target.value)}>
          <option value="all">All observed years</option>{options.years.map(year => <option key={year}>{year}</option>)}
        </select></label>
        <label>Recorded area label<select disabled={exporting} value={filters.area} onChange={event => change('area', event.target.value)}>
          <option value="all">All recorded areas</option>{options.areas.map(area => <option key={area}>{area}</option>)}
        </select></label>
        <label>Product category<select disabled={exporting} value={filters.category} onChange={event => change('category', event.target.value)}>
          <option value="all">All categories</option><option value="medicine">Medicine</option>
          <option value="medical_supply">Medical supply</option><option value="medical_equipment">Medical equipment</option>
          <option value="non_medical">Non-medical</option><option value="unclassified">Unclassified</option>
        </select></label>
        <button type="button" disabled={loading || exporting} onClick={() => {
          setData(null); setLoading(true); setError(''); setRetry(value => value + 1)
        }}>Refresh</button>
      </div>
      <div aria-live="polite" aria-busy={loading}>
        {loading && <p className={styles.state} role="status">Checking the original itemized source…</p>}
        {error && <div className={styles.error} role="alert"><strong>Preview unavailable</strong><p>{error}</p></div>}
        {data && <>
          <div className={styles.cards}>
            <section className={styles.card}><h2>Eligible signed net sales</h2><strong>{currency(data.summary.net_sales)}</strong><p>Includes eligible signed returns</p></section>
            <section className={styles.card}><h2>Recorded itemized rows</h2><strong>{count(data.summary.records)}</strong><p>{count(data.summary.net_eligible_records)} rows eligible for net totals</p></section>
            <section className={styles.card}><h2>Signed returns / adjustments</h2><strong>{currency(data.summary.signed_returns)}</strong><p>Eligible negative net values retained</p></section>
            <section className={styles.card}><h2>Cost-supported gross margin</h2><strong>{currency(data.summary.gross_margin)}</strong><p>{data.summary.margin_pct == null ? 'Rate unavailable' : `${Number(data.summary.margin_pct).toFixed(2)}%`} · paired sales basis {currency(data.summary.margin_sales_basis)}</p></section>
          </div>
          <p className={styles.scope}>Observed dates: {data.summary.first_delivery_date ?? 'unavailable'} to {data.summary.last_delivery_date ?? 'unavailable'}.
            {' '}Area labels are source labels, not verified geographic or customer identities. Missing months and amounts remain unknown.</p>
          <div className={styles.exports} aria-label="Itemized exports">
            <button type="button" disabled={!canExport} onClick={() => void exportCsv('monthly')}>Export monthly CSV</button>
            <button type="button" disabled={!canExport} onClick={() => void exportCsv('products')}>Export product CSV</button>
            <button type="button" disabled={!canExport} onClick={() => void exportCsv('records')}>Export itemized records</button>
            <span>Exports use these same filters, eligibility flags and source identity.</span>
          </div>
          {Number(data.summary.records) === 0 && <p className={styles.state}>No itemized records match these filters. No sales value is inferred.</p>}
          <div className={styles.tables}>
            <section className={styles.panel}><h2>Observed months</h2><p>Only months with matching records are shown; absent months are unknown.</p>
              <div className={styles.scroll}><table><thead><tr><th>Month</th><th>Rows</th><th>Eligible signed net</th></tr></thead>
                <tbody>{data.monthly.map(row => <tr key={row.period}><td>{row.period}</td><td>{count(row.records)}</td><td>{currency(row.net_sales)}</td></tr>)}</tbody></table></div>
            </section>
            <section className={styles.panel}><h2>Source product labels</h2><p>Top {Math.min(20, data.products.length)} of {data.products.length} labels by eligible positive contribution. Returns remain in signed net.</p>
              <div className={styles.scroll}><table><thead><tr><th>Product label</th><th>Category</th><th>Eligible signed net</th></tr></thead>
                <tbody>{data.products.slice(0, 20).map(row => <tr key={row.product}><td>{row.product}</td><td>{row.category?.replaceAll('_', ' ')}</td><td>{currency(row.net_sales)}</td></tr>)}</tbody></table></div>
            </section>
          </div>
          <details className={styles.identity}><summary>Source and limitations</summary>
            <p>{data.source.note}</p><dl><dt>Batch</dt><dd>{data.source.batch_id}</dd>
              <dt>Dataset</dt><dd>{data.source.dataset_id}</dd><dt>Gold table</dt><dd>{data.source.source_table}</dd>
              <dt>Delta version</dt><dd>{data.source.delta_version}</dd><dt>Receipt SHA256</dt><dd>{data.source.receipt_sha256}</dd></dl>
            <p>Financial publication remains pending. This page does not reuse prior STL, model-error or procurement claims for the new source.</p>
          </details>
        </>}
      </div>
    </div>
  </main>
}
