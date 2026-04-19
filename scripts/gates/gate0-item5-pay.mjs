// Gate 0 Item 5 — drive Stripe Checkout to completion for wallet load.
// Wait for redirect to /?wallet=success or /?wallet=cancelled.
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node gate0-item5-pay.mjs <checkout_url>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log('NAV:', url);
await page.goto(url, { waitUntil: 'domcontentloaded' });

await page.waitForSelector('#payment-method-accordion-item-title-card', { timeout: 60000 });
await page.locator('#payment-method-accordion-item-title-card').check({ force: true });
console.log('CARD_RADIO_CHECKED');
await page.screenshot({ path: 'verification/gate0-item5/after-radio.png', fullPage: true });
await page.waitForSelector('input#cardNumber', { timeout: 30000 });

async function fill(selector, value) {
  const el = await page.waitForSelector(selector, { timeout: 30000 });
  await el.fill(value);
}

await fill('input#cardNumber', '4242 4242 4242 4242');
await fill('input#cardExpiry', '12 / 30');
await fill('input#cardCvc', '123');
await fill('input#billingName', 'Test Gate');

const zipEl = await page.$('input#billingPostalCode');
if (zipEl) await zipEl.fill('12345');

const linkCheckbox = await page.$('input#enableStripePass');
if (linkCheckbox && (await linkCheckbox.isChecked())) {
  await linkCheckbox.uncheck({ force: true });
  console.log('LINK_OPTOUT');
}

const submit = await page.waitForSelector('button.SubmitButton, button[type="submit"][data-testid="hosted-payment-submit-button"]', { timeout: 15000 });
await submit.click();

console.log('WAITING_FOR_REDIRECT...');
try {
  await page.waitForURL((u) => /sparkle-suite\.vercel\.app\/\?wallet=(success|cancelled)/.test(u.toString()), {
    timeout: 120000,
  });
} catch (e) {
  console.log('REDIRECT_TIMEOUT current URL:', page.url());
  await page.screenshot({ path: 'verification/gate0-item5/post-submit-debug.png', fullPage: true });
  const errText = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('[role="alert"], .ErrorMessage, [data-testid*="error"]'));
    return errs.map((e) => e.textContent).join(' | ');
  });
  console.log('VISIBLE_ERRORS:', errText);
  throw e;
}

const finalUrl = page.url();
console.log('REDIRECT_URL:', finalUrl);

await page.screenshot({ path: 'verification/gate0-item5/success.png', fullPage: true });
console.log('SCREENSHOT: verification/gate0-item5/success.png');

await browser.close();
