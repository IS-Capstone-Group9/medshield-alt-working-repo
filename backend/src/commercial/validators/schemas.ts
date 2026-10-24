import { z } from 'zod'

export const periodSchema = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/, 'Use YYYY-MM between 2000 and 2099')
export const dateSchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Use a valid ISO calendar date')
const text = z.string().trim().min(1).max(200).regex(/^[^\x00-\x1f]+$/)
const integerQuery = (min: number, max: number, fallback: string) => z.string().regex(/^\d+$/).default(fallback).transform(Number).pipe(z.number().int().min(min).max(max))
export const categories = ['ANTIBIOTICS', 'CARDIOVASCULAR', 'ONCOLOGY', 'ANALGESICS', 'RESPIRATORY', 'DIABETES_CARE'] as const
export const monthlyQuery = z.object({
  anchor: periodSchema, window: z.enum(['3M', '6M', '12M', '24M', 'overall', 'custom']).default('24M'),
  startDate: dateSchema.optional(), endDate: dateSchema.optional(),
  category: z.enum(['All', 'Medical', 'Non-Medical', 'Unclassified', ...categories]).default('All'),
  productId: text.regex(/^(RAW|SKU):.+/).optional(), sector: z.enum(['All', 'Government', 'Private', 'Internal', 'Unknown']).default('All'),
}).strict().superRefine((data, ctx) => {
  if (data.window === 'custom' && (!data.startDate || !data.endDate || data.startDate > data.endDate)) ctx.addIssue({ code: 'custom', message: 'custom requires ordered startDate and endDate' })
  if (data.window !== 'custom' && (data.startDate || data.endDate)) ctx.addIssue({ code: 'custom', message: 'Dates require window=custom' })
})
export const forecastQuery = z.object({
  anchor: periodSchema, horizonMonths: integerQuery(1, 36, '24'), scenario: z.enum(['none', 'monsoon', 'typhoon', 'conservative']).default('none'),
  confidenceInterval: z.enum(['80', '95']).default('80'), leadTimeDays: integerQuery(1, 365, '60'),
  category: z.enum(categories).optional(), productId: text.optional(), search: z.string().trim().max(100).default(''),
  limit: integerQuery(1, 100, '25'), page: integerQuery(1, 10000, '1'),
}).strict().refine(data => Number(data.anchor.slice(0, 4)) * 12 + Number(data.anchor.slice(5)) - 1 + data.horizonMonths < 2100 * 12, 'Forecast horizon exceeds supported calendar')
const units = z.number().int().min(0).max(1_000_000_000)
export const allocationClient = z.object({ clientId: text, category: z.enum(['HOSPITAL', 'CLINIC', 'RETAIL', 'OTHER']), requestedUnits: units, usableUnitsBeforeExpiry: units }).strict()
export const allocationBody = z.object({
  anchorPeriod: periodSchema, targetPeriod: periodSchema, productId: z.string().uuid(),
  totalAvailableStock: units, maxExpiryLossThresholdPct: z.number().min(0).max(5).default(5),
  hospitalFillTargetPct: z.number().min(98.5).max(100).default(98.5), clientPriorityRule: z.literal('HOSPITAL_FIRST'),
  clients: z.array(allocationClient).min(1).max(500).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.targetPeriod <= data.anchorPeriod) ctx.addIssue({ code: 'custom', message: 'targetPeriod must follow anchorPeriod' })
  if (data.clients && new Set(data.clients.map(c => c.clientId)).size !== data.clients.length) ctx.addIssue({ code: 'custom', message: 'Duplicate clientId' })
})
export const reconciliationQuery = z.object({ startDate: dateSchema, endDate: dateSchema }).strict().refine(d => d.startDate <= d.endDate, 'startDate must not follow endDate')
export type MonthlyQuery = z.infer<typeof monthlyQuery>
export type ForecastQuery = z.infer<typeof forecastQuery>
export type AllocationInput = z.infer<typeof allocationBody>
