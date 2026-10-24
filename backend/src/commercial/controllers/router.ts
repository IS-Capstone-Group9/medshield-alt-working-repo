import { Router, type Request, type RequestHandler, type Response } from 'express'
import { ZodError } from 'zod'
import { allocationBody, allocationClient, forecastQuery, monthlyQuery, reconciliationQuery } from '../validators/schemas'
import { warehouseRepository, type WarehouseRepository } from '../repositories/WarehouseRepository'
import { operationsRepository, type OperationsRepository } from '../repositories/OperationsRepository'
import { monthlySales } from '../services/SalesService'
import { rollingForecast } from '../services/ForecastService'
import { allocate } from '../services/AllocationService'
import { reconcileReceipts } from '../services/ReconciliationService'
import { CommercialError } from '../utils/contracts'

export function createCommercialRouter(deps: { authenticate: RequestHandler; authorize: (roles: string[]) => RequestHandler; warehouse?: WarehouseRepository; operations?: OperationsRepository }) {
  const router = Router(), warehouse = deps.warehouse || warehouseRepository, operations = deps.operations || operationsRepository
  const handle = (operation: (req: Request) => Promise<unknown>): RequestHandler => async (req: Request, res: Response) => {
    try { res.setHeader('Cache-Control', 'no-store'); res.json(await operation(req)) }
    catch (error) {
      const status = error instanceof ZodError ? 400 : error instanceof CommercialError ? error.status : 503
      const code = error instanceof ZodError ? 'INVALID_REQUEST' : error instanceof CommercialError ? error.code : 'DEPENDENCY_UNAVAILABLE'
      res.status(status).type('application/problem+json').json({ type: `urn:medshield:problem:${code.toLowerCase()}`, title: status === 400 ? 'Invalid request' : status === 422 ? 'Unsupported or infeasible request' : 'Source unavailable', status, code, detail: error instanceof ZodError ? 'Invalid fields: ' + error.issues.map(issue => issue.path.join('.') || 'request').join(', ') : error instanceof CommercialError ? error.message : 'The required source could not be read. No synthetic or local analytical fallback was used.', instance: req.path })
    }
  }
  router.get('/sales/monthly', deps.authenticate, handle(req => monthlySales(monthlyQuery.parse(req.query), warehouse)))
  for (const [path, kind] of [['rolling', 'company'], ['by-category', 'category'], ['by-product', 'product']] as const) {
    router.get(`/forecasts/${path}`, deps.authenticate, handle(async req => {
      const query = forecastQuery.parse(req.query)
      if (kind === 'company' && (query.category || query.productId || query.search)) throw new CommercialError(400, 'INVALID_SCOPE', 'Use the category or product endpoint for granular forecasts.')
      const found = await warehouse.forecasts(kind, query)
      if (!found.rows.length) throw new CommercialError(503, 'FORECAST_NOT_PUBLISHED', 'No source-bound candidate exists for this scope and anchor. Run and review the offline forecast publication job.')
      const results = found.rows.map(row => rollingForecast(row, query))
      return kind === 'company' ? results[0] : { status: 'success', pagination: { page: query.page, limit: query.limit, total: found.total }, data: results }
    }))
  }
  router.post('/planning/allocate', deps.authenticate, deps.authorize(['admin', 'manager', 'analyst']), handle(async req => {
    const input = allocationBody.parse(req.body)
    if (input.clients) return allocate(input, input.clients)
    const context = await operations.allocationContext(input.productId, input.targetPeriod)
    if (context.available !== input.totalAvailableStock) throw new CommercialError(409, 'STOCK_CHANGED', 'Requested available stock does not match the verified ledger snapshot.')
    return allocate(input, context.clients.map(client => allocationClient.parse(client)))
  }))
  router.get('/audit/reconciliation', deps.authenticate, deps.authorize(['admin', 'manager']), handle(async req => {
    const query = reconciliationQuery.parse(req.query)
    return reconcileReceipts(await operations.receipts(query.startDate, query.endDate))
  }))
  return router
}
