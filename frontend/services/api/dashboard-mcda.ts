import {
  getCommercialMcda,
  type CommercialMcdaResult,
  type CommercialMcdaTerritory,
} from './mcda.service'

type McdaState = {
  result: CommercialMcdaResult | null
  salesWeight: number
  coverageWeight: number
}

const stateByRoot = new WeakMap<HTMLElement, McdaState>()

function appendCell(row: HTMLTableRowElement, text: string, align: 'left' | 'right' = 'right') {
  const cell = document.createElement('td')
  cell.textContent = text
  cell.style.textAlign = align
  row.appendChild(cell)
  return cell
}

function updateControlState(root: HTMLElement, state: McdaState) {
  const salesInput = root.querySelector<HTMLInputElement>('#mcdaWeightSalesValue')
  const coverageInput = root.querySelector<HTMLInputElement>('#mcdaWeightCoverage')
  const salesLabel = root.querySelector<HTMLElement>('#mcdaWeightSalesValueLabel')
  const coverageLabel = root.querySelector<HTMLElement>('#mcdaWeightCoverageLabel')
  const totalLabel = root.querySelector<HTMLElement>('#mcdaWeightTotal')
  if (salesInput) salesInput.value = String(state.salesWeight)
  if (coverageInput) coverageInput.value = String(state.coverageWeight)
  if (salesLabel) salesLabel.textContent = `${state.salesWeight}%`
  if (coverageLabel) coverageLabel.textContent = `${state.coverageWeight}%`
  if (totalLabel) totalLabel.textContent = `${state.salesWeight + state.coverageWeight}%`
}

function scoreTerritory(row: CommercialMcdaTerritory, state: McdaState): number {
  return (
    row.sales_value_score * state.salesWeight / 100
    + row.activity_coverage_score * state.coverageWeight / 100
  )
}

function renderRankingTable(root: HTMLElement, state: McdaState) {
  const table = root.querySelector<HTMLTableElement>('#priorityTable')
  if (!table || !state.result) return

  const card = table.closest<HTMLElement>('.chart-card')
  const title = card?.querySelector<HTMLElement>('.chart-title')
  const subtitle = card?.querySelector<HTMLElement>('.chart-subtitle')
  if (title) title.textContent = 'Candidate Commercial Priority Ranking'
  if (subtitle) {
    subtitle.textContent = `${state.result.dataset_id} · ${state.result.data_period} · reviewer approval pending`
  }

  const defaultRanks = new Map(
    state.result.territories.map((row) => [row.territory, row.priority_rank])
  )
  const ranked = state.result.territories
    .map((row) => ({ ...row, adjustedScore: scoreTerritory(row, state) }))
    .sort((left, right) => right.adjustedScore - left.adjustedScore || left.territory.localeCompare(right.territory))

  const head = document.createElement('thead')
  const headerRow = document.createElement('tr')
  for (const [label, align] of [
    ['Rank', 'left'],
    ['Territory', 'left'],
    ['Shift', 'left'],
    ['Commercial Score', 'right'],
    ['Sales-Value Score', 'right'],
    ['Month-Coverage Score', 'right'],
    ['Candidate Planning Note', 'left'],
  ] as const) {
    const header = document.createElement('th')
    header.textContent = label
    header.style.textAlign = align
    headerRow.appendChild(header)
  }
  head.appendChild(headerRow)

  const body = document.createElement('tbody')
  ranked.forEach((row, index) => {
    const currentRank = index + 1
    const baselineRank = defaultRanks.get(row.territory) ?? currentRank
    const shift = baselineRank === currentRank
      ? 'No change'
      : currentRank < baselineRank
        ? `Up ${baselineRank - currentRank}`
        : `Down ${currentRank - baselineRank}`
    const tableRow = document.createElement('tr')
    const rankCell = appendCell(tableRow, `#${currentRank}`, 'left')
    rankCell.style.fontWeight = '800'
    const territoryCell = appendCell(tableRow, row.territory, 'left')
    territoryCell.style.fontWeight = '700'
    appendCell(tableRow, shift, 'left')
    const scoreCell = appendCell(tableRow, row.adjustedScore.toFixed(1))
    scoreCell.style.fontWeight = '800'
    scoreCell.style.color = 'var(--accent)'
    appendCell(tableRow, row.sales_value_score.toFixed(1))
    appendCell(tableRow, row.activity_coverage_score.toFixed(1))
    appendCell(
      tableRow,
      currentRank <= 3
        ? 'High commercial-priority candidate; validate stock and budget before allocation.'
        : 'Candidate ranking only; monitor and review before allocation.',
      'left'
    )
    body.appendChild(tableRow)
  })

  table.replaceChildren(head, body)
}

function setLoadingState(root: HTMLElement, loading: boolean, error?: string) {
  const status = root.querySelector<HTMLElement>('#mcdaCriteriaStatus')
  const reset = root.querySelector<HTMLButtonElement>('#mcdaResetWeights')
  const inputs = root.querySelectorAll<HTMLInputElement>('[data-mcda-supported-weight]')
  inputs.forEach((input) => { input.disabled = loading || Boolean(error) })
  if (reset) reset.disabled = loading || Boolean(error)
  if (!status) return
  status.textContent = error ?? (loading ? 'Loading governed criteria' : 'Candidate model · review pending')
  status.classList.remove('status-ready', 'status-draft', 'status-blocked')
  status.classList.add(error ? 'status-blocked' : 'status-draft')
}

