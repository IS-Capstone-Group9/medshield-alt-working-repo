export type ResearchPoint={method:string;origin:string;target_month:string;lead:number;actual:number;prediction:number;error:number}
export const ROBUSTNESS_POLICY='fixed_predictions_remove_one_scored_target_v1'
const methods=['last_value','mean_3','mean_6','seasonal_naive_12']
const epsilon=1e-9
/** Influence of scored targets only. Predictions stay fixed; this is not refitting or cross-validation. */
export function researchRobustness(all:ResearchPoint[],lead:number){
  if(![1,3].includes(lead))throw Error('Unsupported research lead')
  const groups=methods.map(method=>all.filter(point=>point.lead===lead&&point.method===method).sort((a,b)=>a.origin.localeCompare(b.origin)))
  const reference=groups[0],n=reference.length
  if(all.filter(point=>point.lead===lead).length!==groups.reduce((sum,group)=>sum+group.length,0))throw Error('Unknown research method')
  if(n<2||new Set(reference.map(point=>point.origin)).size!==n||new Set(reference.map(point=>point.target_month)).size!==n)throw Error('Invalid scored cohort')
  for(const group of groups){
    if(group.length!==n||group.some((point,index)=>point.origin!==reference[index].origin||point.target_month!==reference[index].target_month||point.actual!==reference[index].actual
      ||![point.actual,point.prediction,point.error].every(Number.isFinite)||Math.abs(point.error-(point.prediction-point.actual))>epsilon))throw Error('Unequal or invalid scored cohort')
  }
  const omitted=Array.from({length:n},(_,index)=>groups.map(group=>group.reduce((sum,point,j)=>sum+(j===index?0:Math.abs(point.error)),0)/(n-1)))
  const rows=groups.map((points,index)=>{
    const error=points.map(point=>Math.abs(point.error)),worst=Math.max(...error)
    const compare=error.map((value,j)=>value-Math.abs(reference[j].error))
    const omittedMeans=omitted.map(values=>values[index])
    return {method:methods[index],n,meanAbsoluteError:error.reduce((sum,value)=>sum+value,0)/n,
      betterThanLast:compare.filter(value=>value < -epsilon).length,tiedWithLast:compare.filter(value=>Math.abs(value)<=epsilon).length,worseThanLast:compare.filter(value=>value>epsilon).length,
      underpredictions:points.filter(point=>point.error < -epsilon).length,overpredictions:points.filter(point=>point.error>epsilon).length,exactPredictions:points.filter(point=>Math.abs(point.error)<=epsilon).length,
      worstAbsoluteError:worst,worstTargets:points.filter((_,j)=>Math.abs(error[j]-worst)<=epsilon).map(point=>point.target_month),
      omitOneMaeMin:Math.min(...omittedMeans),omitOneMaeMax:Math.max(...omittedMeans),
      lowestAfterOmission:omitted.filter(values=>values[index]-Math.min(...values)<=epsilon).length}
  })
  return {policy:ROBUSTNESS_POLICY,lead,n,referenceMethod:'last_value',tieToleranceAmpoules:epsilon,rows}
}
