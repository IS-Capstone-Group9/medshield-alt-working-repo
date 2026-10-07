import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCoverage } from '../src/predictiveCoverage'
const identity = { dataset_id: 'snapshot', fact_delta_version: 16, descriptive_receipt_sha256: 'hash' }
const fixture = () => ({ ...identity, reviewer: 'Fixture reviewer', reviewed_at: '2026-09-27', evidence_reference: 'fixture only', training_approved: true, publication_approved: false, periods: { '2025-01': { period_closed: true, coverage_status: 'complete', confirmed_zero_activity: false } } })
test('acceptance binds exact source and preserves independent publication decision', () => {
  assert.equal(validateCoverage(fixture(), identity, ['2025-01']).publication_approved, false)
  assert.throws(() => validateCoverage({ ...fixture(), fact_delta_version: 17 }, identity, ['2025-01']), /mismatch/)
})
test('reject malformed or unsupported acceptance and zero assertions', () => {
  for (const change of [{ training_approved: 'true' }, { reviewed_at: 'unknown' }, { reviewer: '' }, { training_approved: false, publication_approved: true }, { periods: { '2025-01': { period_closed: true, coverage_status: 'unknown', confirmed_zero_activity: true } } }, { periods: {} }]) assert.throws(() => validateCoverage({ ...fixture(), ...change }, identity, ['2025-01']))
  assert.throws(() => validateCoverage(fixture(), identity, ['2025-02']), /outside/)
})
