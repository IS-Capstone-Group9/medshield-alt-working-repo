import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTerritorySignals, readTerritorySignals, territoryLabel, territorySignalSql} from '../src/territorySignals'

const release = '5df98130b9ec13ef'
const rows = [
  {territory_id: 'PH-PROVINCE-BATANGAS', calendar_month: '2024-08', signal_value: '0.412000', mapping_status: 'approved_proxy_20261110', kind: 'RSI'},
  {territory_id: 'PH-PROVINCE-CAMARINES-NORTE', calendar_month: '2024-08', signal_value: '0.731000', mapping_status: 'approved_proxy_20261110', kind: 'RSI'},
  {territory_id: 'PH-PROVINCE-BATANGAS', calendar_month: null, signal_value: '24', mapping_status: 'pending', kind: 'DII_PENDING'},
]

test('territory labels match confirmed delivery labels', () => {
  assert.equal(territoryLabel('PH-PROVINCE-CAMARINES-NORTE'), 'CAMARINES NORTE')
})

test('only approved RSI is served; DII is counted and withheld', () => {
  const out = buildTerritorySignals(release, rows)
  assert.equal(out.rsi.length, 2)
  assert.deepEqual(out.rsi[1], {area: 'CAMARINES NORTE', territory_id: 'PH-PROVINCE-CAMARINES-NORTE', month: '2024-08', rsi: 0.731})
  assert.equal(out.dii_status, 'withheld_pending_doh_territory_mapping')
  assert.equal(out.dii_pending[0].rows, 24)
  assert.equal(out.forecast_approved, false)
  assert.ok(!('dii' in out))
  const sql = territorySignalSql(release)
  assert.match(sql, /is_external_join_ready = true/)
  assert.match(sql, /release_5df98130b9ec13ef_territory_signal_monthly_v2/)
})

test('refuses bad releases and rows instead of substituting', async () => {
  assert.throws(() => territorySignalSql('x; DROP'), /Invalid warehouse release/)
  assert.throws(() => buildTerritorySignals(release, [rows[2]]), /No approved RSI/)
  assert.throws(() => buildTerritorySignals(release, [{...rows[0], signal_value: 'n/a'}]), /Invalid RSI/)
  const twoHeads = async () => ({rows: [{release_id: release}, {release_id: 'aaaaaaaaaaaaaaaa'}]}) as never
  await assert.rejects(readTerritorySignals(twoHeads), /No single current/)
  const calls: string[] = []
  const ok = (async (sql: string) => { calls.push(sql); return {rows: calls.length === 1 ? [{release_id: release}] : rows} }) as never
  assert.equal((await readTerritorySignals(ok)).release_id, release)
})
