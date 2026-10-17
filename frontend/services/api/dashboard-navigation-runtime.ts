/** Keep the legacy shell's visual state and accessible toggle state together. */
export function patchDashboardNavigation(script: string): string {
  return script
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
  document.body.classList.remove('nav-open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  updateNavigationToggle();
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
