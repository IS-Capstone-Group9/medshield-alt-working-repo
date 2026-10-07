/** Byte-preserving Spark SQL value: avoids quote/backslash parser transformations. */
export function databricksLiteral(value: unknown): string {
  return value == null ? 'NULL' : `decode(unhex('${Buffer.from(String(value), 'utf8').toString('hex')}'), 'UTF-8')`
}
