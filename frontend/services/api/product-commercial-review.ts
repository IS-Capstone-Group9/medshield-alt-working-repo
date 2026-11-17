import type { ProductSalesRow } from './descriptive-products'

export type CommercialRow = ProductSalesRow & {
  income?: number | null; margin_revenue_basis?: number | null; row_count?: number; source_data_status?: string
}
export type CommercialScope = {start_date: string; end_date: string} | null

/** Gold-projected financial observations only; no forecast, stock or inferred unit fields. */
export function productCommercialReview(source: CommercialRow[], selected: CommercialRow[], category = 'All', scope: CommercialScope = null) {
  const number = (value: unknown): value is number => value !== null && value !== undefined && Number.isFinite(Number(value))
  const micros = (value: number) => BigInt(Number(value).toFixed(6).replace('.',''))
  const amount = (value: bigint | null) => value === null ? null : Number(value)/1e6
  const applicable = (row: CommercialRow) => row.evidence !== 'estimate' && (category === 'All' || (row.category || 'Unclassified') === category)
  const identity = (row: CommercialRow) => row.canonical_group_id || String(row.canonical_title || row.product || '').trim() || 'Unspecified product'
  const blank = (id: string, name: string) => ({id, name, revenue: null as bigint | null, positiveSales: null as bigint | null,
    grossProfit: null as bigint | null, marginBasis: null as bigint | null, records: 0, netRecords: 0, marginRecords: 0,
    recordCountsKnown: true, marginCountsKnown: true, invalidContributionRows: 0, unsupportedNet: 0n, observedMonths: new Set<string>(), provenance: new Set<string>()})
  const add = (total: ReturnType<typeof blank>, row: CommercialRow) => {
    const count = row.row_count
    const knownCount = Number.isSafeInteger(count) && Number(count) > 0
    total.recordCountsKnown &&= knownCount
    if (knownCount) total.records += Number(count)
    // Aggregate rows do not reveal how many underlying records support a metric.
    if (count !== 1) total.marginCountsKnown = false
    if (number(row.revenue)) {
      total.revenue = (total.revenue ?? 0n) + micros(row.revenue)
      if (count === 1) total.netRecords++
      if (number(row.positive_sales) && number(row.returns_value) && Number(row.positive_sales) >= 0 && Number(row.returns_value) <= 0
          && Math.abs(Number(row.positive_sales) + Number(row.returns_value) - Number(row.revenue)) <= .011)
        total.positiveSales = (total.positiveSales ?? 0n) + micros(row.positive_sales)
      else total.invalidContributionRows++
      if (!number(row.income) || !number(row.margin_revenue_basis)) total.unsupportedNet += micros(row.revenue)
    }
    if (number(row.income) && number(row.margin_revenue_basis)) {
      total.grossProfit = (total.grossProfit ?? 0n) + micros(row.income)
      total.marginBasis = (total.marginBasis ?? 0n) + micros(row.margin_revenue_basis)
      if (count === 1) total.marginRecords++
    }
    if (row.period || row.date) total.observedMonths.add(String(row.period || row.date).slice(0,7))
    total.provenance.add(row.source_data_status || row.product_evidence || row.transaction_evidence || 'Unavailable')
  }
  const finish = (total: ReturnType<typeof blank>) => ({id: total.id, name: total.name, revenue: amount(total.revenue),
    positiveSales: total.invalidContributionRows ? null : amount(total.positiveSales), grossProfit: amount(total.grossProfit),
    marginBasis: amount(total.marginBasis), marginPct: total.grossProfit !== null && total.marginBasis !== null && total.marginBasis > 0n
      ? 100 * Number(total.grossProfit) / Number(total.marginBasis) : null,
    netWithoutMarginSupport: total.revenue === null ? null : amount(total.unsupportedNet),
    records: total.recordCountsKnown ? total.records : null,
    netRecords: total.recordCountsKnown && total.marginCountsKnown ? total.netRecords : null,
    marginRecords: total.recordCountsKnown && total.marginCountsKnown ? total.marginRecords : null,
    marginCoveragePct: total.recordCountsKnown && total.marginCountsKnown && total.records > 0 ? 100 * total.marginRecords / total.records : null,
    observedMonths: total.observedMonths.size, sourceStatus: [...total.provenance].sort().join('; ')})
  const groups = new Map<string, ReturnType<typeof blank>>()
  const summary = blank('all', 'Selected population')
  for (const row of selected.filter(applicable)) {
    const id = identity(row), total = groups.get(id) || blank(id, String(row.canonical_title || row.product || id))
    add(total, row); add(summary, row); groups.set(id,total)
  }
  const comparison = {available: false, reason: 'Choose a date range of at most 366 days for matching prior-year comparison.',
    currentStart: scope?.start_date ?? null, currentEnd: scope?.end_date ?? null, priorStart: null as string | null, priorEnd: null as string | null,
    matchedMonths: [] as string[], omittedMonths: [] as string[], currentNet: null as number | null, priorNet: null as number | null}
  const growth = new Map<string, {current: bigint | null; prior: bigint | null}>()
  const company = {current: null as bigint | null, prior: null as bigint | null}
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date
  const shiftYear = (date: string) => {
    const year = Number(date.slice(0,4))-1, month = Number(date.slice(5,7)), day = Number(date.slice(8,10))
    return year + '-' + String(month).padStart(2,'0') + '-' + String(Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate())).padStart(2,'0')
  }
  if (scope && validDate(scope.start_date) && validDate(scope.end_date) && scope.end_date >= scope.start_date
      && Date.parse(scope.end_date)-Date.parse(scope.start_date) < 366*86400000) {
    const allObserved = source.filter(row => row.evidence !== 'estimate')
    const undated = allObserved.some(row => !row.date || !validDate(row.date))
    comparison.priorStart = shiftYear(scope.start_date); comparison.priorEnd = shiftYear(scope.end_date)
    if (comparison.priorEnd >= scope.start_date) comparison.reason = 'Choose non-overlapping current and prior-year date windows.'
    else if (undated) comparison.reason = 'Exact dated source rows are required for comparable-period growth.'
    else {
      const current = allObserved.filter(row => row.date! >= scope.start_date && row.date! <= scope.end_date)
      const prior = allObserved.filter(row => row.date! >= comparison.priorStart! && row.date! <= comparison.priorEnd!)
      // Match month presence before category/product filtering. Absence never becomes zero sales.
      const priorMonths = new Set(prior.map(row => row.date!.slice(0,7)))
      const currentMonths = [...new Set(current.map(row => row.date!.slice(0,7)))].sort()
      comparison.matchedMonths = currentMonths.filter(month => priorMonths.has(shiftYear(month+'-01').slice(0,7)))
      comparison.omittedMonths = currentMonths.filter(month => !comparison.matchedMonths.includes(month))
      // Include wholly absent current months in the disclosed window coverage.
      for (let month = scope.start_date.slice(0,7); month <= scope.end_date.slice(0,7);) {
        if (!comparison.matchedMonths.includes(month) && !comparison.omittedMonths.includes(month)) comparison.omittedMonths.push(month)
        const next = new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1))
        month = next.toISOString().slice(0,7)
      }
      comparison.available = comparison.matchedMonths.length > 0
      comparison.reason = comparison.available ? 'Only matching observed company months, within the exact selected/prior date bounds; leap-day bounds clamp to February 28. Product completeness is not certified.' : 'No matching observed company months in the two date windows.'
      const currentSet = new Set(comparison.matchedMonths)
      const priorSet = new Set(comparison.matchedMonths.map(month => shiftYear(month+'-01').slice(0,7)))
      for (const [rows, side, months] of [[current,'current',currentSet],[prior,'prior',priorSet]] as const) {
        for (const row of rows.filter(applicable)) {
          if (!months.has(row.date!.slice(0,7)) || !number(row.revenue)) continue
          const id = identity(row), total = growth.get(id) || {current: null, prior: null}
          total[side] = (total[side] ?? 0n) + micros(row.revenue); growth.set(id,total)
          company[side] = (company[side] ?? 0n) + micros(row.revenue)
        }
      }
    }
  }
  comparison.currentNet = amount(company.current); comparison.priorNet = amount(company.prior)
  const products = [...groups.values()].map(total => {
    const finance = finish(total), matched = growth.get(total.id)
    const current = amount(matched?.current ?? null), prior = amount(matched?.prior ?? null)
    const change = matched?.current != null && matched?.prior != null ? Number(matched.current-matched.prior)/1e6 : null
    const growthPct = change !== null && prior !== null && prior > 0 ? 100*change/prior : null
    return {...finance, matchedCurrent: current, matchedPrior: prior, change, growthPct,
      comparisonStatus: change === null ? 'Unavailable: missing eligible observations on one or both sides' : prior! <= 0 ? 'Signed change available; percentage unavailable on a nonpositive baseline' : 'Matching company months; product completeness unverified'}
  })
  return {summary: finish(summary), products, comparison, excludedEstimates: selected.filter(row => row.evidence === 'estimate').length,
    counts: {declines: products.filter(r => r.change !== null && r.change < 0).length,
      negativeProfit: products.filter(r => r.grossProfit !== null && r.grossProfit < 0).length,
      marginGaps: products.filter(r => r.marginCoveragePct === null || r.marginCoveragePct < 100).length}}
}

