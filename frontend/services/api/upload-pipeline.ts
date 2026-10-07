import { uploadSalesFile } from '@/lib/api'

export async function processSalesUpload(
  file: File,
  onStart: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void
): Promise<any> {
  const pendingMessage = `Uploading and Cleaning ${file.name}...`
  onStart(pendingMessage)
  
  try {
    const result = await uploadSalesFile(file)
    const mergeYears = result.persistence.local.years_replaced?.length
      ? ` Replaced year(s): ${result.persistence.local.years_replaced.join(', ')}.`
      : ''
    const warehouse = result.persistence.warehouse.persisted
      ? `Warehouse run ${result.persistence.warehouse.pipeline_run_key}`
      : result.persistence.warehouse.message ?? 'Local processed dataset'
    
    const message =
      `${result.quality.rows_accepted.toLocaleString()} rows accepted, ` +
      `${result.quality.rows_rejected.toLocaleString()} rejected. ${warehouse}.${mergeYears}`
    
    onSuccess(message)
    return result
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Upload failed.'
    onError(message)
    throw error
  }
}
