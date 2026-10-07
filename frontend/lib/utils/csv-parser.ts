export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (character === ',' && !quoted) {
      record.push(field.trim())
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      record.push(field.trim())
      field = ''
      if (record.some((value) => value.length > 0)) records.push(record)
      record = []
      continue
    }

    field += character
  }

  record.push(field.trim())
  if (record.some((value) => value.length > 0)) records.push(record)
  if (quoted) throw new Error('The CSV contains an unterminated quoted value.')

  return records
}

export function normalizeCsvHeader(value: string, index: number) {
  return value.replace(/^\uFEFF/, '').trim() || `Column ${index + 1}`
}

export function extractCsvYear(headers: string[], values: string[]): string | null {
  const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const candidateNames = ['year', 'period', 'datedelivered', 'deliverydate', 'date']

  for (const candidateName of candidateNames) {
    const columnIndex = normalizedHeaders.indexOf(candidateName)
    if (columnIndex < 0) continue
    const match = values[columnIndex]?.match(/\b(19|20)\d{2}\b/)
    if (match) return match[0]
  }

  return null
}
