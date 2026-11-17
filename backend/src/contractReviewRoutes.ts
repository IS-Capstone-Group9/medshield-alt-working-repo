import {Router,type RequestHandler} from 'express'
import {getContractReview,getContractReviewCsv} from './contractReview'
import {ItemizedPreviewInputError} from './itemizedPreview'
export function contractReviewRouter(auth:RequestHandler,role:RequestHandler,
  services={preview:getContractReview,csv:getContractReviewCsv}) {
  const router=Router()
  router.use(auth,role)
  router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next()})
  router.get('/',async(req,res)=>{
    try{res.json(await services.preview(req.query))}
    catch(error){res.status(error instanceof ItemizedPreviewInputError?400:503).json({code:error instanceof ItemizedPreviewInputError?'INVALID_CONTRACT_FILTER':'CONTRACT_REVIEW_UNAVAILABLE',error:error instanceof ItemizedPreviewInputError?error.message:'Contract review is unavailable. No fallback figures were used.'})}
  })
  router.get('/export',async(req,res)=>{
    try{
      const {view,...filters}=req.query, output=await services.csv(view,filters)
      res.setHeader('Content-Type','text/csv; charset=utf-8')
      res.setHeader('Content-Disposition',`attachment; filename="${output.filename}"`)
      res.send(output.csv)
    }catch(error){res.status(error instanceof ItemizedPreviewInputError?400:503).json({code:error instanceof ItemizedPreviewInputError?'INVALID_CONTRACT_FILTER':'CONTRACT_REVIEW_UNAVAILABLE',error:error instanceof ItemizedPreviewInputError?error.message:'Contract export is unavailable. No fallback figures were used.'})}
  })
  return router
}
