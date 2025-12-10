const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push('[' + msg.type() + '] ' + msg.text()));

  // Collect errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto('http://localhost:8891', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    // Get page content
    const title = await page.title();
    const hasContent = await page.evaluate(() => document.body.innerText.trim().length > 0);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));

    // Check computed styles on body
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Check main div for background color
    const mainBg = await page.evaluate(() => {
      const el = document.querySelector('.bg-gray-950');
      return el ? getComputedStyle(el).backgroundColor : 'not found';
    });

    console.log('=== Page Analysis ===');
    console.log('Title:', title);
    console.log('Has visible content:', hasContent);
    console.log('Body background:', bgColor);
    console.log('Main div background (.bg-gray-950):', mainBg);
    console.log('\n=== Console Messages ===');
    consoleMessages.slice(0, 20).forEach(m => console.log(m));
    console.log('\n=== Page Errors ===');
    errors.forEach(e => console.log(e));
    console.log('\n=== Body Text ===');
    console.log(bodyText);

  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
})();
