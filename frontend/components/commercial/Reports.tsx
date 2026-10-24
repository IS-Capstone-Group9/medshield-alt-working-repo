'use client'

import { useState } from 'react'
import type { SalesDatasetStatus, SalesPage, SalesTransaction } from '@/types/sales.types'
import { money, number } from './model'
import { Badge, Drawer, Empty, Export, Panel } from './shared'
import { useResource } from './use-resource'

export default function Reports({ scope, revision, status }: { scope: string; revision: number; status?: SalesDatasetStatus }) {
  const [search, setSearch] = useState('')
  const [quality, setQuality] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<SalesTransaction | null>(null)
  const params = new URLSearchParams(scope)
  params.set('page', String(page)); params.set('page_size', '25')
  if (search) params.set('search', search)
  if (quality) params.set('quality_status', quality)
  const resource = useResource<SalesPage>(`/api/sales/transactions?${params}`, revision)
  const data = resource.data
  const context = { classification: 'Candidate source records', ...Object.fromEntries(params), export_scope: 'current_page_only', total_matching_rows: data?.pagination.total_rows, ...data?.release }
  return <>
    <Panel title="Original workspace reports" note="Uses the same authenticated Databricks gateway and pinned sales release as the original MedShield branch.">
      <p>Browse delivery records below, or open the original workspace for its full reporting, model evaluation, weather analysis and planning tools.</p>
      <a className="ms-button" href="/classic">Open original reports & analytics ↗</a>
      <dl className="ms-facts"><div><dt>Source report</dt><dd>{status?.source_file || 'Unavailable'}</dd></div><div><dt>Recorded coverage</dt><dd>{status?.quality_summary.source_period_start || '—'} – {status?.quality_summary.source_period_end || '—'}</dd></div><div><dt>Accepted source rows</dt><dd>{number(status?.quality_summary.rows_accepted)}</dd></div></dl>
    </Panel>
    <Panel title="Live delivery & sales records" note="Calendar, buyer and region filters apply. CSV exports contain the displayed page and its filter/source metadata; source records are not proof of an audited receipt."
      action={data && <Export name="live-sales-records-page" headers={['delivery_reference', 'date', 'product', 'area', 'quantity_source_units', 'net_sales_php', 'gross_profit_php', 'quality', 'evidence', 'workbook', 'sheet', 'source_row']} rows={data.rows.map(row => [row.dr_number, row.date_delivered, row.product, row.area, row.quantity, row.total_trade_price, row.net_income, row.quality_status, row.transaction_evidence, row.source_workbook, row.source_sheet, row.source_row_number])} context={context} />}>
      <div className="ms-filters"><label>Search source records<input aria-label="Search source records" value={search} placeholder="Product or delivery reference" onChange={event => { setSearch(event.target.value); setPage(1); setSelected(null) }} /></label><label>Record quality<select aria-label="Record quality" value={quality} onChange={event => { setQuality(event.target.value); setPage(1); setSelected(null) }}><option value="">All quality states</option><option value="valid">Valid</option><option value="warning">Warning</option><option value="rejected">Rejected</option></select></label></div>
      {resource.error ? <Empty><strong>Live report unavailable</strong><p>{resource.error}</p><p>Use Reload source data to retry.</p></Empty> : !data ? <Empty>Loading live source records…</Empty> : <>
        <p>{number(data.pagination.total_rows)} matching source rows · Page {page} of {Math.max(1, data.pagination.page_count)}</p>
        <div className="ms-table-wrap"><table><thead><tr><th>Delivery reference</th><th>Date</th><th>Product</th><th>Territory</th><th>Source quantity</th><th>Net sales</th><th>Quality</th></tr></thead><tbody>{data.rows.map((row, i) => <tr key={row.source_record_id || `${page}-${i}`}><td><button className="ms-table-link" onClick={() => setSelected(row)}>{row.dr_number || 'Inspect record'}</button></td><td>{row.date_delivered || 'Unavailable'}</td><td>{row.product}</td><td>{row.area || 'Unmapped'}</td><td className="ms-num">{number(row.quantity)}</td><td className="ms-num">{money(row.total_trade_price)}</td><td><Badge>{row.quality_status}</Badge></td></tr>)}</tbody></table></div>
        {!data.rows.length && <Empty>No source records match these filters.</Empty>}
        <div className="ms-pagination"><button className="ms-button" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(null) }}>Previous report page</button><button className="ms-button" disabled={page >= data.pagination.page_count} onClick={() => { setPage(page + 1); setSelected(null) }}>Next report page</button></div>
      </>}
    </Panel>
    {selected && data && <Drawer title="Source report detail" onClose={() => setSelected(null)}><dl className="ms-facts">{Object.entries({ 'Delivery reference': selected.dr_number, Date: selected.date_delivered, Product: selected.product, Workbook: selected.source_workbook, Sheet: selected.source_sheet, 'Source row': selected.source_row_number, 'Record ID': selected.source_record_id, Evidence: selected.transaction_evidence, Quality: selected.quality_status, Notes: selected.quality_notes, 'File checksum': selected.source_file_sha256 }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value ?? 'Unavailable')}</dd></div>)}</dl></Drawer>}
  </>
}
