import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/interface.css', import.meta.url), 'utf8');

test('页面可离线使用且脚本语法有效', () => {
  assert.match(html, /href="assets\/interface\.css"/);
  assert.match(html, /url\("assets\/grain\.svg"\)/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, '缺少页面脚本');
  assert.doesNotThrow(() => new Function(script));
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

test('五组海报场景和必要的控制 ID 保持完整', () => {
  const indices = [...html.matchAll(/<section class="scene(?: is-active)?" data-index="(\d)"/g)].map(x => Number(x[1]));
  assert.deepEqual(indices, [0, 1, 2, 3, 4]);
  for (const id of [
    'poster', 'sceneMenu', 'sceneCount', 'activeSceneName', 'shuffleButton',
    'themeButton', 'fullscreenButton', 'exitFullscreenButton',
    'depthSlider', 'grainSlider', 'lightSlider', 'resetButton',
    'heroWord', 'bigWord', 'hatchLine'
  ]) {
    const matches = [...html.matchAll(new RegExp('id="' + id + '"', 'g'))];
    assert.equal(matches.length, 1, id + ' 应当存在且唯一');
  }
});

test('界面有语义化明暗主题，移动端保留材质调节', () => {
  for (const token of ['--ui-bg', '--ui-surface', '--ui-stage', '--ui-text', '--ui-accent']) {
    assert.ok(css.includes(token + ':'), token);
  }
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media \(max-width: 800px\)\s*\{[\s\S]*?\.settings\s*\{\s*display: block;/);
  assert.match(html, /localStorage\.setItem\('emboss-lab-theme'/);
  assert.match(html, /--track-progress/);
});

test('控制按钮有可访问标签和键盘处理', () => {
  for (const id of ['shuffleButton', 'themeButton', 'fullscreenButton', 'exitFullscreenButton']) {
    assert.match(html, new RegExp('<button[^>]+id="' + id + '"[^>]*aria-label='));
  }
  for (const key of ["'ArrowRight'", "'ArrowLeft'", "'Home'", "'End'", "'Escape'"]) {
    assert.ok(html.includes(key), key);
  }
});