function replaceLegacyPanel(root: HTMLElement): HTMLElement | null {
  const legacyInput = root.querySelector('#mcdaWeightSurge')
  const panel = legacyInput?.closest<HTMLElement>('.chart-card')
  if (!panel) return null
  panel.dataset.mcdaSensitivity = 'commercial-candidate'
  panel.innerHTML = `
    <div class="chart-header">
      <div>
        <div class="chart-title">Commercial Priority MCDA Weight Sensitivity</div>
        <div class="chart-subtitle">Supported criteria only. Adjustable weights always total 100%.</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="mcdaCriteriaStatus" class="status-pill status-draft">Loading governed criteria</span>
        <button id="mcdaResetWeights" class="btn btn-secondary" type="button" disabled style="font-size:11px; padding:4px 10px;">Reset 60/40</button>
      </div>
    </div>
    <div style="background:var(--bg-elevated); padding:14px 16px; border-radius:8px; border:1px solid var(--border);">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap:18px;">
        <div>
          <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <label for="mcdaWeightSalesValue">Candidate Sales-Value Scale</label>
            <span id="mcdaWeightSalesValueLabel" style="color:var(--accent);">60%</span>
          </div>
          <input data-mcda-supported-weight type="range" id="mcdaWeightSalesValue" min="0" max="100" value="60" disabled style="width:100%; accent-color:var(--accent);" />
          <div style="font-size:10px; color:var(--text-muted); margin-top:3px;">Territory net_cost total normalized to the largest approved territory. Candidate financial mapping.</div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <label for="mcdaWeightCoverage">Observed Month Coverage</label>
            <span id="mcdaWeightCoverageLabel" style="color:var(--emerald);">40%</span>
          </div>
          <input data-mcda-supported-weight type="range" id="mcdaWeightCoverage" min="0" max="100" value="40" disabled style="width:100%; accent-color:var(--emerald);" />
          <div style="font-size:10px; color:var(--text-muted); margin-top:3px;">Unique active sales months divided by available months in the publication candidate.</div>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 16px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:10px; color:var(--text-muted);">
        <span><strong style="color:var(--text-secondary);">Excluded:</strong> Outbreak risk · P7 territory-level DOH validation pending</span>
        <span><strong style="color:var(--text-secondary);">Excluded:</strong> Supplier lead time · P8 history unavailable</span>
        <span><strong style="color:var(--text-secondary);">Weight total:</strong> <span id="mcdaWeightTotal">100%</span></span>
      </div>
    </div>`
  return panel
}

export function renderMcdaSensitivity(root: HTMLElement) {
  const state = stateByRoot.get(root)
  if (!state) return
  updateControlState(root, state)
  renderRankingTable(root, state)
}

export function installMcdaSensitivity(root: HTMLElement, activeListeners: any[]) {
  const panel = replaceLegacyPanel(root)
  if (!panel) return

  const state: McdaState = { result: null, salesWeight: 60, coverageWeight: 40 }
  stateByRoot.set(root, state)

  const salesInput = root.querySelector<HTMLInputElement>('#mcdaWeightSalesValue')
  const coverageInput = root.querySelector<HTMLInputElement>('#mcdaWeightCoverage')
  const reset = root.querySelector<HTMLButtonElement>('#mcdaResetWeights')

  const updateFromSales = () => {
    state.salesWeight = Number(salesInput?.value ?? 60)
    state.coverageWeight = 100 - state.salesWeight
    renderMcdaSensitivity(root)
  }
  const updateFromCoverage = () => {
    state.coverageWeight = Number(coverageInput?.value ?? 40)
    state.salesWeight = 100 - state.coverageWeight
    renderMcdaSensitivity(root)
  }
  const resetWeights = () => {
    state.salesWeight = Math.round((state.result?.weights.sales_value ?? 0.60) * 100)
    state.coverageWeight = 100 - state.salesWeight
    renderMcdaSensitivity(root)
  }

  salesInput?.addEventListener('input', updateFromSales)
  coverageInput?.addEventListener('input', updateFromCoverage)
  reset?.addEventListener('click', resetWeights)
  if (salesInput) activeListeners.push({ target: salesInput, type: 'input', listener: updateFromSales })
  if (coverageInput) activeListeners.push({ target: coverageInput, type: 'input', listener: updateFromCoverage })
  if (reset) activeListeners.push({ target: reset, type: 'click', listener: resetWeights })

  ;(window as any).updateMcdaWeights = updateFromSales
  ;(window as any).resetMcdaWeights = resetWeights

  setLoadingState(root, true)
  void getCommercialMcda()
    .then((result) => {
      state.result = result
      state.salesWeight = Math.round(result.weights.sales_value * 100)
      state.coverageWeight = 100 - state.salesWeight
      setLoadingState(root, false)
      renderMcdaSensitivity(root)
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'MCDA criteria could not be loaded'
      setLoadingState(root, false, message)
    })
}
