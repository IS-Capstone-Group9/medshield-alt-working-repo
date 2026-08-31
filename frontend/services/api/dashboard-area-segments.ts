import type { AreaPoint } from '@/types/api.types'

type AreaSegment = 'territory' | 'channel' | 'businessLine' | 'unmapped'

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
  ['BICOL', 'territory'],
  ['LEGASPI', 'territory'],
  ['LEGAZPI', 'territory'],
  ['MINDORO', 'territory'],
  ['LUCENA', 'territory'],
  ['EAST', 'territory'],
  ['EASTERN', 'territory'],
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
  const segments = {
    territory: [] as AreaPoint[],
    channel: [] as AreaPoint[],
    businessLine: [] as AreaPoint[],
    unmapped: [] as AreaPoint[],
  }

  for (const row of rows) {
    segments[segmentForArea(row.area)].push(row)
  }

  return {
    territory: sortedByRevenue(segments.territory),
    channel: sortedByRevenue(segments.channel),
    businessLine: sortedByRevenue(segments.businessLine),
    unmapped: sortedByRevenue(segments.unmapped),
  }
}
