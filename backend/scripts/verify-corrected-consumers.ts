import 'dotenv/config'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {getDatabricksSalesSectors,getDatabricksPlanningShortlist,descriptiveRelease} from '../src/databricksDashboard'

async function main(){
 const output=resolve('../outputs/truth_correction_20261025/continuation/consumer-check');mkdirSync(output,{recursive:true})
 const started_at=new Date().toISOString(),release=await descriptiveRelease();assert.ok(release.analytical_integrity)
 const sectors=await getDatabricksSalesSectors()
 writeFileSync(resolve(output,'sectors.json'),JSON.stringify(sectors)+'\n')
 assert.equal(sectors.source.release?.analytical_integrity?.id,release.analytical_integrity.id)
 const total=sectors.rows.reduce((n,r)=>n+(r.revenue??0),0)
 assert.ok(Math.abs(total-637922399.53)<.01,'Catalog subset money conservation')
 const shortlist=await getDatabricksPlanningShortlist({sector:'All'})
 writeFileSync(resolve(output,'shortlist.json'),JSON.stringify(shortlist,null,2)+'\n')
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({status:'PASS',started_at,finished_at:new Date().toISOString(),correction:release.analytical_integrity.id,sectors_rows:sectors.rows.length,revenue:total,planning_checksum:shortlist.source.checksum,scope:'Live gateway functions, not signed-in browser acceptance'},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',rows:sectors.rows.length,revenue:total}))
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
