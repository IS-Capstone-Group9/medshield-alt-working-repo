/** Keep catalog fan-out out of the global statement queue. Preserve page order,
 * drain active reads on failure, and never return a partial catalog. */
export async function readCatalogPages<T>(statements: string[], read: (statement: string) => Promise<T[]>): Promise<T[]> {
  const pages: T[][] = new Array(statements.length)
  let next = 0
  let failed = false
  let failure: unknown
  async function worker() {
    while (!failed && next < statements.length) {
      const index = next++
      try { pages[index] = await read(statements[index]) }
      catch (error) { if (!failed) failure = error; failed = true }
    }
  }
  // Bound pending pages; the global FIFO still admits other dashboard readers.
  await Promise.all(Array.from({length: Math.min(4, statements.length)}, worker))
  if (failed) throw failure
  return pages.flat()
}
