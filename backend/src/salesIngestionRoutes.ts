import express, { Request, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { createIntakeService, intakeConfig, IntakeActor, IntakeError, INTAKE_COLUMNS, INTAKE_LIMIT, INTAKE_POLICY } from './salesIngestion'

export function salesIngestionRouter(auth: RequestHandler, role: RequestHandler, audit: (actor: IntakeActor, id: string) => Promise<unknown>) {
  const router = express.Router()
  router.use(auth, role, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const actor = (req: Request) => (req as Request & { user: IntakeActor }).user
  const service = () => createIntakeService(intakeConfig())
  function failure(res: express.Response, error: unknown) {
    if (error instanceof IntakeError) return res.status(error.status).json({ error: error.message, code: error.code })
    return res.status(502).json({ error: 'Intake operation failed. No dashboard release was changed.', code: 'INGESTION_OPERATION_FAILED' })
  }
  router.get('/configuration', (_req, res) => {
    try { const config = intakeConfig(); res.json({ enabled: true, max_bytes: INTAKE_LIMIT, policy_version: INTAKE_POLICY, client_exports: config.clientExports === true }) }
    catch (error) { failure(res, error) }
  })
  router.get('/template', (_req, res) => res.type('text/csv').attachment('medshield-sales-template.csv').send(INTAKE_COLUMNS.join(',') + '\r\n'))
  router.post('/:id/correction-review/revalidate', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many source rechecks. Retry later.', code: 'INGESTION_RATE_LIMITED' } }), express.json({ limit: '2mb', strict: true }), async (req, res) => {
    try {
      if (!req.is('application/json')) throw new IntakeError('Send the saved correction review as application/json.', 415, 'INVALID_CORRECTION_REVIEW')
      if (Object.keys(req.query).length) throw new IntakeError('Source recheck accepts no query parameters.', 400, 'INVALID_CORRECTION_REVIEW')
      if (Buffer.byteLength(JSON.stringify(req.body) ?? '') > 2 * 1024 * 1024) throw new IntakeError('Saved correction review exceeds 2 MiB.', 413, 'INVALID_CORRECTION_REVIEW')
      res.json(await service().revalidateCorrectionReview(String(req.params.id), actor(req), req.body))
    } catch (error) { failure(res, error) }
  })
  router.post('/:id/correction-review', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many correction reviews. Retry later.', code: 'INGESTION_RATE_LIMITED' } }), express.json({ limit: '4kb', strict: true }), async (req, res) => {
    try {
      if (!req.is('application/json')) throw new IntakeError('Send correction review fields as application/json.', 415, 'INVALID_CORRECTION_REVIEW')
      if (Object.keys(req.query).length) throw new IntakeError('Correction review accepts JSON fields without query parameters.', 400, 'INVALID_CORRECTION_REVIEW')
      if (Buffer.byteLength(JSON.stringify(req.body) ?? '') > 4096) throw new IntakeError('Correction review fields exceed 4 KiB.', 413, 'INVALID_CORRECTION_REVIEW')
      res.json(await service().correctionReview(String(req.params.id), actor(req), req.body))
    } catch (error) { failure(res, error) }
  })
  router.post('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many intake requests. Retry later.', code: 'INGESTION_RATE_LIMITED' } }), express.raw({ type: 'text/csv', limit: '10mb' }), async (req, res) => {
    try {
      if (!req.is('text/csv') || !Buffer.isBuffer(req.body)) throw new IntakeError('Send the CSV with Content-Type: text/csv.', 415)
      if (typeof req.query.filename !== 'string') throw new IntakeError('A CSV filename is required.')
      const client = service()
      // Audit intent before remote writes; never include raw records or file contents.
      await audit(actor(req), 'submission-requested')
      const result = await client.submit(req.body, req.query.filename, actor(req))
      res.status(202).json(result)
    } catch (error) { failure(res, error) }
  })
  router.get('/:id', async (req, res) => {
    try { res.json(await service().status(String(req.params.id), actor(req))) } catch (error) { failure(res, error) }
  })
  router.get('/:id/reports/:kind', async (req, res) => {
    try {
      const kind = req.params.kind
      if (kind !== 'issues' && kind !== 'classifications') throw new IntakeError('Unknown report.')
      const bytes = await service().report(String(req.params.id), actor(req), kind)
      res.type('text/csv').attachment(`medshield-${kind}.csv`).send(bytes)
    } catch (error) { failure(res, error) }
  })
  router.use((error: unknown, _req: Request, res: express.Response, _next: express.NextFunction) => {
    if ((error as { type?: string }).type === 'entity.too.large') return res.status(413).json({ error: 'Request exceeds this intake route’s size limit.', code: 'INVALID_SALES_INTAKE' })
    if ((error as { type?: string }).type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request.', code: 'INVALID_CORRECTION_REVIEW' })
    return failure(res, error)
  })
  return router
}
