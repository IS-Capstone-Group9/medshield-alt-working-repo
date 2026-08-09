import { API_BASE_URL, authHeaders } from './api-client'

export async function sendAuditLog(action: string, detail: string): Promise<void> {
  try {
    const headers = await authHeaders({
      'Content-Type': 'application/json',
    })
    await fetch(`${API_BASE_URL}/api/audit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, detail }),
    })
  } catch (err) {
    console.error('Failed to send audit log to backend:', err)
  }
}
