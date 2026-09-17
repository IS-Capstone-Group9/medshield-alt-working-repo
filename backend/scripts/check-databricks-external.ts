import 'dotenv/config'

import { getDatabricksExternalConnectionStatus } from '../src/databricks'

async function main(): Promise<void> {
  console.log(JSON.stringify(await getDatabricksExternalConnectionStatus(), null, 2))
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Databricks external check error'
  console.error(`Databricks external connection check failed: ${message}`)
  process.exitCode = 1
})
