const installations = new WeakMap<HTMLElement, () => void>()

/** Separate the outlook, retrospective accuracy and independently scoped research. */
export function installForecastWorkspace(root: HTMLElement) {
  installations.get(root)?.()
  const page = root.querySelector<HTMLElement>('#page-forecast')
  const card = page?.querySelector<HTMLElement>('[data-forecast-validation]')
  const outlook = card?.querySelector<HTMLElement>('#forecastOutlook')
  const accuracy = card?.querySelector<HTMLElement>('#forecastAccuracy')
  const research = page?.querySelector<HTMLDetailsElement>('#forecastResearchDetails')
  if (!page || !card || !outlook || !accuracy || !research) return () => {}

  // Keep the original nodes and their live state; only their presentation moves.
  const moves: Array<{ element: HTMLElement; marker: Comment }> = []
  const move = (element: HTMLElement, parent: HTMLElement) => {
    const marker = document.createComment('forecast workspace position')
    element.before(marker)
    moves.push({ element, marker })
    parent.append(element)
  }
  const researchPanel = document.createElement('section')
  researchPanel.id = 'forecastResearchPanel'
  card.after(researchPanel)
  move(research, researchPanel)
  const external = page.querySelector<HTMLElement>('#externalRegressionDetails')
  if (external) move(external, researchPanel)

  const disclosures: HTMLDetailsElement[] = []
  for (const [selector, label] of [
    ['#salesStreams', 'Routine sales and large orders'],
    ['#dxReadiness', 'Getting ready for large orders'],
  ]) {
    const panel = page.querySelector<HTMLElement>(selector)
    if (!panel) continue
    const details = document.createElement('details')
    details.className = 'dashboard-supporting-evidence'
    details.id = selector.slice(1) + 'Context'
    const summary = document.createElement('summary')
    summary.textContent = label
    details.append(summary)
    outlook.append(details)
    move(panel, details)
    disclosures.push(details)
  }

  const panels = [outlook, accuracy, researchPanel]
  const previous = panels.map(panel => ({ role: panel.getAttribute('role'), label: panel.getAttribute('aria-labelledby'), tabindex: panel.getAttribute('tabindex'), hidden: panel.hidden }))
  const cardWasHidden = card.hidden
  const researchWasOpen = research.open
  let researchOpened = false
  const tabs = document.createElement('div')
  tabs.className = 'dashboard-task-tabs'
  tabs.setAttribute('role', 'tablist')
  tabs.setAttribute('aria-label', 'Forecast task')
  const buttons = panels.map((panel, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'forecastTask-' + index
    button.textContent = ['Outlook', 'Past accuracy', 'Research'][index]
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-controls', panel.id)
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', button.id)
    // Both non-research panels contain focusable controls; this also permits direct panel focus.
    panel.tabIndex = 0
    tabs.append(button)
    return button
  })
  card.before(tabs)
  let selected = 0
  let frame = 0
  let disposed = false
  const select = (index: number, focus = false) => {
    selected = index
    card.hidden = index === 2
    if (index === 2 && !researchOpened) { research.open = true; researchOpened = true }
    panels.forEach((panel, i) => { panel.hidden = i !== index })
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index))
      button.tabIndex = i === index ? 0 : -1
    })
    if (focus) buttons[index].focus()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  }
  const click = (event: Event) => {
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index >= 0) select(index)
  }
  const keydown = (event: KeyboardEvent) => {
    if (!buttons.includes(event.target as HTMLButtonElement) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (selected + (event.key === 'ArrowRight' ? 1 : 2)) % 3
    select(index, true)
  }
  tabs.addEventListener('click', click)
  tabs.addEventListener('keydown', keydown)
  select(0)

  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    tabs.removeEventListener('click', click)
    tabs.removeEventListener('keydown', keydown)
    tabs.remove()
    card.hidden = cardWasHidden
    research.open = researchWasOpen
    panels.forEach((panel, i) => {
      panel.hidden = previous[i].hidden
      for (const [name, value] of [['role', previous[i].role], ['aria-labelledby', previous[i].label], ['tabindex', previous[i].tabindex]]) {
        if (value === null) panel.removeAttribute(name!)
        else panel.setAttribute(name!, value!)
      }
    })
    moves.forEach(({ element, marker }) => { marker.replaceWith(element) })
    disclosures.forEach(details => details.remove())
    researchPanel.remove()
    if (installations.get(root) === dispose) installations.delete(root)
  }
  installations.set(root, dispose)
  return dispose
}
