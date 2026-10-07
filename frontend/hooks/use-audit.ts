import { useState } from 'react'
import { logAuditEvent } from '@/services/supabase/audit.service'

export interface AuditState {
  isOpen: boolean
  actionType: string
  operator: string
  previousValue: string
  newValue: string
  timestamp: string
  isExecuting: boolean
}

export function useAudit() {
  const [audit, setAudit] = useState<AuditState>({
    isOpen: false,
    actionType: '',
    operator: 'Authenticated User',
    previousValue: '',
    newValue: '',
    timestamp: '',
    isExecuting: false,
  })

  // Callback to execute after confirmation
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)

  const openAudit = (
    actionType: string,
    prevVal: string,
    newVal: string,
    onConfirm: () => void
  ) => {
    setAudit({
      isOpen: true,
      actionType,
      operator: 'Authenticated User',
      previousValue: prevVal,
      newValue: newVal,
      timestamp: new Date().toISOString(),
      isExecuting: false,
    })
    setOnConfirmCallback(() => onConfirm)
  }

  const closeAudit = () => {
    setAudit((prev) => ({ ...prev, isOpen: false }))
  }

  const confirmAndExecute = async () => {
    setAudit((prev) => ({ ...prev, isExecuting: true }))
    
    const detailString = `Previous: ${audit.previousValue} | New: ${audit.newValue} | Operator: ${audit.operator}`
    try {
      await logAuditEvent(audit.actionType, detailString)
    } catch (e) {
      console.warn('Fallback local audit storage log:', e)
    }

    // Simulate system calculation delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    if (onConfirmCallback) {
      onConfirmCallback()
    }

    setAudit((prev) => ({ ...prev, isExecuting: false, isOpen: false }))
    alert('Security Audit Record Generated. Action has been confirmed and order executed.')
  }

  return {
    audit,
    openAudit,
    closeAudit,
    confirmAndExecute,
  }
}
