import { expect, test } from '@playwright/test'
import { addMonths, cutoff, csvText, forecastPoints, monthEnd, plan, type ForecastEvidence } from '../components/commercial/model'

test('rolling dates cross year and leap-month boundaries correctly', () => {
  expect(addMonths('2026-01', -2)).toBe('2025-11')
  expect(addMonths('2026-09', 24)).toBe('2028-09')
  expect(monthEnd('2024-02')).toBe('2024-02-29')
  expect(cutoff('2026-10', 60)).toBe('2026-08-02')
  expect(() => addMonths('2026-13', 1)).toThrow()
})

test('calendar changes never relocate predictions or invent unsupported confidence bands', () => {
  const data = { actuals: [{ period: '2025-12', actual: 100 }], views: { '3': { models: { baseline: { forecast: [{ period: '2026-01', prediction: 110, lower: 100, upper: 120 }] } } } } } as unknown as ForecastEvidence
  const points = forecastPoints(data, '2025-12', 3, 1, 'baseline')
  expect(points.map(p => p.forecast)).toEqual([null, 110, null, null])
  expect(points[1].lower).toBeNull()
  expect(forecastPoints(data, '2026-01', 3, 0, 'baseline').every(p => p.forecast == null)).toBe(true)
  expect(forecastPoints(data, '2025-12', 24, 24, 'baseline')).toHaveLength(48)
  expect(forecastPoints(data, '2025-12', 24, 24, 'baseline').every(p => p.forecast == null)).toBe(true)
})

test('planning enforces budget, supplier and expiry limits without rounding packs up', () => {
  const input = { demand: 300, stock: 0, pack: 10, cost: 100, capacity: 100, budget: 500, leadDays: 30, bufferDays: 0, shelfDays: 60, multiplier: 1 }
  expect(plan(input)).toMatchObject({ packs: 5, spend: 500, deficit: 5500, unmet: 550, reorder: 300, waste: 0 })
  expect(plan({ ...input, budget: 10000, capacity: 2 })?.packs).toBe(2)
  const expiry = plan({ ...input, budget: 10000, shelfDays: 1 })!
  expect(expiry.packs).toBe(1)
  expect(expiry.expiryLimited).toBe(true)
  expect(plan({ ...input, stock: 1000, shelfDays: 1 })!.waste).toBeGreaterThan(5)
  expect(plan({ ...input, cost: 0 })).toBeNull()
  expect(plan({ ...input, demand: NaN })).toBeNull()
})

test('CSV preserves classification, filters and blank measurements while neutralizing spreadsheet formulas', () => {
  const csv = csvText(['product', 'value'], [['=HYPERLINK("bad")', null]], { classification: 'Simulation sandbox', scenario_multiplier: 1.25 })
  expect(csv).toContain("\"'=HYPERLINK(\"\"bad\"\")\"")
  expect(csv).toContain('"","Simulation sandbox","1.25"')
})
