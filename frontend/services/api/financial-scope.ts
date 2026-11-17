export type FinancialScope = 'itemized' | 'contracts' | 'combined_unreconciled'
let selected:FinancialScope='itemized'
let revision=0
export function financialScopeSelection() {return {scope:selected,revision}}
export function selectFinancialScope(scope:FinancialScope) {selected=scope;revision++;return financialScopeSelection()}
export function financialSelectionIsCurrent(selection:ReturnType<typeof financialScopeSelection>) {
  return selection.scope===selected && selection.revision===revision
}
