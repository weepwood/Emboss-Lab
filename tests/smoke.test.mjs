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

test('工作台 HTML 结构必须正确嵌套，防止侧栏脱离网格', () => {
  const markup = html.match(/<main>[\s\S]*?<\/main>/)?.[0];
  assert.ok(markup, '页面缺少主布局');
  const stack = [];
  for (const match of markup.matchAll(/<\/?(?:main|div|aside|section|details)\b[^>]*>/g)) {
    const closing = match[0].startsWith('</');
    const tag = match[0].match(/^<\/?([a-z]+)/)[1];
    if (!closing) {
      stack.push(tag);
    } else {
      assert.equal(stack.pop(), tag, '布局标签嵌套不正确: ' + match[0]);
    }
  }
  assert.deepEqual(stack, [], '存在未闭合的布局标签');
  assert.equal((markup.match(/<details class="panel-sub"/g) || []).length, 4);
});

test('从内联样式拆分后仍保留必要的响应式布局基础', () => {
  const required = {
    '全局盒模型': /\*,\s*\*::before,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box/,
    '应用容器': /\.app\s*\{[^}]*display:\s*flex/,
    '顶栏水平排列': /\.topbar\s*\{[^}]*display:\s*flex/,
    '品牌水平排列': /\.brand\s*\{[^}]*display:\s*inline-flex/,
    '主工作区网格': /\.workspace\s*\{[^}]*display:\s*grid/,
    '设置侧栏纵向布局': /\.studio-sidebar\s*\{[^}]*display:\s*flex/,
    '作品色卡网格': /\.scene-menu\s*\{[^}]*display:\s*grid/,
    '作品按钮水平布局': /\.scene-select\s*\{[^}]*display:\s*flex/,
    '作品预览色块': /\.swatch\.dusk\s*\{[^}]*background:/,
    '窄屏单栏布局': /@media \(max-width: 800px\)[\s\S]*?\.workspace\s*\{[^}]*flex-direction:\s*column/,
    '退出沉浸模式按钮定位': /\.exit-full\s*\{[^}]*position:\s*fixed/
  };
  for (const [name, pattern] of Object.entries(required)) {
    assert.match(css, pattern, name + ' 的样式缺失');
  }
});


test('新工作台采用双区布局、紧凑色卡和统一的主操作层级', () => {
  assert.match(css, /--ui-inspector-width:\s*360px/);
  assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--ui-inspector-width\)/);
  assert.match(css, /\.scene-menu\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /#exportButton\s*\{[^}]*background:\s*var\(--ui-accent\)/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*?\.workspace\s*\{[^}]*flex-direction:\s*column/);
  assert.match(html, /id="actionNote" role="status" aria-live="polite"/);
  assert.match(html, /<details class="panel-sub">\s*<summary class="sub-kicker">画面<\/summary>/);
  assert.equal((html.match(/<span class="swatch /g) || []).length, 5);
});
