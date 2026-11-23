// Browser-level geometry and interaction regression tests.
// Only runs in CI's browser job; the public site still has no runtime dependencies.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const screenshots = resolve(root, 'artifacts/visual');
mkdirSync(screenshots, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript; charset=utf-8'
};
const server = createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.writeHead(200).end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
try {
  const viewports = [
    { width: 375, height: 812 },
    { width: 768, height: 900 },
    { width: 960, height: 760 },
    { width: 1280, height: 800 },
    { width: 1600, height: 900 }
  ];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin, { waitUntil: 'load' });
    const positions = await page.evaluate(() => {
      const box = selector => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          right: rect.right, bottom: rect.bottom };
      };
      return {
        docWidth: document.documentElement.scrollWidth,
        poster: box('.poster'),
        stage: box('.stage-shell'),
        inspector: box('.studio-sidebar'),
        scenes: [...document.querySelectorAll('.scene-select')].map(el => el.getBoundingClientRect().width),
        settings: [...document.querySelectorAll('.setting')].map(el => el.getBoundingClientRect().width).filter(width => width > 0),
        posterBackground: getComputedStyle(document.querySelector('.poster')).backgroundImage
      };
    });
    const description = viewport.width + 'x' + viewport.height;
    assert.ok(positions.docWidth <= viewport.width + 2,
      description + ': horizontal page overflow ' + positions.docWidth);
    assert.ok(positions.poster.width > 180 && positions.poster.height > 200,
      description + ': poster is missing or collapsed');
    assert.ok(positions.poster.x >= positions.stage.x - 2 &&
      positions.poster.right <= positions.stage.right + 2,
      description + ': poster must stay inside the canvas');
    assert.notEqual(positions.posterBackground, 'none', description + ': poster paper did not render');
    assert.ok(positions.scenes.length === 5 && positions.scenes.every(width => width >= 30),
      description + ': sample thumbnails are too narrow');
    assert.ok(positions.settings.length >= 5 && positions.settings.every(width => width >= 190),
      description + ': inspector controls may wrap vertically');
    if (viewport.width > 1024) {
      assert.ok(positions.inspector.right <= positions.stage.x + 2,
        description + ': inspector should be to the left of canvas');
    } else {
      assert.ok(positions.inspector.y >= positions.stage.bottom - 2,
        description + ': inspector should be underneath canvas');
    }
    await page.screenshot({ path: resolve(screenshots, description + '.png'), fullPage: true });
    if (viewport.width === 1280) {
      await page.locator('.scene-select[data-target="2"]').click();
      assert.equal(await page.locator('#poster').getAttribute('data-scene'), '2');
      await page.locator('#depthSlider').evaluate(input => {
        input.value = '84';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.locator('#depthValue').textContent(), '84%');
      await page.locator('#reliefDirectionSlider').evaluate(input => {
        input.value = '180'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.match(await page.locator('#poster').evaluate(el => el.style.getPropertyValue('--hi-x')), /^-/);
      await page.locator('#edgeWeightSlider').evaluate(input => {
        input.value = '90'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.locator('#poster').evaluate(el => el.style.getPropertyValue('--imprint-stroke')), '1.70');
      await page.locator('#grainBlend').selectOption('multiply');
      assert.equal(await page.locator('#poster').evaluate(el => getComputedStyle(el, '::before').mixBlendMode), 'multiply');
      await page.locator('#lightColor').evaluate(input => {
        input.value = '#ffeecc'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.locator('#poster').evaluate(el => el.style.getPropertyValue('--light-rgb')), '255,238,204');
      await page.locator('#rotationSlider').evaluate(input => {
        input.value = '7'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.locator('#poster').evaluate(el => el.style.getPropertyValue('--scene-rotation')), '7deg');
      await page.locator('#exportSize').selectOption('2400');
      await page.reload();
      assert.equal(await page.locator('#exportSize').inputValue(), '2400');
      await page.locator('#themeButton').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.locator('#fullscreenButton').click();
      assert.equal(await page.locator('body.full-bleed').count(), 1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('body.full-bleed').count(), 0);
      await page.locator('#sceneMenuToggle').click();
      assert.equal(await page.locator('#sceneMenu').isVisible(), false);
      await page.locator('#sceneMenuToggle').click();
      assert.equal(await page.locator('#sceneMenu').isVisible(), true);
      await page.screenshot({ path: resolve(screenshots, 'desktop-dark.png'), fullPage: true });
    }
    assert.deepEqual(errors, [], description + ': uncaught page errors');
    console.log('PASS', description, 'canvas', Math.round(positions.stage.width),
      'inspector', Math.round(positions.inspector.width), 'poster', Math.round(positions.poster.width));
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolveServer => server.close(resolveServer));
}
