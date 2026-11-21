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
    'blurSlider', 'grainSizeSlider', 'lightSizeSlider', 'lightXSlider', 'lightYSlider',
    'tintSlider', 'tintColor', 'tintBlend', 'scaleSlider', 'vignetteSlider',
    'followPointer', 'shortcutsButton', 'shortcutPanel',
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
  assert.match(css, /@media \(max-width: 800px\)\s*\{[\s\S]*?\.studio-sidebar\s*\{[^}]*max-height: none;/);
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

test('快捷键不再占用页脚，改为顶栏浮层；材质预设与本地保存可用', () => {
  assert.doesNotMatch(html, /<footer[\s\S]*?keycap[\s\S]*?切换作品/);
  assert.match(html, /id="shortcutsButton"[^>]*aria-expanded="false"[^>]*aria-controls="shortcutPanel"/);
  assert.match(html, /id="shortcutPanel"[^>]*hidden/);
  for (const preset of ['soft', 'standard', 'sharp']) {
    assert.ok(html.includes(`data-preset="${preset}"`), preset);
  }
  assert.match(html, /localStorage\.setItem\(SETTINGS_KEY/);
  assert.match(html, /localStorage\.getItem\(SETTINGS_KEY/);
});

test('侧栏承载全部编辑功能，含预设、着色、画面、分享与导出', () => {
  const sidebar = html.match(/<aside class="studio-sidebar"[\s\S]*?<\/aside>/)[0];
  for (const id of ['shuffleButton', 'themeButton', 'fullscreenButton']) {
    assert.match(sidebar, new RegExp('id="' + id + '"'), id + ' 应当位于侧栏功能区');
  }
  for (const label of ['压印', '光照', '着色', '画面']) {
    assert.ok(sidebar.includes('<summary class="sub-kicker">' + label + '</summary>'), label);
  }
  assert.match(sidebar, /id="copyLinkButton"/);
  assert.match(sidebar, /id="exportButton"/);
  assert.match(html, /--tint-opacity/);
  assert.match(html, /--vignette/);
  assert.match(html, /--grain-size/);
  assert.match(html, /--scene-scale/);
  // 顶栏不再放置切换作品的按钮
  const header = html.match(/<header class="topbar">[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(header, /shuffleButton|themeButton|fullscreenButton/);
});
