import 'dotenv/config'
import assert from 'node:assert/strict'
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {executeDatabricksStatement as execute} from '../src/databricks'
import {descriptiveBinding, readDescriptiveRelease} from '../src/descriptiveSource'
import {databricksLiteral as q} from '../src/databricksLiteral'
import {extensionDigest, validateExtensionResearch, EXTENSION_RESEARCH_TABLE} from '../src/extensionResearch'

async function main() {
  const [input, expected, output, mode] = process.argv.slice(2)
  assert.ok(input && /^[a-f0-9]{64}$/.test(expected) && output && ['--prepare', '--apply', '--verify'].includes(mode), 'Usage: stage-extension-research.ts extension-run.json BYTE_SHA256 output-directory --prepare|--apply|--verify')
  const raw = readFileSync(input, 'utf8'), run = JSON.parse(raw)
  assert.equal(extensionDigest(raw), expected)
  const hashes = JSON.parse(readFileSync(resolve(dirname(input), 'artifact-hashes.json'), 'utf8'))
  assert.equal(hashes['extension-run.json'], expected, 'Registered extension artifact hash')
  for (const [name, hash] of Object.entries(hashes)) {
    assert.ok(name === '../protocol.json' || /^[A-Za-z0-9_-]+\.(json|md)$/.test(name), 'Unsafe registered artifact path')
    assert.equal(extensionDigest(readFileSync(resolve(dirname(input), name), 'utf8')), hash, `Registered artifact ${name}`)
  }
  const release = await readDescriptiveRelease(descriptiveBinding())
  const validated = validateExtensionResearch(raw, expected, release)
  const id = validated.source.storage_id
  const existing = await execute(`SELECT artifact_hash, payload_json FROM ${EXTENSION_RESEARCH_TABLE} WHERE run_id=${q(id)}`, {rowLimit:2})
  assert.ok(existing.rows.length <= 1 && existing.rows.every(row => row.artifact_hash === expected && row.payload_json === raw), 'Immutable candidate conflict')
  const plan = {mode:'candidate_only', table:EXTENSION_RESEARCH_TABLE, storage_id:id, artifact_sha256:expected, dataset_id:release.dataset_id, fact_version:release.fact_delta_version, input_sha256:validated.source.input_sha256, model_pointer_modified:false, publication_approved:false}
  const dir = resolve(output); mkdirSync(dir, {recursive:true})
  if (mode === '--prepare') {
    const target=resolve(dir,'stage-plan.json'); assert.ok(!existsSync(target), 'Do not overwrite prior preparation')
    writeFileSync(target,JSON.stringify(plan,null,2)); console.log(JSON.stringify({status:'prepared_candidate_only',...plan})); return
  }
  assert.deepEqual(JSON.parse(readFileSync(resolve(dir,'stage-plan.json'),'utf8')), plan, 'Prepared stage identity differs')
  if (mode === '--apply' && !existing.rows.length) {
    const row = {run_id:id,model_id:run.selection.model_id,dataset_id:run.dataset_id,input_hash:run.identity.input_data_hash,code_hash:run.identity.code_identity.predictive_source_sha256,artifact_hash:expected,training_cutoff:'2026-09-01',payload_json:raw}
    const fields=Object.keys(row) as (keyof typeof row)[]
    await execute(`MERGE INTO ${EXTENSION_RESEARCH_TABLE} t USING (SELECT ${fields.map(f=>`${q(row[f])} AS ${f}`).join(',')}) s ON t.run_id=s.run_id WHEN NOT MATCHED THEN INSERT (${fields.join(',')}) VALUES (${fields.map(f=>`s.${f}`).join(',')})`)
  }
  const readback = await execute(`SELECT artifact_hash, payload_json FROM ${EXTENSION_RESEARCH_TABLE} WHERE run_id=${q(id)}`,{rowLimit:2})
  assert.equal(readback.rows.length,1); assert.equal(readback.rows[0].artifact_hash,expected); assert.equal(readback.rows[0].payload_json,raw)
  const receipt={status:'candidate_staged_verified_unpublished',...plan,comparisons:validated.comparisons.length,points:validated.points.length,checked_at:new Date().toISOString()}
  writeFileSync(resolve(dir,mode==='--verify'?'stage-verification.json':'stage-receipt.json'),JSON.stringify(receipt,null,2))
  console.log(JSON.stringify(receipt))
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
