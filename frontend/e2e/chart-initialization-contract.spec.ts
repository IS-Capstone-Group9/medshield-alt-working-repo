import { test, expect } from '@playwright/test'
import { guardReplacedChartInitializers } from '../services/api/legacy-chart-targets'

test('replaced absent targets do not create charts or evaluate their configuration', () => {
  const script = ['monthlyChart', 'areaDonut', 'seasonChart', 'areaBarChart', 'areaIncomeChart', 'areaMarginChart']
    .map(id => `createChart('${id}', buildConfig());`).join('\n')
  const calls: string[] = []
  let configurations = 0
  new Function('document', 'createChart', 'buildConfig', guardReplacedChartInitializers(script))(
    { getElementById: () => null }, (id: string) => calls.push(id), () => { configurations++; return {} },
  )
  expect(calls).toEqual([])
  expect(configurations).toBe(0)
})

test('a retained reference target still initializes if its canvas exists', () => {
  const calls: string[] = []
  new Function('document', 'createChart', guardReplacedChartInitializers("createChart('monthlyChart', {});"))(
    { getElementById: (id: string) => id === 'monthlyChart' ? {} : null }, (id: string) => calls.push(id),
  )
  expect(calls).toEqual(['monthlyChart'])
})

test('missing current-chart diagnostics and ordinary chart calls are preserved', () => {
  const calls: string[] = [], warnings: string[] = []
  new Function('document', 'createChart', guardReplacedChartInitializers("createChart('overviewBaselineChart', {});"))(
    { getElementById: () => null }, (id: string) => { calls.push(id); warnings.push(`Missing ${id}`) },
  )
  expect(calls).toEqual(['overviewBaselineChart'])
  expect(warnings).toEqual(['Missing overviewBaselineChart'])
})
