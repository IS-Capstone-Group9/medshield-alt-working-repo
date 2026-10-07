import { sendAuditLog } from '@/lib/api'

export async function logAuditEvent(action: string, detail: string): Promise<void> {
  // Ensure we send it to our persistent compliance backend audit logs endpoint
  await sendAuditLog(action, detail)
}
