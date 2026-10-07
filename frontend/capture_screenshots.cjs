const { chromium } = require('./node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

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

  // Wait for loading overlay to disappear
  console.log('Waiting for loading overlay to disappear...');
  try {
    await page.waitForSelector('.dashboard-loading-overlay', { state: 'detached', timeout: 30000 });
  } catch (e) {
    console.log('Loading overlay wait timed out, proceeding anyway...');
  }
  await page.waitForTimeout(2000);

  const pages = ['overview', 'revenue', 'products', 'territory', 'forecast', 'inventory'];

  for (const p of pages) {
    await page.evaluate((pageName) => {
      if (typeof window.showPage === 'function') window.showPage(pageName);
    }, p);
    await page.waitForTimeout(1500);

    const filePath = path.join(screenshotDir, `page-${p}-desktop.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
  }

  // Tablet screenshot for all pages
  await page.setViewportSize({ width: 820, height: 900 });
  for (const p of pages) {
    await page.evaluate((pageName) => {
      if (typeof window.showPage === 'function') window.showPage(pageName);
    }, p);
    await page.waitForTimeout(1000);
    const filePath = path.join(screenshotDir, `page-${p}-tablet-820.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
  }

  // Mobile screenshot for all pages
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of pages) {
    await page.evaluate((pageName) => {
      if (typeof window.showPage === 'function') window.showPage(pageName);
    }, p);
    await page.waitForTimeout(1000);
    const filePath = path.join(screenshotDir, `page-${p}-mobile-390.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);
  }

  await browser.close();
  console.log('Screenshots captured successfully!');
})().catch(err => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
