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
      <div className="section-title">Draft Inventory Scenarios</div>
      <div className="alert-grid">
        {/* CRITICAL ALERT */}
        <div className="alert-card danger">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="alert-tag danger">CRITICAL</span>
            <div>
              <div className="alert-title">Demand Scenario: Systemic Antipyretics (Non-NSAID)</div>
              <div className="alert-body">
                A +45% planning assumption may exceed the example safety-stock threshold. Validate actual Batangas stock and clinical policy before action.
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
              <div className="alert-title">Example Disease-Surge Scenario</div>
              <div className="alert-body">Uses an assumed disease index &gt; 1.4 for sensitivity analysis; this is not a current DOH alert.</div>
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
