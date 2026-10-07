const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  await page.fill('#username', 'admin');
  await page.fill('#password', 'Medshield!2025');
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  await page.waitForURL('**/', { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#topbar-title', { timeout: 30000 });

  // Helper to audit current page charts
  async function auditCharts(pageName, width) {
    console.log(`\n========================================`);
    console.log(`AUDIT: Page '${pageName}' at width ${width}px`);
    console.log(`========================================`);

    // Switch to page if not already
    await page.evaluate((p) => {
      if (typeof window.showPage === 'function') window.showPage(p);
    }, pageName);
    await page.waitForTimeout(600);

    const report = await page.evaluate(() => {
      const activePage = document.querySelector('.page.active');
      if (!activePage) return { error: 'No active page' };

      const cards = Array.from(activePage.querySelectorAll('.chart-card, .plan-chart-card'));
      const cardData = cards.map((c, i) => {
        const rect = c.getBoundingClientRect();
        const style = window.getComputedStyle(c);
        const header = c.querySelector('.chart-header');
        const headerStyle = header ? window.getComputedStyle(header) : null;
        const wraps = Array.from(c.querySelectorAll('.chart-wrap, .area-chart-wrap, .reg-wrap, [style*="height"]'));
        const wrapData = wraps.filter(w => w.querySelector('canvas') || w.tagName.toLowerCase() === 'canvas').map(w => {
          const wRect = w.getBoundingClientRect();
          const wStyle = window.getComputedStyle(w);
          const canvas = w.tagName.toLowerCase() === 'canvas' ? w : w.querySelector('canvas');
          const cRect = canvas ? canvas.getBoundingClientRect() : null;
          return {
            className: w.className,
            width: Math.round(wRect.width),
            height: Math.round(wRect.height),
            computedHeight: wStyle.height,
            canvasId: canvas ? canvas.id : 'none',
            canvasWidth: cRect ? Math.round(cRect.width) : 0,
            canvasHeight: cRect ? Math.round(cRect.height) : 0,
          };
        });

        const title = c.querySelector('.chart-title, h3')?.textContent?.trim() || `Card ${i}`;
        return {
          title: title.slice(0, 45),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
          marginBottom: style.marginBottom,
          wraps: wrapData,
        };
      });

      return { pageId: activePage.id, cards: cardData };
    });

    for (const card of report.cards) {
      console.log(`- Card: "${card.title}" [${card.width}x${card.height}px, pad: ${card.padding}, mb: ${card.marginBottom}]`);
      for (const w of card.wraps) {
        console.log(`    Wrap: .${w.className} -> ${w.width}x${w.height}px (computed: ${w.computedHeight}) | Canvas #${w.canvasId}: ${w.canvasWidth}x${w.canvasHeight}px`);
      }
    }
  }

  const widths = [1440, 1024, 768, 390];
  const pages = ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory'];

  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const p of pages) {
      await auditCharts(p, w);
    }
  }

  await browser.close();
  console.log('\nAudit complete!');
})().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
