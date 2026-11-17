import { Router, type RequestHandler } from 'express'
import { getItemizedPreview, getItemizedPreviewCsv, ItemizedPreviewInputError } from './itemizedPreview'

export function itemizedPreviewRouter(auth: RequestHandler, role: RequestHandler,
  services = {preview: getItemizedPreview, csv: getItemizedPreviewCsv}) {
  const router = Router()
  router.use(auth, role)
  router.use((_req, res, next) => {res.setHeader('Cache-Control', 'no-store'); next()})
  router.get('/', async (req, res) => {
    try { res.json(await services.preview(req.query)) }
    catch (error) { res.status(error instanceof ItemizedPreviewInputError ? 400 : 503).json({
      code: error instanceof ItemizedPreviewInputError ? 'INVALID_ITEMIZED_FILTER' : 'ITEMIZED_PREVIEW_UNAVAILABLE',
      error: error instanceof ItemizedPreviewInputError ? error.message : 'Original itemized preview is unavailable. No fallback values were used.'}) }
  })
  router.get('/export', async (req, res) => {
    try {
      const {view, ...filters} = req.query
      const output = await services.csv(view, filters)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`)
      res.send(output.csv)
    } catch (error) { res.status(error instanceof ItemizedPreviewInputError ? 400 : 503).json({
      code: error instanceof ItemizedPreviewInputError ? 'INVALID_ITEMIZED_FILTER' : 'ITEMIZED_PREVIEW_UNAVAILABLE',
      error: error instanceof ItemizedPreviewInputError ? error.message : 'Original itemized export is unavailable. No fallback values were used.'}) }
  })
  return router
}
