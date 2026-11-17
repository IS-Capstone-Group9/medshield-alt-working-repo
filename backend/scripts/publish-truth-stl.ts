import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {descriptiveRelease} from '../src/databricksDashboard'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {truthHash,truthTable} from '../src/analyticalTruth'
import {readTruthStl} from '../src/truthStl'
import {databricksLiteral} from '../src/databricksLiteral'
async function main(){
 const file=resolve(process.argv[2]),raw=readFileSync(file,'utf8'),expected=readFileSync(file.replace(/\.json$/,'.sha256'),'utf8').trim()
 assert.equal(truthHash(raw),expected);const p=JSON.parse(raw),release=await descriptiveRelease(),truth=release.analytical_integrity;assert.ok(truth)
 assert.equal(p.source_integrity_sha256,truth.manifest_sha256);assert.equal(p.source_table,truth.serving_table)
 await execute(`CREATE TABLE IF NOT EXISTS ${truthTable(truth.serving_table.replace(/_fact$/,'_stl'))} USING DELTA AS SELECT ${databricksLiteral(raw)} AS payload_json`,{rowLimit:1})
 const result=await readTruthStl(release,execute,expected)
 writeFileSync(file.replace(/\.json$/,'.publication.json'),JSON.stringify({verified_at:new Date().toISOString(),rows:result.rows.length,source:result.source,payload_sha256:expected},null,2)+'\n')
 console.log(JSON.stringify({status:'persisted_verified',rows:result.rows.length,payload_sha256:expected}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'STL publication failed');process.exitCode=1})
