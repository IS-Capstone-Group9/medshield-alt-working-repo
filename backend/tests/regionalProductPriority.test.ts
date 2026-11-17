import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {validateRegionalProductPriority,regionalProductPrioritySql,readRegionalProductPriority} from '../src/regionalProductPriority'
import {buildRegionalDecisionBoard,readRegionalDecisionBoard} from '../src/regionalDecisionBoard'
import {validateRegionalStl} from '../src/regionalStlReview'
import {decimalMicros} from '../src/itemizedPreview'
import {microsText} from '../src/regionalSalesReview'

const financial=JSON.parse(readFileSync('../outputs/so1_regional_stl_20261028/source.json','utf8'))
const stl=validateRegionalStl(readFileSync('../outputs/so1_regional_stl_20261028/analysis.json','utf8'),financial)
type Row=Record<string,string|null>
// Deliberately synthetic product allocation of retained regional controls; not company product results.
function syntheticRows():Row[]{
  const rows:Row[]=[]
  const labels=new Map<string,string>(financial.mappings.map((m:{region:string;recorded_label:string})=>[m.region,m.recorded_label]))
  for(const m of financial.months.filter((m:{region:string;period:string})=>labels.has(m.region)&&/^(2025|2026)-/.test(m.period))){
    const split=m.net_eligible_records>1,margin=split&&m.margin_eligible_records>0?1:0,unreviewed=split&&m.unreviewed_records>0?1:0
    const row:Row={area:labels.get(m.region)!,period:m.period,product:'Synthetic positive',records:String(m.records-(split?1:0)),net_eligible_records:String(m.net_eligible_records-(split?1:0)),
      margin_eligible_records:String(m.margin_eligible_records-margin),unreviewed_records:String(m.unreviewed_records-unreviewed),invalid_margin_pairs:'0',
      net_sales_php:m.net_sales_php===null?null:microsText(decimalMicros(m.net_sales_php)+(split?1_000_000n:0n)),
      gross_profit_php:m.margin_eligible_records-margin?m.gross_profit_php:null,
      margin_revenue_basis_php:m.margin_eligible_records-margin?microsText(decimalMicros(m.margin_revenue_basis_php)+(margin?1_000_000n:0n)):null}
    // A single margin-eligible row cannot be split while retaining a second nonzero margin amount.
    if(split&&m.margin_eligible_records===1){row.gross_profit_php=null;row.margin_revenue_basis_php=null}
    rows.push(row)
    if(split)rows.push({area:labels.get(m.region)!,period:m.period,product:'Synthetic signed adjustment',records:'1',net_eligible_records:'1',margin_eligible_records:String(margin),
      unreviewed_records:String(unreviewed),net_sales_php:'-1.000000',gross_profit_php:margin?(m.margin_eligible_records===1?m.gross_profit_php:'0.000000'):null,
      margin_revenue_basis_php:margin?(m.margin_eligible_records===1?m.margin_revenue_basis_php:'-1.000000'):null,invalid_margin_pairs:'0'})
  }
  return rows
}
const compiled=ts.transpileModule(readFileSync('../frontend/services/api/regional-decision-board.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const ui:{validRegionalDecisionBoard?:(value:unknown)=>boolean;regionalDecisionBoardCsv?:(value:unknown)=>string}={}
vm.runInNewContext(compiled,{exports:ui,require:()=>({})})

test('priority SQL is read-only, version-pinned and uses only confirmed delivery labels',()=>{
  const sql=regionalProductPrioritySql(financial)
  assert.match(sql,/VERSION AS OF 0/);assert.match(sql,/normalized_product AS product/)
  assert.match(sql,/decode\(unhex\('/);assert.ok(!/\bJOIN\b|INSERT|UPDATE|DELETE|CREATE/i.test(sql))
  const literals=[...sql.matchAll(/unhex\('([a-f0-9]+)'\)/g)].map(m=>Buffer.from(m[1],'hex').toString('utf8'))
  assert.deepEqual(literals,[...financial.mappings.map((m:{recorded_label:string})=>m.recorded_label),'2025-01-01','2027-01-01'])
  assert.ok(!literals.includes('HOSPITAL'));assert.match(sql,/COUNT_IF\(is_net_sales_technically_eligible\)/)
  const changed=structuredClone(financial);changed.source.fact_table='private.other'
  assert.throws(()=>regionalProductPrioritySql(changed))
})

test('signed offsets reconcile; missing regional/product periods remain unavailable',()=>{
  const result=validateRegionalProductPriority(financial,syntheticRows())
  const r=result.regions.find(r=>r.region==='CALABARZON')!
  assert.equal(r.status,'available');assert.equal(r.matched_months.length,9)
  assert.equal(r.target_unreviewed_records,842);assert.equal(r.base_unreviewed_records,0)
  assert.equal(r.top_products[0].product,'Synthetic positive')
  assert.equal(r.nonpositive_product_net_sales_php,'-9.000000')
  assert.equal(decimalMicros(r.positive_product_net_sales_php!)+decimalMicros(r.nonpositive_product_net_sales_php!),decimalMicros(r.target_net_sales_php!))
  assert.equal(result.regions.find(r=>r.region==='BICOL')!.target_net_sales_php,null)
  const renamed=syntheticRows().map(row=>row.period!.startsWith('2025-')?{...row,product:'Prior-only '+row.product}:row)
  const newLabel=validateRegionalProductPriority(financial,renamed).regions[0].top_products[0]
  assert.equal(newLabel.base_net_sales_php,null);assert.equal(newLabel.change_php,null);assert.equal(newLabel.base_records,0)
  assert.equal(result.units_approved,false);assert.equal(result.clinical_priority,false)
})

test('partial, duplicate, wrong-scope, changed-source and unreconciled data fail closed',()=>{
  const rows=syntheticRows()
  for(const mutate of [
    (r:Row[])=>r.pop(),(r:Row[])=>r.push(r[0]),(r:Row[])=>{r[0].area='HOSPITAL'},
    (r:Row[])=>{r[0].period='2024-01'},(r:Row[])=>{r[0].records='0'},
    (r:Row[])=>{r[0].net_sales_php='999999.000000'},(r:Row[])=>{r[0].gross_profit_php='999999.000000'},
    (r:Row[])=>{r[0].invalid_margin_pairs='1'},(r:Row[])=>{r[0].product=null}
  ]){const changed=structuredClone(rows);mutate(changed);assert.throws(()=>validateRegionalProductPriority(financial,changed))}
  const changed=structuredClone(financial);changed.source.mapping_sha256='different'
  assert.throws(()=>validateRegionalProductPriority(changed,rows))
})

test('actual board/frontend/CSV retain validated priority and reject inconsistent metadata',()=>{
  const priority=validateRegionalProductPriority(financial,syntheticRows()),board=buildRegionalDecisionBoard(financial,stl,priority)
  assert.equal(board.schema_version,'regional_decision_board_v2');assert.equal(ui.validRegionalDecisionBoard!(board),true)
  const row=board.rows.find(r=>r.region==='CALABARZON'&&r.domain==='product_priority')!
  assert.equal(row.status,'available');assert.match(row.findings,/Synthetic positive/);assert.match(row.reason,/not verified medicine/)
  const csv=ui.regionalDecisionBoardCsv!(board);assert.match(csv,new RegExp(priority.query_sha256));assert.match(csv,/matched_regional_recorded_product_net_sales_v1/)
  for(const mutate of [
    (b:typeof board)=>{b.product_priority=null},(b:typeof board)=>{b.product_priority!.query_sha256='bad'},
    (b:typeof board)=>{b.product_priority!.units_approved=true as false},
    (b:typeof board)=>{b.product_priority!.regions[0].top_products[0].change_php='999.000000'},
    (b:typeof board)=>{b.product_priority!.regions[0].target_net_sales_php='999.000000'},
    (b:typeof board)=>{b.product_priority!.source.dataset_id='other'},
    (b:typeof board)=>{b.source.fact_table='other.fact'},
    (b:typeof board)=>{b.product_priority!.regions[0].matched_months=['01']},
    (b:typeof board)=>{b.product_priority!.regions[0].target_unreviewed_records=-1},
    (b:typeof board)=>{b.records[1][15]='mismatched hash'},
  ]){const changed=structuredClone(board);mutate(changed);assert.equal(ui.validRegionalDecisionBoard!(changed),false)}
})

test('optional product-query failure leaves domain unavailable; required source failures propagate',async()=>{
  let calls=0
  const result=await readRegionalDecisionBoard(async()=>financial,async()=>stl,async()=>{calls++;throw Error('private upstream detail')})
  assert.equal(calls,1);assert.equal(result.product_priority,null);assert.ok(!JSON.stringify(result).includes('private upstream'))
  assert.equal(result.rows.filter(r=>r.domain==='product_priority').every(r=>r.status==='unavailable'),true)
  assert.equal(ui.validRegionalDecisionBoard!(result),true)
  await assert.rejects(readRegionalDecisionBoard(async()=>{throw Error('required source')},async()=>stl,async()=>{throw Error('should not run')}))
  const priority=await readRegionalProductPriority(financial,async(sql,options)=>{assert.equal(sql,regionalProductPrioritySql(financial));assert.equal(options?.rowLimit,50_000);return {columns:[],rows:syntheticRows(),statement_id:'synthetic',row_count:syntheticRows().length} as never})
  assert.equal(priority.schema_version,'regional_recorded_product_priority_v1')
})
