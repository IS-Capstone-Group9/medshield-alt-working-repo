/** Keep the legacy shell's visual state and accessible toggle state together. */
export function patchDashboardNavigation(script: string): string {
  return script
    // The legacy CSS uses the drawer through 1024px. A lower script cutoff
    // leaves tablet navigation offscreen while the toggle changes desktop state.
    .replace(/const NAV_HIDE_WIDTH = \d+;/, 'const NAV_HIDE_WIDTH = 1024;')
    .replace(
      /function updateNavigationToggle\(\) \{[\s\S]*?(?=\nfunction resizeChartsAfterShellChange)/,
      `function updateNavigationToggle() {
  const toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  const expanded = getResponsiveNavState() === 'hidden'
    ? document.body.classList.contains('nav-open')
    : !document.body.classList.contains('nav-collapsed');
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Open navigation');
  toggle.setAttribute('aria-controls', 'dashboardNavigation');
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.inert = getResponsiveNavState() === 'hidden' && !expanded;
}
`,
    )
    .replace(
      /function toggleNavigation\(\) \{[\s\S]*?(?=\nfunction handleNavigationResize)/,
      `function toggleNavigation() {
  if (getResponsiveNavState() === 'hidden') {
    document.body.classList.toggle('nav-open');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) backdrop.style.display = document.body.classList.contains('nav-open') ? 'block' : 'none';
  } else {
    manualNavState = document.body.classList.contains('nav-collapsed') ? 'expanded' : 'collapsed';
    setNavigationState(manualNavState);
  }
  updateNavigationToggle();
  resizeChartsAfterShellChange();
}

function closeNavigation() {
  const sidebar = document.querySelector('.sidebar');
  const returnFocus = getResponsiveNavState() === 'hidden' && sidebar && sidebar.contains(document.activeElement);
  document.body.classList.remove('nav-open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  updateNavigationToggle();
  if (returnFocus) document.querySelector('.nav-toggle')?.focus();
}
`,
    )
    .replace(
      "if (state !== 'hidden') document.body.classList.remove('nav-open');",
      `if (state !== 'hidden') {
    document.body.classList.remove('nav-open');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }`,
    )
}
