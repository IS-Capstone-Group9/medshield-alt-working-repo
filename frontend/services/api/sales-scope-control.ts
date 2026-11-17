import type {User} from '@/lib/auth-tokens'
import type {ListenerRecord} from './dashboard-engine'
import {financialScopeSelection,selectFinancialScope,type FinancialScope} from './financial-scope'

const SCOPE_LABELS:Record<FinancialScope,string>={itemized:'Exclude Contracts',contracts:'Contracts Only',combined_unreconciled:'Include Contracts — unreconciled'}
const SCOPE_GUIDANCE='Applies to financial totals. Product, area, quantity, diagnostic and model analyses remain itemized-only.'
const UNRECONCILED_WARNING='Unreconciled recorded sum. Contract overlap and additivity are unverified; this is not confirmed company sales.'

/** Keep both presentations and the persistent KPI context on the same request state. */
export function updateSalesScopeStatus(root:HTMLElement,message:string,state:'loading'|'ready'|'unavailable'='ready') {
  root.querySelectorAll<HTMLElement>('[data-financial-scope-description]').forEach(node=>{node.textContent=message;node.dataset.scopeState=state})
  const status=root.querySelector<HTMLElement>('#salesScopeContextStatus')
  if(status) status.textContent=state==='loading'?'Loading…':state==='unavailable'?'Unavailable':''
}

/** Shared financial selection; product/dimension analyses retain itemized evidence. */
export function installSalesScopeControl(root:HTMLElement,listeners:ListenerRecord[],user:User|null) {
  const content=root.querySelector('.content')
  const filters=root.querySelector('#filterBar')
  if(!content||!filters||root.querySelector('#salesScopeSelect')) return
  selectFinancialScope('itemized')
  const canReview=['admin','analyst'].includes(user?.role.toLowerCase()??'')
  const selects:HTMLSelectElement[]=[]
  const labels:HTMLElement[]=[]
  const warnings:HTMLElement[]=[]
  const synchronize=()=>{
    const {scope}=financialScopeSelection()
    selects.forEach(select=>{select.value=scope})
    labels.forEach(label=>{label.textContent='Financial scope: '+SCOPE_LABELS[scope]})
    warnings.forEach(warning=>{warning.hidden=scope!=='combined_unreconciled'})
  }
  const change=(scope:FinancialScope)=>{
    selectFinancialScope(scope)
    synchronize()
    updateSalesScopeStatus(root,'Loading selected financial scope…','loading')
    window.dispatchEvent(new CustomEvent('medshield:financial-scope-change'))
  }
  const createControl=(ledger:boolean)=>{
    const field=document.createElement('div');field.className='sales-scope-control'+(ledger?' sales-scope-ledger dashboard-filter-panel':'')
    const id=ledger?'salesScopeLedgerSelect':'salesScopeSelect'
    const descriptionId=ledger?'salesScopeLedgerDescription':'salesScopeDescription'
    const warningId=ledger?'salesScopeLedgerWarning':'salesScopeContextWarning'
    const label=document.createElement('label');label.htmlFor=id;label.textContent='Financial scope'
    const select=document.createElement('select');select.id=id;select.className='topbar-select'
    select.title='Exclude Contracts shows itemized sales only; contracts without product detail are excluded. This is not complete company revenue.'
    select.setAttribute('aria-describedby',descriptionId+' '+warningId)
    for(const scope of Object.keys(SCOPE_LABELS) as FinancialScope[]) {
      if(scope==='itemized'||canReview) select.add(new Option(SCOPE_LABELS[scope],scope))
    }
    selects.push(select)
    const description=document.createElement('p');description.id=descriptionId
    description.setAttribute('data-financial-scope-description','');description.setAttribute('role','status')
    description.textContent=SCOPE_GUIDANCE;description.dataset.scopeState='guidance'
    const onChange=()=>change(select.value as FinancialScope)
    select.addEventListener('change',onChange)
    listeners.push({target:select,type:'change',listener:onChange})
    const retry=document.createElement('button');retry.type='button';retry.className='btn btn-secondary'
    retry.textContent='Refresh scope'
    const onRetry=()=>change(financialScopeSelection().scope)
    retry.addEventListener('click',onRetry);listeners.push({target:retry,type:'click',listener:onRetry})
    label.append(select);field.append(label,retry,description)
    if(ledger) {
      const warning=document.createElement('p');warning.id=warningId;warning.className='sales-scope-warning'
      warning.textContent=UNRECONCILED_WARNING;warnings.push(warning);field.append(warning)
    }
    return field
  }
  ;(filters.querySelector('.comparison-selector')??filters).prepend(createControl(false))
  root.querySelector('#page-sales-data')?.prepend(createControl(true))

  // A sibling of the filters stays visible when those controls are collapsed.
  const context=document.createElement('div');context.id='salesScopeContext';context.className='financial-scope-context'
  context.setAttribute('aria-label','Selected financial scope')
  const badge=document.createElement('span');badge.className='financial-scope-badge';labels.push(badge)
  const status=document.createElement('span');status.id='salesScopeContextStatus';status.setAttribute('role','status')
  const warning=document.createElement('span');warning.id='salesScopeContextWarning';warning.className='sales-scope-warning'
  warning.textContent=UNRECONCILED_WARNING;warnings.push(warning)
  context.append(badge,status,warning);filters.after(context)
  synchronize()
}
