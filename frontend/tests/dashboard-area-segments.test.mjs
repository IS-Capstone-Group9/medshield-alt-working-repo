import test from 'node:test'
import assert from 'node:assert/strict'

import { splitAreaSegments } from '../services/api/dashboard-area-segments.ts'

test('area segmentation separates territories from channels and business lines', () => {
  const segments = splitAreaSegments([
    { area: 'Government', revenue: 100, income: 50 },
    { area: 'Hospital', revenue: 90, income: 45 },
    { area: 'Equipment', revenue: 80, income: 35 },
    { area: 'Admin', revenue: 70, income: 30 },
    { area: 'Quezon', revenue: 60, income: 25 },
    { area: 'Camarines Norte', revenue: 50, income: 20 },
    { area: 'Unknown Bucket', revenue: 40, income: 10 },
  ])

  assert.deepEqual(segments.territory.map((row) => row.area), ['Quezon', 'Camarines Norte'])
  assert.deepEqual(segments.channel.map((row) => row.area), ['Government', 'Hospital'])
  assert.deepEqual(segments.businessLine.map((row) => row.area), ['Equipment', 'Admin'])
  assert.deepEqual(segments.unmapped.map((row) => row.area), ['Unknown Bucket'])
})
