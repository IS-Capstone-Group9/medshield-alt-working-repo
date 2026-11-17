import {getDatabricksPlanningShortlist,DatabricksDashboardInputError} from './databricksDashboard'
import {reviewDatedPlan} from './datedPlanReview'
import {selectDatedPlan} from './datedPlanSelection'
import {PlanningScenarioInputError} from './planningInputs'
export async function reviewDatabricksDatedPlan(body:Record<string,unknown>,select=false){
 if(body.acknowledged!==true||JSON.stringify(body).length>260000)throw new DatabricksDashboardInputError('Acknowledge a bounded dated-plan review request')
 const snapshot=body.snapshot
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new DatabricksDashboardInputError('Dated snapshot required')
 const scope=(snapshot as Record<string,unknown>).scope
 if(!scope||typeof scope!=='object'||Array.isArray(scope))throw new DatabricksDashboardInputError('Dated scope required')
 const filters=scope as Record<string,unknown>
 if(typeof filters.sector!=='string'||typeof filters.territory!=='string')throw new DatabricksDashboardInputError('Invalid dated scope')
 const shortlist=await getDatabricksPlanningShortlist({sector:filters.sector,territory:filters.territory})
 try{
  const result=select?selectDatedPlan(body,shortlist):reviewDatedPlan(body,shortlist)
  const after=await getDatabricksPlanningShortlist({sector:filters.sector,territory:filters.territory})
  if(after.source.checksum!==shortlist.source.checksum)throw new DatabricksDashboardInputError('Source changed during dated-plan review')
  return result
 }catch(error){if(error instanceof PlanningScenarioInputError)throw new DatabricksDashboardInputError(error.message);throw error}
}
