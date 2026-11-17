import test from 'node:test'
import assert from 'node:assert/strict'
import {deflateSync} from 'node:zlib'
import {assertMetadataOnlySourceHistory,readItemizedPreviewSource} from '../src/itemizedPreview'
import {ITEMIZED_PREVIEW_BINDING as pin} from '../src/itemizedPreviewBinding'

const canonical=(v:any):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v)
const history=[{version:'2',operation:'COMPUTE STATS'},{version:'1',operation:'SET TBLPROPERTIES'},{version:'0',operation:'CREATE TABLE AS SELECT'}]

test('complete bounded stats/property history is accepted without accepting data/schema operations',()=>{
  assert.doesNotThrow(()=>assertMetadataOnlySourceHistory(history,2))
  for(const operation of ['WRITE','MERGE','DELETE','UPDATE','OPTIMIZE','ALTER TABLE ADD COLUMNS','RESTORE','']){
    assert.throws(()=>assertMetadataOnlySourceHistory([{version:'2',operation:'COMPUTE STATS'},{version:'1',operation},history[2]],2))
  }
  for(const rows of [history.slice(0,2),[history[0],history[0],history[2]],[history[1],history[0],history[2]]])assert.throws(()=>assertMetadataOnlySourceHistory(rows,2))
  assert.throws(()=>assertMetadataOnlySourceHistory(history,26))
})

test('actual source reader accepts metadata maintenance and still checks pinned receipt and full controls',async()=>{
  const calls:string[]=[];let badReceipt=false,badControls=false,dataWrite=false
  const execute=async(sql:string)=>{
    calls.push(sql)
    let rows:any[]
    if(sql.startsWith('DESCRIBE HISTORY'))rows=sql.includes('itemized_candidates')?
      sql.endsWith('LIMIT 1')?[history[0]]:dataWrite?[history[0],{version:'1',operation:'WRITE'},history[2]]:history:[{version:'0'}]
    else if(sql.includes('payload_b64'))rows=[{dataset_id:pin.datasetId,record_id:'gold_receipt',payload_sha256:badReceipt?'bad':pin.receiptSha256,payload_b64:deflateSync(Buffer.from(canonical(pin.expectedGoldReceipt))).toString('base64')}]
    else if(sql.includes('invalid_rows'))rows=[{records:String(pin.expectedRecords),unique_records:String(pin.expectedRecords),dataset_count:'1',dataset_id:pin.datasetId,policy_count:'1',policy_version:pin.policy,keys_sha256:pin.keysSha256,eligible_records:String(pin.expectedEligibleRecords),eligible_net:pin.expectedNet,invalid_rows:badControls?'1':'0'}]
    else throw Error('Unexpected fixture SQL')
    return {rows,columns:Object.keys(rows[0]??{})}
  }
  const source=await readItemizedPreviewSource(execute)
  assert.equal(source.dataset_id,pin.datasetId)
  assert.ok(calls.filter(sql=>sql.includes('SELECT')).every(sql=>sql.includes('VERSION AS OF 0')))
  assert.ok(calls.some(sql=>sql.endsWith('LIMIT 3')))
  badReceipt=true;await assert.rejects(readItemizedPreviewSource(execute));badReceipt=false
  badControls=true;await assert.rejects(readItemizedPreviewSource(execute));badControls=false
  dataWrite=true;await assert.rejects(readItemizedPreviewSource(execute))
})
