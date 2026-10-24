import { writeFile } from 'node:fs/promises'
import Decimal from 'decimal.js'

/** Requested benchmark is a synthetic QA fixture, never an audited production source. */
export function commercialFixture() {
  const count = 3416, totalCents = 14259741320n, base = totalCents / BigInt(count), remainder = totalCents % BigInt(count)
  const receipts = Array.from({ length: count }, (_, i) => ({ receiptNumber: `SYNTHETIC-${String(i + 1).padStart(4, '0')}`, period: `2026-${String(i % 9 + 1).padStart(2, '0')}`, grossAmount: new Decimal((base + (BigInt(i) < remainder ? 1n : 0n)).toString()).div(100).toFixed(2), evidenceClass: 'synthetic_test_fixture', audited: false }))
  return { classification: 'synthetic_test_fixture', productionUse: false, receipts, q4Projection: '61080000.00', fullYearBenchmark: '203677413.20' }
}
if (require.main === module) {
  const file = process.argv[2]
  if (process.env.NODE_ENV !== 'test' || !file) { console.error('Use NODE_ENV=test and provide an output JSON path. No database is seeded.'); process.exitCode = 1 }
  else writeFile(file, JSON.stringify(commercialFixture(), null, 2), { flag: 'wx' }).then(() => console.log('Wrote synthetic test fixture; no production data modified.')).catch(() => { console.error('Could not create fixture output'); process.exitCode = 1 })
}
