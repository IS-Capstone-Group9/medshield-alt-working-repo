const installations = new WeakMap<HTMLElement, () => void>()

/** Keep source-derived stock estimates separate from user-entered scenarios. */
export function installPlanningWorkspace(root: HTMLElement) {
  installations.get(root)?.()
  const page = root.querySelector<HTMLElement>('#page-inventory')
  const stock = page?.querySelector<HTMLElement>('#stockPolicy')
  const scenario = page?.querySelector<HTMLElement>('[data-planning]')
  if (!page || !stock || !scenario) return () => {}
  let disposed = false

  const panels = [stock, scenario]
  const previous = panels.map(panel => ({ id: panel.id, role: panel.getAttribute('role'), label: panel.getAttribute('aria-labelledby'), hidden: panel.hidden }))
  scenario.id = 'planningScenarioPanel'
  const tabs = document.createElement('div')
  tabs.className = 'planning-task-tabs'
  tabs.setAttribute('role', 'tablist')
  tabs.setAttribute('aria-label', 'Planning task')
  const buttons = panels.map((panel, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'planningTask-' + index
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-controls', panel.id)
    button.textContent = index === 0 ? 'Stock estimates' : 'Build a scenario'
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', button.id)
    tabs.append(button)
    return button
  })
  stock.before(tabs)
  const select = (index: number, focus = false) => {
    panels.forEach((panel, i) => { panel.hidden = i !== index })
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index))
      button.tabIndex = i === index ? 0 : -1
    })
    if (focus) buttons[index].focus()
    window.dispatchEvent(new Event('resize'))
  }
  const click = (event: Event) => {
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index >= 0) select(index)
  }
  const keydown = (event: KeyboardEvent) => {
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    select(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true)
  }
  tabs.addEventListener('click', click)
  tabs.addEventListener('keydown', keydown)

  const examples = scenario.querySelector<HTMLElement>('.scenario-bar')
  const examplesDetails = document.createElement('details')
  examplesDetails.id = 'planningExampleInputs'
  const exampleTitle = document.createElement('summary')
  exampleTitle.textContent = 'Try example inputs'
  examplesDetails.append(exampleTitle)
  if (examples) { examples.before(examplesDetails); examplesDetails.append(examples) }
  const repeatedExample = scenario.querySelector<HTMLElement>('#planResetInputs')
  const resetWasHidden = repeatedExample?.hidden ?? false
  if (repeatedExample) repeatedExample.hidden = true

  const weights = scenario.querySelector<HTMLElement>('#planWeights')
  const metrics = scenario.querySelector<HTMLElement>('.plan-hero-grid')
  const refresh = () => {
    const weighted = scenario.querySelector<HTMLSelectElement>('#planAllocationMethod')?.value === 'weighted'
    if (weights) weights.hidden = !weighted
    scenario.querySelectorAll<HTMLElement>('[data-plan-weighted]').forEach(element => { element.hidden = !weighted })
    const shared = Boolean(scenario.querySelector<HTMLInputElement>('#planPurchaseCapacity')?.value.trim())
    scenario.querySelectorAll<HTMLElement>('[data-plan-shared-unit]').forEach(element => { element.hidden = !shared })
    if (metrics) metrics.hidden = scenario.querySelector<HTMLButtonElement>('#planExport')?.disabled !== false
  }
  scenario.addEventListener('input', refresh)
  scenario.addEventListener('change', refresh)
  const observer = new MutationObserver(refresh)
  observer.observe(scenario, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] })
  select(0)
  refresh()
  const dispose = () => {
    if (disposed) return
    disposed = true
    observer.disconnect()
    scenario.removeEventListener('input', refresh)
    scenario.removeEventListener('change', refresh)
    tabs.removeEventListener('click', click)
    tabs.removeEventListener('keydown', keydown)
    tabs.remove()
    if (examples?.parentElement === examplesDetails) examplesDetails.before(examples)
    examplesDetails.remove()
    if (repeatedExample) repeatedExample.hidden = resetWasHidden
    for (const element of [weights, metrics, ...scenario.querySelectorAll<HTMLElement>('[data-plan-weighted], [data-plan-shared-unit]')]) if (element) element.hidden = false
    panels.forEach((panel, i) => {
      panel.id = previous[i].id
      panel.hidden = previous[i].hidden
      for (const [name, value] of [['role', previous[i].role], ['aria-labelledby', previous[i].label]]) {
        if (value === null) panel.removeAttribute(name!)
        else panel.setAttribute(name!, value!)
      }
    })
    if (installations.get(root) === dispose) installations.delete(root)
  }
  installations.set(root, dispose)
  return dispose
}
