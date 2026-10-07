type McdaState = {
  salesWeight: number
  coverageWeight: number
}

const stateByRoot = new WeakMap<HTMLElement, McdaState>()

function applyWeightsToAreaRanking(state: McdaState) {
  const apply = (window as any).setAreaPriorityWeights
  if (typeof apply === 'function') apply(state.salesWeight, state.coverageWeight)
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

function replaceLegacyPanel(root: HTMLElement): HTMLElement | null {
  const legacyInput = root.querySelector('#mcdaWeightSurge')
  const panel = legacyInput?.closest<HTMLElement>('.chart-card')
  if (!panel) return null
  panel.dataset.mcdaSensitivity = 'selected-period-live'
  panel.innerHTML = `
    <div class="area-section-eyebrow">02 · Interactive MCDA sensitivity</div>
    <div class="chart-header">
      <div>
        <div class="chart-title">Commercial Priority Weight Sensitivity</div>
        <div class="chart-subtitle">Uses the same selected period, buyer cluster, product, and evidence scope as the area ranking above.</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span id="mcdaCriteriaStatus" class="status-pill status-ready" role="status" aria-live="polite">Live selected-period data</span>
        <button id="mcdaResetWeights" class="btn btn-secondary" type="button" style="font-size:11px; padding:4px 10px;">Reset 60/40</button>
      </div>
    </div>
    <div style="background:var(--bg-elevated); padding:14px 16px; border-radius:8px; border:1px solid var(--border);">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap:18px;">
        <div>
          <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <label for="mcdaWeightSalesValue">Sales-Value Scale</label>
            <output id="mcdaWeightSalesValueLabel" for="mcdaWeightSalesValue" style="color:var(--accent);">60%</output>
          </div>
          <input data-mcda-supported-weight type="range" id="mcdaWeightSalesValue" min="0" max="100" value="60" aria-describedby="mcdaSalesHelp mcdaWeightRule" style="width:100%; accent-color:var(--accent);" />
          <div id="mcdaSalesHelp" style="font-size:10px; color:var(--text-muted); margin-top:3px;">Selected-period mapped net sales normalized to the largest area.</div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <label for="mcdaWeightCoverage">Active-Period Coverage</label>
            <output id="mcdaWeightCoverageLabel" for="mcdaWeightCoverage" style="color:var(--emerald);">40%</output>
          </div>
          <input data-mcda-supported-weight type="range" id="mcdaWeightCoverage" min="0" max="100" value="40" aria-describedby="mcdaCoverageHelp mcdaWeightRule" style="width:100%; accent-color:var(--emerald);" />
          <div id="mcdaCoverageHelp" style="font-size:10px; color:var(--text-muted); margin-top:3px;">Unique active days, months, or years divided by available periods in the current selection.</div>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 16px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:10px; color:var(--text-muted);">
        <span><strong style="color:var(--text-secondary);">Updates:</strong> Ranking chart · leading area · score order · evidence table</span>
        <span><strong style="color:var(--text-secondary);">Excluded:</strong> Outbreak risk and supplier lead time until validated</span>
        <span id="mcdaWeightRule"><strong style="color:var(--text-secondary);">Lock rule:</strong> Sales value + active-period coverage = <output id="mcdaWeightTotal">100%</output></span>
      </div>
    </div>`
  return panel
}

export function renderMcdaSensitivity(root: HTMLElement) {
  const state = stateByRoot.get(root)
  if (!state) return
  updateControlState(root, state)
  applyWeightsToAreaRanking(state)
}

export function installMcdaSensitivity(root: HTMLElement, activeListeners: any[]) {
  const panel = replaceLegacyPanel(root)
  if (!panel) return

  const state: McdaState = { salesWeight: 60, coverageWeight: 40 }
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
    state.salesWeight = 60
    state.coverageWeight = 40
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
  renderMcdaSensitivity(root)
}
