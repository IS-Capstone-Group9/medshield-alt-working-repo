export interface AuditLogEntry {
  username: string
  action: string
  detail: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface AuditModalState {
  isOpen: boolean
  actionType: string
  operator: string
  previousValue: string
  newValue: string
  timestamp: string
  onConfirm: () => Promise<void>
}
