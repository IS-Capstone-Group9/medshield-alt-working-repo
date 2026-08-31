import type { AreaPoint } from '@/types/api.types'

type AreaSegment = 'territory' | 'geographicAggregate' | 'channel' | 'businessLine' | 'unmapped'

const AREA_CANONICAL_NAME: Record<string, string> = {
  'EAST': 'Quezon',
  'EASTERN': 'Quezon',
  'EASTERN QUEZON': 'Quezon',
  'QUEZON PROVINCE': 'Quezon',
  'PAGBILAO': 'Quezon',
  'LUCENA': 'Quezon',
  'GULANG GULANG': 'Quezon',
  'PADRE BURGOS': 'Quezon',
  'CAM NORTE': 'Camarines Norte',
  'CAM SUR': 'Camarines Sur',
  'METRO MANILA': 'Metro Manila',
  'NCR': 'Metro Manila',
  'LOWER CAVITE': 'Cavite',
  'LEGASPI': 'Legazpi',
}

const AREA_SEGMENT_BY_LABEL = new Map<string, AreaSegment>([
  ['BATANGAS', 'territory'],
  ['QUEZON', 'territory'],
  ['MARINDUQUE', 'territory'],
  ['CAMARINES NORTE', 'territory'],
  ['CAM NORTE', 'territory'],
  ['CAMARINES SUR', 'territory'],
  ['CAM SUR', 'territory'],
  ['CAVITE', 'territory'],
  ['LOWER CAVITE', 'territory'],
  ['LAGUNA', 'territory'],
  ['METRO MANILA', 'territory'],
  ['NCR', 'territory'],
  ['RIZAL', 'territory'],
  ['ALBAY', 'territory'],
  ['BICOL', 'geographicAggregate'],
  ['LEGASPI', 'territory'],
  ['LEGAZPI', 'territory'],
  ['MINDORO', 'geographicAggregate'],
  ['GOVERNMENT', 'channel'],
  ['HOSPITAL', 'channel'],
  ['PHARMA', 'channel'],
  ['ADMIN', 'businessLine'],
  ['SUPPLIES', 'businessLine'],
  ['EQUIPMENT', 'businessLine'],
  ['PERSONAL', 'businessLine'],
  ['LOSSES', 'businessLine'],
])

function segmentForArea(area: string): AreaSegment {
  return AREA_SEGMENT_BY_LABEL.get(area.trim().toUpperCase()) ?? 'unmapped'
}

function sortedByRevenue(rows: AreaPoint[]): AreaPoint[] {
  return [...rows].sort((left, right) => right.revenue - left.revenue)
}

export function splitAreaSegments(rows: AreaPoint[]) {
  const mergedBySegment: Record<AreaSegment, Map<string, AreaPoint>> = {
    territory: new Map(),
    geographicAggregate: new Map(),
    channel: new Map(),
    businessLine: new Map(),
    unmapped: new Map(),
  }

  for (const row of rows) {
    const rawArea = (row.area || '').trim()
    const upper = rawArea.toUpperCase()
    const canonicalArea = AREA_CANONICAL_NAME[upper] ?? rawArea
    const segment = segmentForArea(canonicalArea)

    const bucket = mergedBySegment[segment]
    const existing = bucket.get(canonicalArea)
    if (existing) {
      existing.revenue += row.revenue
      existing.income += row.income
    } else {
      bucket.set(canonicalArea, {
        area: canonicalArea,
        revenue: row.revenue,
        income: row.income,
      })
    }
  }

  return {
    territory: sortedByRevenue(Array.from(mergedBySegment.territory.values())),
    geographicAggregate: sortedByRevenue(Array.from(mergedBySegment.geographicAggregate.values())),
    channel: sortedByRevenue(Array.from(mergedBySegment.channel.values())),
    businessLine: sortedByRevenue(Array.from(mergedBySegment.businessLine.values())),
    unmapped: sortedByRevenue(Array.from(mergedBySegment.unmapped.values())),
  }
}
