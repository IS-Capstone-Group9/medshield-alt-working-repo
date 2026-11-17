import {AsyncLocalStorage} from 'node:async_hooks'
import type {DescriptiveRelease} from './descriptiveSource'
import {ITEMIZED_PREVIEW_BINDING} from './itemizedPreviewBinding'

export type FinancialScope = 'itemized' | 'contracts' | 'combined_unreconciled'
const context = new AsyncLocalStorage<FinancialScope>()
export const currentFinancialScope = (): FinancialScope => context.getStore() ?? 'itemized'
/** Async-local request context; never changes a shared release or another request's scope. */
export function withFinancialScope<T>(scope: FinancialScope, read: () => T): T { return context.run(scope, read) }
export class FinancialScopeError extends Error {
  constructor(message:string, public status=400) { super(message) }
}
export function parseFinancialScope(value:unknown):FinancialScope {
  if(value === undefined) return 'itemized'
  if(value !== 'itemized' && value !== 'contracts' && value !== 'combined_unreconciled')
    throw new FinancialScopeError('Invalid financial_scope. Use itemized, contracts or combined_unreconciled.')
  return value
}
export function authorizeFinancialScope(value:unknown,role:unknown):FinancialScope {
  const scope=parseFinancialScope(value)
  if(scope!=='itemized' && !['admin','analyst'].includes(String(role).toLowerCase()))
    throw new FinancialScopeError('Contract financial review requires an analyst or administrator.',403)
  return scope
}
export function financialScopeMetadata(scope=currentFinancialScope()) {
  const itemized=ITEMIZED_PREVIEW_BINDING.itemizedTable
  const contracts=itemized.replace(/_itemized_candidates$/,'_contract_candidates')
  return {id:scope, label:scope==='itemized'?'Exclude Contracts':scope==='contracts'?'Contracts Only':'Include Contracts — unreconciled',
    contracts_excluded:scope==='itemized', unreconciled:scope==='combined_unreconciled',
    additivity:'unverified', complete_company_sales:false, financial_release_approved:false,
    product_analysis_scope:'itemized', area_analysis_scope:'itemized', diagnostic_analysis_scope:'itemized', model_scope:'itemized',
    record_count_semantics:'recorded_entries_not_unique_economic_transactions', dimension_policy:'contract_details_unavailable',
    source_tables:scope==='itemized'?[itemized]:scope==='contracts'?[contracts]:[itemized,contracts],
    delta_version:0, note:scope==='itemized'?'Itemized financial candidates. Contracts excluded; not complete company sales.':
      scope==='contracts'?'Recorded contract summaries only. Product, quantity, buyer and area allocation unavailable. Financial release pending.':
        'Unreconciled arithmetic sum of recorded itemized and contract entries. Additivity and overlap are unverified; this is not confirmed company sales. Product analysis remains itemized-only.'}
}
export function scopedFinancialRelease(release:DescriptiveRelease) {
  const metadata=financialScopeMetadata()
  return {...release, financial_scope:release.original_itemized?metadata:{...metadata,
    source_tables:release.source_table?[release.source_table]:[],delta_version:release.fact_delta_version,
    note:'Source-bound legacy reporting; contract scopes require the original Gold adapter.'}}
}
