'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import SalesScope from './SalesScope'
import {getContractReview,downloadContractReview,type ContractReviewData} from '@/services/api/contract-review'
import styles from './ItemizedPreview.module.css'
const money=(value:string|null|undefined)=>value==null?'—':new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(value))
export default function ContractReview() {
  const [year,setYear]=useState('all'),[retry,setRetry]=useState(0)
  const [data,setData]=useState<ContractReviewData|null>(null),[years,setYears]=useState<string[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[exporting,setExporting]=useState(false)
  useEffect(()=>{
    let current=true
    getContractReview(year).then(result=>{if(current){setData(result);setYears(result.available_years)}})
      .catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'Contract review unavailable.')})
      .finally(()=>{if(current)setLoading(false)})
    return ()=>{current=false}
  },[year,retry])
  const clear=()=>{setData(null);setLoading(true);setError('')}
  const exportCsv=async()=>{
    setExporting(true)
    try{await downloadContractReview(year)}catch(reason){setData(null);setError(reason instanceof Error?reason.message:'Contract export unavailable.')}
    finally{setExporting(false)}
  }
  return <main className={styles.page}><div className={styles.content}>
    <header className={styles.header}><div><Link className={styles.back} href="/">← Dashboard</Link><h1>Contract summaries</h1><p>Separate financial review · Excluded from itemized totals</p></div><span className={styles.badge}>Overlap unresolved</span></header>
    <section className={styles.notice} aria-label="Contract limitations">These are recorded contract amounts, not additional confirmed revenue. Their relationship to itemized sales is unresolved. Product breakdowns, physical quantities and geographic/customer details are unavailable in this contract view.</section>
    <SalesScope value="contracts" disabled={exporting}/>
    <div className={styles.filters}><label>Delivery year<select disabled={exporting} value={year} onChange={event=>{clear();setYear(event.target.value)}}><option value="all">All observed years</option>{years.map(value=><option key={value}>{value}</option>)}</select></label>
      <button type="button" disabled={loading||exporting} onClick={()=>{clear();setRetry(value=>value+1)}}>Refresh</button></div>
    <div aria-live="polite" aria-busy={loading}>
      {loading&&<p className={styles.state} role="status">Checking separate contract evidence…</p>}
      {error&&<div className={styles.error} role="alert"><strong>Contract review unavailable</strong><p>{error}</p></div>}
      {data&&<><div className={styles.cards}>
        <section className={styles.card}><h2>Eligible recorded contract net</h2><strong>{money(data.summary.net_sales)}</strong><p>Review amount; not added to itemized sales</p></section>
        <section className={styles.card}><h2>Recorded contract rows</h2><strong>{Number(data.summary.records).toLocaleString('en-PH')}</strong><p>{Number(data.summary.net_eligible_records).toLocaleString('en-PH')} technically eligible</p></section>
        <section className={styles.card}><h2>Product breakdown</h2><strong>Unavailable</strong><p>No product/category ranking or inferred medicine mix</p></section>
        <section className={styles.card}><h2>Physical quantity</h2><strong>Unavailable</strong><p>No quantity, demand or forecast inference</p></section>
      </div><p className={styles.scope}>Observed dates: {data.summary.first_delivery_date??'unavailable'} to {data.summary.last_delivery_date??'unavailable'}. Missing months remain unknown. Financial publication is pending.</p>
      <div className={styles.exports}><button type="button" disabled={exporting||loading||Number(data.summary.records)===0} onClick={()=>void exportCsv()}>Export contract monthly CSV</button><span>This export contains contract review amounts only, with the same delivery-year filter.</span></div>
      {Number(data.summary.records)===0&&<p className={styles.state}>No contract records match this delivery year.</p>}
      <section className={styles.panel}><h2>Observed contract months</h2><div className={styles.scroll}><table><thead><tr><th>Month</th><th>Rows</th><th>Eligible recorded net</th></tr></thead><tbody>{data.monthly.map(row=><tr key={row.period}><td>{row.period}</td><td>{row.records}</td><td>{money(row.net_sales)}</td></tr>)}</tbody></table></div></section>
      <details className={styles.identity}><summary>Source and limitations</summary><p>{data.source.note}</p><dl><dt>Dataset</dt><dd>{data.source.dataset_id}</dd><dt>Batch</dt><dd>{data.source.batch_id}</dd><dt>Gold table</dt><dd>{data.source.source_table}</dd><dt>Delta version</dt><dd>{data.source.delta_version}</dd><dt>Receipt SHA256</dt><dd>{data.source.receipt_sha256}</dd></dl></details></>}
    </div>
  </div></main>
}
