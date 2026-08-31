import type { User } from './auth-tokens'

const SIDEBAR_ACCOUNT_CARD_MARKUP = `
  <div class="sidebar-account-card" data-testid="sidebar-account-card" role="group" aria-label="Signed-in MedShield account">
    <div class="sidebar-account-mark" aria-hidden="true">MS</div>
    <div class="sidebar-account-content">
      <div class="sidebar-account-kicker">Workspace access</div>
      <div class="sidebar-account-name" data-sidebar-account-name>MedShield Account</div>
      <div class="sidebar-account-status">
        <span class="sidebar-account-status-dot" aria-hidden="true"></span>
        <span data-sidebar-account-detail>Secure session</span>
      </div>
    </div>
  </div>
`

function formatAccountName(user: User | null) {
  const username = user?.username?.trim()
  if (!username) return 'MedShield Account'

  return username
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .slice(0, 32)
}

function formatAccountDetail(user: User | null) {
  const email = user?.email?.trim()
  return email ? email.slice(0, 48) : 'Secure session'
}

/**
 * Replaces the legacy planner-specific footer copy with an account-neutral
 * workspace card. User-provided values are assigned with textContent so an
 * account name or email can never become markup.
 */
export function hydrateSidebarAccountCard(root: ParentNode, user: User | null) {
  const sidebarUser = root.querySelector<HTMLElement>('.sidebar-user')
  if (!sidebarUser) return false

  sidebarUser.replaceChildren()
  sidebarUser.insertAdjacentHTML('beforeend', SIDEBAR_ACCOUNT_CARD_MARKUP)

  const accountName = sidebarUser.querySelector<HTMLElement>('[data-sidebar-account-name]')
  const accountDetail = sidebarUser.querySelector<HTMLElement>('[data-sidebar-account-detail]')
  if (accountName) accountName.textContent = formatAccountName(user)
  if (accountDetail) accountDetail.textContent = formatAccountDetail(user)

  return true
}
