import { Pool } from 'pg'
import { CommercialError } from '../utils/contracts'
import type { ReceiptEvidence } from '../services/ReconciliationService'

let pool: Pool | undefined
function database() {
  if (!process.env.OPERATIONS_DATABASE_URL) throw new CommercialError(503, 'OPERATIONS_NOT_CONFIGURED', 'The verified receipt and inventory ledger is not configured.')
  pool ??= new Pool({ connectionString: process.env.OPERATIONS_DATABASE_URL, max: 4, connectionTimeoutMillis: 5000, query_timeout: 15000, statement_timeout: 12000, idleTimeoutMillis: 30000 })
  return pool
}
export const operationsRepository = {
  async receipts(start: string, end: string): Promise<ReceiptEvidence[]> {
    // Pre-aggregate each one-to-many relation separately; payment/item joins cannot multiply amounts.
    const result = await database().query<ReceiptEvidence>(`
      SELECT r.receipt_number, r.gross_amount::text, r.vat_amount::text, r.withholding_tax::text, r.net_amount::text,
        r.evidence_class, r.audited_at, COALESCE(i.amount,0)::text AS item_subtotal, COALESCE(i.count,0)::int AS item_count,
        COALESCE(p.amount,0)::text AS paid_amount, COALESCE(p.count,0)::int AS payment_count,
        COALESCE(w.amount,0)::text AS withholding_amount, COALESCE(w.count,0)::int AS withholding_count, COALESCE(w.verified,0)::int AS verified_withholding_count
      FROM medshield_operations.sales_receipt r
      LEFT JOIN LATERAL (SELECT SUM(subtotal) amount, COUNT(*) count FROM medshield_operations.sales_item WHERE receipt_id=r.id) i ON true
      LEFT JOIN LATERAL (SELECT SUM(amount) amount, COUNT(*) count FROM medshield_operations.ledger_payment WHERE receipt_id=r.id AND status='POSTED') p ON true
      LEFT JOIN LATERAL (SELECT SUM(amount) amount, COUNT(*) count, COUNT(*) FILTER(WHERE verified_at IS NOT NULL AND document_sha256 IS NOT NULL) verified FROM medshield_operations.withholding_voucher WHERE receipt_id=r.id) w ON true
      WHERE r.delivery_date BETWEEN $1::date AND $2::date AND r.status <> 'VOID'
      ORDER BY r.delivery_date, r.receipt_number LIMIT 5001`, [start, end])
    if (result.rows.length > 5000) throw new CommercialError(422, 'AUDIT_WINDOW_TOO_LARGE', 'Narrow the audit window to at most 5000 receipts; incomplete totals are not returned.')
    return result.rows
  },
  async allocationContext(productId: string, targetPeriod: string) {
    const client = await database().connect()
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const product = await client.query('SELECT id FROM medshield_operations.product WHERE id=$1 AND identity_status=\'approved\'', [productId])
      if (!product.rowCount) throw new CommercialError(422, 'PRODUCT_NOT_VERIFIED', 'Allocation requires an approved product and packaging unit.')
      const stock = await client.query(`SELECT COALESCE(SUM(units_on_hand),0)::text AS available FROM medshield_operations.inventory_lot WHERE product_id=$1 AND expires_on >= ($2 || '-01')::date AND verified_at IS NOT NULL`, [productId, targetPeriod])
      const orders = await client.query(`SELECT c.id AS "clientId", c.category, r.requested_units AS "requestedUnits", r.usable_units_before_expiry AS "usableUnitsBeforeExpiry" FROM medshield_operations.allocation_request r JOIN medshield_operations.client c ON c.id=r.client_id WHERE r.product_id=$1 AND r.target_period=$2 AND r.approved_at IS NOT NULL ORDER BY c.id`, [productId, targetPeriod])
      if (orders.rows.length > 500) throw new CommercialError(422, 'ALLOCATION_SCOPE_TOO_LARGE', 'Limit allocation to 500 approved clients.')
      await client.query('COMMIT')
      if (!orders.rows.length) throw new CommercialError(503, 'ALLOCATION_DEMAND_UNAVAILABLE', 'No approved client demand and expiry-use evidence is available for this product and target month.')
      return { available: Number(stock.rows[0].available), clients: orders.rows }
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error }
    finally { client.release() }
  },
}
export type OperationsRepository = typeof operationsRepository
