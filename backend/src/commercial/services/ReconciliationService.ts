import Decimal from 'decimal.js'
import { money } from '../utils/contracts'

export type ReceiptEvidence = { receipt_number: string; gross_amount: string; vat_amount: string; withholding_tax: string; net_amount: string; item_subtotal: string; item_count: number; paid_amount: string; payment_count: number; withholding_amount: string; withholding_count: number; verified_withholding_count: number; evidence_class: string; audited_at: string | null }
export function reconcileReceipts(rows: ReceiptEvidence[]) {
  const results = rows.map(row => {
    const itemDelta = new Decimal(row.gross_amount).minus(row.item_subtotal).minus(row.vat_amount)
    const netDelta = new Decimal(row.gross_amount).minus(row.withholding_tax).minus(row.net_amount)
    const paymentDelta = new Decimal(row.net_amount).minus(row.paid_amount)
    const withholdingDelta = new Decimal(row.withholding_tax).minus(row.withholding_amount)
    const hasEvidence = row.evidence_class === 'verified_receipt' && Boolean(row.audited_at) && row.item_count > 0 && row.payment_count > 0 && (new Decimal(row.withholding_tax).eq(0) || row.withholding_count > 0 && row.withholding_count === row.verified_withholding_count)
    return { receiptNumber: row.receipt_number, classification: row.evidence_class, evidenceComplete: hasEvidence, reconciled: hasEvidence && [itemDelta, netDelta, paymentDelta, withholdingDelta].every(value => value.isZero()), itemDelta: money(itemDelta), netDelta: money(netDelta), paymentDelta: money(paymentDelta), withholdingDelta: money(withholdingDelta) }
  })
  const complete = results.length > 0 && results.every(row => row.reconciled)
  return { status: complete ? 'reconciled' : rows.length ? 'requires_review' : 'no_evidence', receiptCount: rows.length, totalGrossReceipts: money(rows.reduce((sum, row) => sum.plus(row.gross_amount), new Decimal(0))), reconciliationChecksum: complete ? '0.00' : null, mismatchedOrIncompleteReceipts: results.filter(row => !row.reconciled).length, data: results, taxPolicy: 'Reconciles recorded voucher amounts. No automatic legal tax-rate determination or tax compliance certification.' }
}
