import {API_BASE_URL,authHeaders,getJson} from './api-client'
import type {ItemizedPreviewRow} from './itemized-preview'
export type ContractReviewData={source:{batch_id:string;dataset_id:string;source_table:string;receipt_sha256:string;delta_version:number;note:string;scope:string;excluded_from_itemized_totals:boolean;additive_to_itemized:string};filters:{year:string};summary:ItemizedPreviewRow;monthly:ItemizedPreviewRow[];available_years:string[]}
export const getContractReview=(year:string)=>getJson<ContractReviewData>('/api/sales/contract-review?'+new URLSearchParams({year}))
export async function downloadContractReview(year:string) {
  const response=await fetch(API_BASE_URL+'/api/sales/contract-review/export?'+new URLSearchParams({view:'monthly',year}),{cache:'no-store',headers:await authHeaders()})
  if(!response.ok) throw new Error('Contract export is unavailable. Refresh the review before trying again.')
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a')
  link.href=url;link.download='medshield-contract-review-monthly.csv';link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
