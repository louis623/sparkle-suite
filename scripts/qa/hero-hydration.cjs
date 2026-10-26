// Cross-timezone regression: hydration must retain the first server hero node.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { authenticatePreview } = require('./preview-auth.cjs');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  for (const timezoneId of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    const context = await browser.newContext({ timezoneId });
    await authenticatePreview(context, process.argv[2]);
    await context.addInitScript(() => {
      new MutationObserver(() => {
        window.__firstHero ??= document.querySelector('.hp-hero');
      }).observe(document, { subtree: true, childList: true });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.argv[2] + '/skin-preview/sunset_beach/homepage', { waitUntil: 'networkidle' });
    const frame = page.frames().find(f => f.parentFrame()) || page.mainFrame();
    const state = await frame.evaluate(() => ({ retained: window.__firstHero === document.querySelector('.hp-hero'), localTimeActive: window.SPARKLE_FIRST_PAINT === null }));
    results.push({ timezoneId, ...state, errors });
    await context.close();
  }
  await browser.close();
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  if (results.some(r => !r.retained || !r.localTimeActive || r.errors.length)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
