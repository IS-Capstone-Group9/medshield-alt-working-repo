import { createHash } from 'node:crypto'

export type HistoricalInput = Record<string, string | null>
export const HISTORICAL_METRICS = [
  {key:'sales',label:'Recorded Quezon net sales',unit:'PHP',provider:'MedShield'},
  {key:'disease',label:'DOH Dengue surveillance cases',unit:'reported cases',provider:'DOH'},
  {key:'tayabas',label:'PAGASA Tayabas station rainfall',unit:'mm',provider:'PAGASA'},
  {key:'alabat',label:'PAGASA Alabat station rainfall',unit:'mm',provider:'PAGASA'},
  {key:'nasa',label:'NASA POWER rainfall proxy',unit:'mm',provider:'NASA POWER'},
] as const
export type HistoricalKey = typeof HISTORICAL_METRICS[number]['key']
const value = (raw: string | null | undefined) => {
  if (raw == null || raw.trim()==='') return null
  const n=Number(raw)
  if (!Number.isFinite(n)) throw new Error('Nonfinite historical observation')
  return n
}
/** Calendar alignment only. It neither supplies an accepted exposure join nor trains a model. */
export function buildHistoricalComparison(input: Record<HistoricalKey, HistoricalInput[]>) {
  const series = HISTORICAL_METRICS.map(metric=>{
    const seen=new Map<string,HistoricalInput>()
    for(const row of input[metric.key]) {
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period??'')) throw new Error('Invalid historical period')
      if(seen.has(row.period!))throw new Error('Duplicate historical '+metric.key+' month')
      const n=value(row.value)
      if(metric.key!=='sales' && n!=null && n<0)throw new Error('Negative external observation')
      if(metric.key==='disease' && n!=null && !Number.isInteger(n))throw new Error('Fractional disease count')
      seen.set(row.period!,row)
    }
    return {metric,seen}
  })
  const rows=Array.from({length:108},(_,i)=>{
    const period=`${2017+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`
    return {period, ...Object.fromEntries(series.map(({metric,seen})=>[metric.key,value(seen.get(period)?.value)]))} as {period:string}&Record<HistoricalKey,number|null>
  })
  const coverage=series.map(({metric})=>{
    const observed=rows.filter(r=>r[metric.key]!=null)
    return {...metric,observed_months:observed.length,total_months:rows.length,first_period:observed[0]?.period??null,last_period:observed.at(-1)?.period??null}
  })
  return {scope:{territory:'Quezon',buyer_scope:'All',start:'2017-01',end:'2025-12',alignment:'same_calendar_month',independent_of_topbar:true},
    rows,coverage,coobserved_months:rows.filter(r=>r.sales!=null&&r.disease!=null&&r.tayabas!=null).length,
    checksum:createHash('sha256').update(JSON.stringify(input)).digest('hex'),
    interpretation:'Historical descriptive comparison only. Same-month alignment does not establish geographic exposure, causality or forecast-time availability.',
    limitations:['Sales are province-label recorded financial values, not medicine-unit demand or verified buyer ownership.',
      'DOH combines confirmed, probable and suspect/compatible surveillance classifications; revised onset counts have no reporting/revision timestamps.',
      'Tayabas and Alabat are separate point-station observations, not province-wide rainfall.',
      'NASA POWER is a distinct grid proxy; stored monthly observations are not current weather.',
      'Missing observations remain unavailable; no live alerts, trained forecasts or procurement actions are produced.']}
}
