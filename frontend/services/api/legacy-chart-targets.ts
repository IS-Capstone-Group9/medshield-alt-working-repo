// The enhanced dashboard replaced these reference-only charts. Guard the old
// call sites before their configurations are evaluated; createChart continues
// to report genuinely missing targets used by current renderers.
const REPLACED_CHART_TARGETS = [
  'monthlyChart',
  'areaDonut',
  'seasonChart',
  'areaBarChart',
  'areaIncomeChart',
  'areaMarginChart',
] as const

export function guardReplacedChartInitializers(script: string): string {
  return REPLACED_CHART_TARGETS.reduce((patched, id) => patched.replaceAll(
    `createChart('${id}',`,
    `if (document.getElementById('${id}')) createChart('${id}',`,
  ), script)
}
