type Row = Record<string, string | null>

/** Small strict CSV reader for the governed local mapping files, including quoted newlines. */
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false; let closed = false
  const text = input.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else value += c
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(value); value = ''; closed = false
      if (c !== ',') { if (row.some(v => v !== '')) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++ }
    } else if (c === '"' && value === '' && !closed) quoted = true
    else { if (closed || c === '"') throw new Error('Malformed CSV quoting'); value += c }
  }
  if (quoted) throw new Error('Unterminated quoted CSV field')
  if (value !== '' || row.length || closed) { row.push(value); rows.push(row) }
  const headers = rows.shift()
  if (!headers?.length || new Set(headers).size !== headers.length) throw new Error('Missing or duplicated CSV headers')
  return rows.map(r => { if (r.length !== headers.length) throw new Error('CSV field count mismatch'); return Object.fromEntries(headers.map((h,i) => [h,r[i]])) })
}
const normalize = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
export function checkMapping(master: Record<string, string>[], live: Row[]): string[] {
  const errors: string[] = []; const byKey = new Map<string, Record<string,string>>()
  for (const row of master) {
    const key = normalize(row.raw_area)
    if (!key || byKey.has(key)) errors.push(`Duplicate or missing master key: ${key}`)
    byKey.set(key,row)
  }
  if (!live.length) errors.push('No live area dimensions')
  for (const row of live) {
    const key = normalize(row.normalized_area); const local = byKey.get(key)
    if (!local) { errors.push(`Missing local mapping: ${key}`); continue }
    const pairs = { area_mapping_status:'mapping_status', area_evidence_status:'evidence_status', mapped_region:'region', mapped_province:'province', mapped_city_municipality:'city_municipality', mapped_geographic_level:'geographic_level', external_mapping_status:'external_mapping_status' }
    for (const [remoteField, localField] of Object.entries(pairs)) if ((row[remoteField] ?? '') !== (local[localField] ?? '')) errors.push(`${key}: ${remoteField}`)
    const approved = local.mapping_status === 'approved' && local.area_type === 'territory' && key !== 'UNKNOWN_AREA'
    if ((row.is_geographic_territory_approved === 'true') !== approved) errors.push(`${key}: geographic approval differs`)
    if ((row.territory_id ?? '') !== (approved ? local.territory_id ?? '' : '')) errors.push(`${key}: territory identity/approval differs`)
  }
  return errors
}
export function technicalVerdict(checks: {status: string}[]): 'PASS' | 'FAIL' | 'UNVERIFIED' {
  if (checks.some(c => c.status === 'FAIL')) return 'FAIL'
  if (!checks.length || checks.some(c => c.status !== 'PASS')) return 'UNVERIFIED'
  return 'PASS'
}

export function checkAdjustedSources(manifest: Row[], known: {filename: string; sha256: string; policy: string}[]): string[] {
  const errors: string[] = []
  for (const expected of known) {
    const matches = manifest.filter(r => r.source_workbook === expected.filename && r.source_file_sha256 === expected.sha256)
    for (const row of matches) {
      if (row.source_data_status !== 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE' || row.source_adjustment_policy !== expected.policy) errors.push(`${expected.filename}: known estimated replacement is mislabeled ${row.source_data_status}`)
    }
  }
  return errors
}
