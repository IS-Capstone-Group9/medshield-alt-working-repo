import { ShieldAlert, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AlertActionsProps {
  userRole: 'planner' | 'viewer'
  onTriggerEoq: () => void
  onRecalibrate: () => void
  isRecalibrating: boolean
}

export function AlertActions({
  userRole,
  onTriggerEoq,
  onRecalibrate,
  isRecalibrating,
}: AlertActionsProps) {
  const isReadOnly = userRole === 'viewer'

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="section-title">Active Prescriptive Inventory Alerts</div>
      <div className="alert-grid">
        {/* CRITICAL ALERT */}
        <div className="alert-card danger">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="alert-tag danger">CRITICAL</span>
            <div>
              <div className="alert-title">Stock Out Risk: Systemic Antipyretics (Non-NSAID)</div>
              <div className="alert-body">
                Monsoon demand spike (+45% buffer) will exhaust safety stock levels in Batangas. NSAIDs contraindicated due to Dengue risk.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              disabled={isReadOnly}
              onClick={onTriggerEoq}
            >
              Override Model Signal
            </Button>
            <Button
              variant="primary"
              disabled={isReadOnly}
              onClick={onTriggerEoq}
            >
              <ShieldAlert size={14} />
              Review EOQ Reorder
            </Button>
          </div>
        </div>

        {/* WARNING ALERT */}
        <div className="alert-card warn">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="alert-tag warn">WARNING</span>
            <div>
              <div className="alert-title">Dengue Alert Level 3 Active</div>
              <div className="alert-body">DOH infection index &gt; 1.4 in Quezon. Buffer recalibration recommended.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              disabled={isReadOnly}
              onClick={() => alert('Procurement audit report exported to CSV.')}
            >
              Export Audit Report
            </Button>
            <Button
              variant="primary"
              disabled={isReadOnly}
              isLoading={isRecalibrating}
              onClick={onRecalibrate}
            >
              <AlertTriangle size={14} />
              Recalibrate Model Safety Buffers
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
