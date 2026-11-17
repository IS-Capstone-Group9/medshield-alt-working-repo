import { open } from 'node:fs/promises'
import { TextDecoder } from 'node:util'
import { ReviewIntegrityError, verifyCorrectionReview } from '../src/correctionReviewIntegrity'

export const MAX_REVIEW_BYTES = 2 * 1024 * 1024
export async function verifyCorrectionFile(filename: string) {
  const handle = await open(filename, 'r')
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || !stat.size || stat.size > MAX_REVIEW_BYTES) throw new ReviewIntegrityError('Provide a nonempty regular review JSON file up to 2 MiB.')
    // Bound the actual read too: do not trust a size observed before a concurrent change.
    const buffer = Buffer.alloc(MAX_REVIEW_BYTES + 1)
    let bytes = 0
    while (bytes < buffer.length) {
      const result = await handle.read(buffer, bytes, buffer.length - bytes, null)
      if (!result.bytesRead) break
      bytes += result.bytesRead
    }
    if (!bytes || bytes > MAX_REVIEW_BYTES) throw new ReviewIntegrityError('Review JSON exceeds the supported size.')
    return verifyCorrectionReview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytes))))
  } finally { await handle.close() }
}
if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0].startsWith('--')) {
    console.error('Usage: node --import tsx scripts/verify-intake-correction.ts <review.json>')
    process.exitCode = 2
  } else {
    void verifyCorrectionFile(args[0]).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
      // Do not echo source JSON, filenames, filesystem internals or parser excerpts.
      console.error(JSON.stringify({ status: 'FAIL_LOCAL_REVIEW_INTEGRITY', error: error instanceof ReviewIntegrityError ? error.message : 'Review file could not be read or validated.' }))
      process.exitCode = 1
    })
  }
}
