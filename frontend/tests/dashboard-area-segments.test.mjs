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
    { area: 'Bicol', revenue: 45, income: 18 },
    { area: 'Mindoro', revenue: 42, income: 16 },
    { area: 'Unknown Bucket', revenue: 40, income: 10 },
  ])

  assert.deepEqual(segments.territory.map((row) => row.area), ['Quezon', 'Camarines Norte'])
  assert.deepEqual(segments.geographicAggregate.map((row) => row.area), ['Bicol', 'Mindoro'])
  assert.deepEqual(segments.channel.map((row) => row.area), ['Government', 'Hospital'])
  assert.deepEqual(segments.businessLine.map((row) => row.area), ['Equipment', 'Admin'])
  assert.deepEqual(segments.unmapped.map((row) => row.area), ['Unknown Bucket'])
})

test('merges East, Eastern, Pagbilao, and Quezon towns into Quezon province territory', () => {
  const segments = splitAreaSegments([
    { area: 'Quezon', revenue: 60, income: 25 },
    { area: 'East', revenue: 10, income: 5 },
    { area: 'Eastern', revenue: 5, income: 2 },
    { area: 'Pagbilao', revenue: 20, income: 10 },
    { area: 'Lucena', revenue: 15, income: 8 },
  ])

  assert.equal(segments.territory.length, 1)
  assert.equal(segments.territory[0].area, 'Quezon')
  assert.equal(segments.territory[0].revenue, 110)
  assert.equal(segments.territory[0].income, 50)
})

