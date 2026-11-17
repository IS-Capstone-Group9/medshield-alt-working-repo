import type { ListenerRecord } from './dashboard-engine'

/** Add keyboard/focus behavior to the existing help handlers and markup. */
export function installDashboardHelp(root: HTMLElement, listeners: ListenerRecord[]) {
  const backdrop = root.querySelector<HTMLElement>('#helpGuidanceModal')
  const dialog = backdrop?.querySelector<HTMLElement>('.custom-modal-card')
  const title = dialog?.querySelector<HTMLElement>('.custom-modal-header span')
  if (!backdrop || !dialog || !title) return
  title.id = 'dashboardHelpTitle'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', title.id)
  let opener: HTMLElement | null = null
  const restoreFocus = () => { if (opener?.isConnected) opener.focus() }
  const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
  )).filter(element => element.getClientRects().length > 0)
  const click = (event: Event) => {
    if (!(event.target instanceof Element)) return
    const trigger = event.target.closest<HTMLElement>('[aria-label="Open help"]')
    if (trigger) {
      opener = trigger
      focusable()[0]?.focus()
    } else if (event.target === backdrop || event.target.closest('#helpGuidanceModal button')) {
      restoreFocus()
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (backdrop.style.display === 'none') return
    if (event.key === 'Escape') {
      event.preventDefault()
      ;(window as unknown as {closeHelpModal: () => void}).closeHelpModal()
      restoreFocus()
    } else if (event.key === 'Tab') {
      const controls = focusable(), first = controls[0], last = controls.at(-1)
      if (!first || !last) return
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
  }
  root.addEventListener('click', click)
  root.addEventListener('keydown', keydown)
  listeners.push({target: root, type: 'click', listener: click}, {target: root, type: 'keydown', listener: keydown as EventListener})
}
