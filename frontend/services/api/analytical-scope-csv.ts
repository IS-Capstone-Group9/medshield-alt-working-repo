type CorrectionRelease = { financial_scope?:{id:string;label:string;contracts_excluded:boolean;unreconciled:boolean;source_tables:string[];delta_version:number}; original_itemized?:{batch_id:string;dataset_id:string;source_table:string;delta_version:number;receipt_sha256:string}; analytical_integrity?: { id: string; manifest_sha256?: string; serving_table?: string; serving_version?: number } }

/** Preserve the predecessor identity while making the actually exported subset explicit. */
export function analyticalScopeCsv(rows: readonly (readonly unknown[])[], release?: CorrectionRelease): unknown[][] {
  const scope=release?.financial_scope
  const original=release?.original_itemized
  if(original&&scope&&rows.length) {
    const header=['Source batch','Dataset ID','Gold tables','Delta version','Receipt SHA256','Financial scope','Contracts excluded','Unreconciled arithmetic sum','Additivity','Complete company sales','Financial release approved','Unit approval','Forecast approval']
    const values=[original.batch_id,original.dataset_id,scope.source_tables.join('; '),scope.delta_version,original.receipt_sha256,scope.id,scope.contracts_excluded,scope.unreconciled,'unverified',false,false,false,false]
    return rows.map((row,index)=>[...row,...(index===0?header:values)])
  }
  if(original&&rows.length){
    const header=['Source batch','Dataset ID','Gold itemized table','Delta version','Receipt SHA256','Analytical population','Contracts excluded','Complete company sales','Financial release approved','Unit approval','Forecast approval']
    const values=[original.batch_id,original.dataset_id,original.source_table,original.delta_version,original.receipt_sha256,'original_itemized_sales_contracts_excluded',true,false,false,false,false]
    return rows.map((row,index)=>[...row,...(index===0?header:values)])
  }
  const truth = release?.analytical_integrity
  if (!truth || !rows.length) return rows.map(row => [...row])
  const header = ['Analytical correction ID', 'Correction manifest SHA256', 'Corrected serving table', 'Corrected Delta version', 'Analytical population', 'Complete company sales']
  const values = [truth.id, truth.manifest_sha256 ?? '', truth.serving_table ?? '', truth.serving_version ?? '', 'itemized_product_sales', false]
  return rows.map((row, index) => [...row, ...(index === 0 ? header : values)])
}
