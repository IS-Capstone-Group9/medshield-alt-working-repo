import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AnalyticalPoint,
  filterPointsByViewingMode,
  resolveAnalyticalOrigin,
  assertPointProvenance,
} from '../src/analyticsContracts'

test('resolveAnalyticalOrigin dynamically rolls forward from closed boundary', () => {
  const origin2025 = resolveAnalyticalOrigin('2025-12')
  assert.equal(origin2025.referenceYear, 2025)
  assert.equal(origin2025.forecastYear, 2026)
  assert.equal(origin2025.rollingStartPeriod, '2026-01')

  const origin2026 = resolveAnalyticalOrigin('2026-06')
  assert.equal(origin2026.referenceYear, 2026)
  assert.equal(origin2026.forecastYear, 2026)
  assert.equal(origin2026.rollingStartPeriod, '2026-07')

  const origin2027 = resolveAnalyticalOrigin('2027-12')
  assert.equal(origin2027.referenceYear, 2027)
  assert.equal(origin2027.forecastYear, 2028)
  assert.equal(origin2027.rollingStartPeriod, '2028-01')
})

test('filterPointsByViewingMode properly isolates actual and estimated points', () => {
  const points: AnalyticalPoint[] = [
    { period: '2025-11', value: 120000, data_status: 'actual', provenance: 'verified_actual', unit: 'PHP' },
    { period: '2025-12', value: 145000, data_status: 'actual', provenance: 'verified_actual', unit: 'PHP' },
    { period: '2026-01', value: 130000, data_status: 'estimated', provenance: 'future_forecast', unit: 'PHP' },
    { period: '2026-02', value: 135000, data_status: 'estimated', provenance: 'future_forecast', unit: 'PHP' },
  ]

  const actualOnly = filterPointsByViewingMode(points, 'actual')
  assert.equal(actualOnly.length, 2)
  assert.ok(actualOnly.every(p => p.data_status === 'actual'))

  const estimatedOnly = filterPointsByViewingMode(points, 'estimated')
  assert.equal(estimatedOnly.length, 2)
  assert.ok(estimatedOnly.every(p => p.data_status === 'estimated'))

  const both = filterPointsByViewingMode(points, 'both')
  assert.equal(both.length, 4)
})

test('assertPointProvenance rejects future periods tagged as actual', () => {
  const validPoint: AnalyticalPoint = {
    period: '2026-01',
    value: 500,
    data_status: 'estimated',
    provenance: 'future_forecast',
    unit: 'boxes',
  }
  assert.doesNotThrow(() => assertPointProvenance(validPoint, '2025-12'))

  const invalidPoint: AnalyticalPoint = {
    period: '2026-01',
    value: 500,
    data_status: 'actual', // VIOLATION
    provenance: 'verified_actual',
    unit: 'boxes',
  }
  assert.throws(() => assertPointProvenance(invalidPoint, '2025-12'), /Provenance violation/)
})
