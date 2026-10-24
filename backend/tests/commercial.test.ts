import test from 'node:test'
import assert from 'node:assert/strict'
import Decimal from 'decimal.js'
import express from 'express'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { addMonths, balancedComponents, poDeadline } from '../src/commercial/utils/contracts'
import { prepareForecast, rollingForecast, validateManifest } from '../src/commercial/services/ForecastService'
import { allocate } from '../src/commercial/services/AllocationService'
import { reconcileReceipts, type ReceiptEvidence } from '../src/commercial/services/ReconciliationService'
import { allocationBody, forecastQuery } from '../src/commercial/validators/schemas'
import { createCommercialRouter } from '../src/commercial/controllers/router'
import { commercialFixture } from '../scripts/commercial-fixture'

const rows = Array.from({ length: 96 }, (_, i) => ({ period: addMonths('2018-01', i), value: 100000 + i * 100 + Math.sin(i * Math.PI / 6) * 10000 }))
const scope = { kind: 'company' as const, id: 'company:net_sales:PHP', category: null, target: 'net_sales' as const, unit: 'PHP' as const }
const source = { datasetId: 'synthetic-test-only', factVersion: 1, checksum: 'a'.repeat(64), mappingStatus: 'unverified' as const, evidenceClass: 'databricks_gold_candidate' as const }
test('calendar lead rule handles leap years and year boundaries exactly', () => {
  for (const period of ['2024-03', '2027-01', '2028-03']) {
    const result = poDeadline(period, 60, new Date('2023-01-01Z'))
    assert.equal((Date.parse(period + '-01') - Date.parse(result.poCutoffDate)) / 86400000, 60)
  }
  assert.equal(poDeadline('2026-11', 60, new Date('2026-10-24Z')).alertStatus, 'URGENT_ACTION_REQUIRED')
})
test('offline forecasts are deterministic, source anchored, and preserve decimal identity', () => {
  const manifest = prepareForecast(rows, '2025-12', 36, scope, source)
  assert.deepEqual(manifest, prepareForecast([...rows, { period: '2026-01', value: 1e12 }], '2025-12', 36, scope, source))
  assert.equal(manifest.points[23].period, '2027-12')
  for (const row of manifest.decomposition) assert.equal(new Decimal(row.observed).minus(row.baselineTrend).minus(row.seasonalCycle).minus(row.unexplainedVariance).toFixed(2), '0.00')
  assert.equal(validateManifest(manifest).runId, manifest.runId)
  assert.throws(() => prepareForecast(rows.filter((_, i) => i !== 30), '2025-12', 24, scope, source), /contiguous/)
  assert.throws(() => rollingForecast(manifest, forecastQuery.parse({ anchor: '2026-01' })), /never shifted/)
  const broken = structuredClone(manifest); broken.points[0].prediction = 'NaN'
  assert.throws(() => validateManifest(broken), /contract/)
  assert.throws(() => balancedComponents(100, 90, 20, 0), /reconcile/)
})
test('unsupported bands and horizons stay missing; category scenario is explicit', () => {
  const manifest = prepareForecast(rows.slice(-36), '2025-12', 12, { ...scope, kind: 'category', id: 'ANTIBIOTICS', category: 'ANTIBIOTICS' }, { ...source, mappingStatus: 'approved' })
  const result = rollingForecast(manifest, forecastQuery.parse({ anchor: '2025-12', scenario: 'monsoon', horizonMonths: '24' }))
  assert.equal(result.meta.scenarioMultiplier, 1.18)
  assert.equal(result.data[0].lowerBound, null)
  assert.equal(result.data[12].projectedSales, null)
  assert.equal(result.data[0].projectedUnits, null)
})
test('allocation conserves integer stock and exposes infeasible hospital and expiry constraints', () => {
  const input = allocationBody.parse({ anchorPeriod: '2026-09', targetPeriod: '2026-11', productId: '00000000-0000-4000-8000-000000000001', totalAvailableStock: 1000, clientPriorityRule: 'HOSPITAL_FIRST', clients: [{ clientId: 'hospital', category: 'HOSPITAL', requestedUnits: 1000, usableUnitsBeforeExpiry: 1000 }, { clientId: 'retail', category: 'RETAIL', requestedUnits: 100, usableUnitsBeforeExpiry: 100 }] })
  const result = allocate(input, input.clients!)
  assert.equal(result.status, 'feasible'); assert.equal(result.rows[0].allocatedUnits, 1000)
  assert.equal(result.allocatedUnits! + result.remainingUnits!, 1000)
  assert.equal(allocate({ ...input, totalAvailableStock: 984 }, input.clients!).status, 'infeasible')
  assert.equal(allocate({ ...input, totalAvailableStock: 2000 }, input.clients!).status, 'infeasible')
})
const receipt: ReceiptEvidence = { receipt_number: 'TEST', gross_amount: '112.00', vat_amount: '12.00', withholding_tax: '1.00', net_amount: '111.00', item_subtotal: '100.00', item_count: 1, paid_amount: '111.00', payment_count: 1, withholding_amount: '1.00', withholding_count: 1, verified_withholding_count: 1, evidence_class: 'verified_receipt', audited_at: '2026-01-01' }
test('receipt reconciliation rejects cancelling discrepancies and unverified evidence', () => {
  assert.equal(reconcileReceipts([receipt]).reconciliationChecksum, '0.00')
  assert.equal(reconcileReceipts([{ ...receipt, paid_amount: '110.00' }, { ...receipt, paid_amount: '112.00' }]).status, 'requires_review')
  assert.equal(reconcileReceipts([{ ...receipt, verified_withholding_count: 0 }]).reconciliationChecksum, null)
  assert.equal(reconcileReceipts([]).status, 'no_evidence')
})
test('requested benchmark fixture sums exactly and cannot claim audited actuals', () => {
  const fixture = commercialFixture()
  assert.equal(fixture.receipts.length, 3416)
  const total = fixture.receipts.reduce((sum, row) => sum.plus(row.grossAmount), new Decimal(0))
  assert.equal(total.toFixed(2), '142597413.20')
  assert.equal(total.plus(fixture.q4Projection).toFixed(2), fixture.fullYearBenchmark)
  assert.ok(fixture.receipts.every(row => !row.audited && row.evidenceClass === 'synthetic_test_fixture'))
})
test('HTTP validates dates, authorization, scopes and reports missing dependencies', async () => {
  const app = express(); app.use(express.json())
  app.use('/api', createCommercialRouter({ authenticate: (req, res, next) => req.headers.authorization ? next() : void res.sendStatus(401), authorize: roles => (req, res, next) => roles.includes(String(req.headers['x-role'])) ? next() : void res.sendStatus(403) }))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`
  try {
    assert.equal((await fetch(url + '/sales/monthly?anchor=2026-09')).status, 401)
    for (const query of ['anchor=2026-99', 'anchor=2026-09&window=custom&startDate=2026-02-30&endDate=2026-03-01', 'anchor=2026-09&unexpected=true']) {
      const response = await fetch(url + '/sales/monthly?' + query, { headers: { authorization: 'test' } })
      assert.equal(response.status, 400); assert.match(response.headers.get('content-type')!, /application\/problem\+json/)
      assert.equal((await response.json()).code, 'INVALID_REQUEST')
    }
    assert.equal((await fetch(url + '/audit/reconciliation?startDate=2026-01-01&endDate=2026-09-30', { headers: { authorization: 'test', 'x-role': 'analyst' } })).status, 403)
    const old = process.env.OPERATIONS_DATABASE_URL; delete process.env.OPERATIONS_DATABASE_URL
    try { assert.equal((await fetch(url + '/audit/reconciliation?startDate=2026-01-01&endDate=2026-09-30', { headers: { authorization: 'test', 'x-role': 'admin' } })).status, 503) }
    finally { if (old) process.env.OPERATIONS_DATABASE_URL = old }
  } finally { server.close(); await once(server, 'close') }
})
test('PostgreSQL migration enforces money, stock and receipt evidence constraints', async () => {
  const db = new PGlite()
  try {
    await db.exec(await readFile(path.resolve(__dirname, '../migrations/commercial/001_operations.sql'), 'utf8'))
    await db.exec(`INSERT INTO medshield_operations.product(id,sku,name,packaging_unit,units_per_pack,unit_price,cost_price) VALUES ('00000000-0000-4000-8000-000000000001','TEST','Synthetic','unit',1,100,80);
      INSERT INTO medshield_operations.client(id,account_code,name,category,region) VALUES ('00000000-0000-4000-8000-000000000002','TEST','Synthetic','HOSPITAL','TEST');`)
    await assert.rejects(db.exec("INSERT INTO medshield_operations.inventory_lot(product_id,lot_number,expires_on,units_on_hand) VALUES ('00000000-0000-4000-8000-000000000001','TEST','2027-01-01',-1)"), /check constraint/)
    await assert.rejects(db.exec("INSERT INTO medshield_operations.sales_receipt(receipt_number,client_id,delivery_date,gross_amount,vat_amount,withholding_tax,net_amount,evidence_class,status) VALUES ('BAD','00000000-0000-4000-8000-000000000002','2026-01-01',100,0,0,100,'synthetic_test_fixture','RECONCILED')"), /complete reconciled evidence/)
    await db.exec(`BEGIN;
      INSERT INTO medshield_operations.sales_receipt(id,receipt_number,client_id,delivery_date,gross_amount,vat_amount,withholding_tax,net_amount,evidence_class,status,source_document_sha256,audited_at,audited_by) VALUES ('00000000-0000-4000-8000-000000000003','TEST','00000000-0000-4000-8000-000000000002','2026-01-01',100,0,0,100,'verified_receipt','RECONCILED',repeat('a',64),now(),'test-only');
      INSERT INTO medshield_operations.sales_item(receipt_id,product_id,quantity,unit_price,lot_number,expiration_date) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001',1,100,'TEST','2027-01-01');
      INSERT INTO medshield_operations.ledger_payment(receipt_id,ledger_reference,amount,status,paid_on) VALUES ('00000000-0000-4000-8000-000000000003','TEST',100,'POSTED','2026-01-01'); COMMIT;`)
    await assert.rejects(db.exec("UPDATE medshield_operations.ledger_payment SET amount=99 WHERE ledger_reference='TEST'"), /complete reconciled evidence/)
    assert.equal((await db.query<{ count: number }>('SELECT count(*)::int AS count FROM medshield_operations.sales_receipt')).rows[0].count, 1)
  } finally { await db.close() }
})