export function productCommercialQueue(model: ReturnType<typeof productCommercialReview>, focus: string) {
  const rows = model.products.filter(row => focus === 'declines' ? row.change !== null && row.change < 0 :
    focus === 'negative_profit' ? row.grossProfit !== null && row.grossProfit < 0 :
    focus === 'margin_gaps' ? row.marginCoveragePct === null || row.marginCoveragePct < 100 : row.positiveSales !== null && row.positiveSales > 0)
  return rows.sort((a,b) => (focus === 'declines' ? a.change! - b.change! : focus === 'negative_profit' ? a.grossProfit! - b.grossProfit! :
    focus === 'margin_gaps' ? (b.netWithoutMarginSupport ?? -Infinity)-(a.netWithoutMarginSupport ?? -Infinity) || (b.positiveSales ?? -Infinity)-(a.positiveSales ?? -Infinity) :
    (b.positiveSales ?? -Infinity)-(a.positiveSales ?? -Infinity)) || a.id.localeCompare(b.id))
}

/** Self-contained: embedded into the dashboard execution closure through toString(). */
export function productCommercialRecommendation(row: ReturnType<typeof productCommercialReview>['products'][number]) {
  const common={policy:'observed_product_follow_up_v1',status:'review_recommendation_not_purchase_instruction'}
  if(row.revenue===null)return {...common,code:'confirm_sales_evidence',owner:'Sales and source owner',
    action:'Confirm the recorded sales evidence',reason:'Eligible recorded net sales are unavailable for this label in the selected scope.',
    followUp:'Resolve source amounts and eligibility before setting a product sales or stocking target.'}
  if(row.revenue<=0)return {...common,code:'review_signed_adjustments',owner:'Finance and sales lead',
    action:'Reconcile invoices and signed adjustments',reason:'Selected-period signed net sales are nonpositive. This does not establish physical returns or low demand.',
    followUp:'Document the supporting invoices and adjustment explanation before proposing a stock change.'}
  if(row.grossProfit!==null&&row.grossProfit<0)return {...common,code:'review_negative_profit',owner:'Finance and purchasing lead',
    action:'Review recorded acquisition costs and discounts',reason:'Supported gross profit is negative on its matching revenue subset; unsupported records remain outside that profit amount.',
    followUp:'Check invoice prices, discounts, acquisition costs and credits. Record the verified explanation before changing selling terms or purchasing.'}
  if(row.change!==null&&row.change<0)return {...common,code:'investigate_sales_decline',owner:'Sales lead',
    action:'Investigate the comparable-period sales decline',reason:'Recorded net sales declined on the matching observed company months. Product reporting completeness and the cause remain unverified.',
    followUp:'Inspect the matched-period invoices, label or pack changes and delivery records; confirm current customer requirements before changing stock.'}
  if(row.marginCoveragePct===null||row.grossProfit===null||row.marginBasis===null)return {...common,code:'confirm_margin_support',owner:'Finance and source owner',
    action:'Confirm the cost and margin evidence',reason:'Paired profit amounts or supporting-record coverage are unavailable; a complete product margin cannot be inferred.',
    followUp:'Obtain paired acquisition-cost and revenue support and eligible record counts before comparing profitability.'}
  if(row.marginCoveragePct<100)return {...common,code:'reconcile_margin_gaps',owner:'Finance and source owner',
    action:'Reconcile records missing paired cost support',reason:'Supported gross profit covers only part of the retained records. Missing profit is not zero profit.',
    followUp:'Review the unsupported source records and document supported cost corrections before relying on whole-product profitability.'}
  return {...common,code:'review_service_requirements',owner:'Sales and inventory lead',
    action:'Review customer requirements and service availability',reason:'This label has positive recorded net sales with paired margin-record support in the selected scope. This is historical financial evidence.',
    followUp:'Confirm current requirements, available stock and lead time at the next planning review before committing supply; no order quantity is inferred.'}
}
