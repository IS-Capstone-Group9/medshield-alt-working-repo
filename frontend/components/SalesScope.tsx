'use client'

import styles from './ItemizedPreview.module.css'

export default function SalesScope({value,disabled=false}:{value:'itemized'|'contracts';disabled?:boolean}) {
  return <div className={styles.scopeControl}>
    <label>Sales scope<select value={value} disabled={disabled} aria-describedby="salesScopeHelp" onChange={event=>{
      window.location.assign(event.target.value==='contracts'?'/contract-review':'/itemized-preview')
    }}>
      <option value="itemized">Itemized sales — contracts excluded</option>
      <option value="contracts">Contract summaries — separate review</option>
    </select></label>
    <p id="salesScopeHelp">Switching scope opens a separate view and resets filters. Contract amounts are not added to itemized totals while overlap is unresolved.</p>
  </div>
}
