type SourceListener = {target: HTMLElement; type: 'click'; listener: () => void}

export function installSourceRecheck(root: HTMLElement, listeners: SourceListener[]) {
  const button = root.querySelector<HTMLButtonElement>('#sourceRecheck')
  const status = root.querySelector<HTMLElement>('#sourcePageStatus')
  if (!button) return
  const recheck = () => {
    if (button.disabled) return
    button.disabled = true
    if (status) status.textContent = 'Rechecking source. The dashboard is reloading.'
    try {
      window.location.reload()
    } catch {
      button.disabled = false
      if (status) status.textContent = 'Could not reload. Reload this page to retry source verification.'
    }
  }
  button.addEventListener('click', recheck)
  listeners.push({target: button, type: 'click', listener: recheck})
}
