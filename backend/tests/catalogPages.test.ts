import test from 'node:test'
import assert from 'node:assert/strict'
import {readCatalogPages} from '../src/catalogPages'

test('catalog pages bound admission and preserve source order despite out-of-order completion', async () => {
  let active=0, peak=0
  const result=await readCatalogPages(Array.from({length:24},(_,i)=>String(i)),async value=>{
    peak=Math.max(peak,++active)
    await new Promise(resolve=>setTimeout(resolve,Number(value)%2?1:4))
    active--
    return [Number(value)]
  })
  assert.equal(peak,4)
  assert.deepEqual(result,Array.from({length:24},(_,i)=>i))
})

test('failed catalog drains active reads and starts no more pages; a fresh load can retry', async () => {
  const calls:string[]=[]
  let active=0
  const failure=new Error('required Gold unavailable')
  await assert.rejects(readCatalogPages(['0','1','2','3'],async value=>{
    calls.push(value);active++
    try {
      if(value==='0') throw failure
      await new Promise(resolve=>setTimeout(resolve,10))
      return [value]
    } finally {active--}
  }),error=>error===failure)
  assert.equal(active,0)
  assert.deepEqual(calls,['0','1','2','3'])
  assert.deepEqual(await readCatalogPages(['0','1'],async value=>[value]),['0','1'])
  assert.deepEqual(await readCatalogPages([],async()=>{throw Error('not called')}),[])
})
