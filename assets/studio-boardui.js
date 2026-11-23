/* BoardUI-inspired visual workspace navigation; the existing editor stays framework-free. */
(() => {
  'use strict';
  const workspace = document.querySelector('.workspace');
  const inspector = document.querySelector('.studio-sidebar');
  const canvas = document.querySelector('.stage-shell');
  const poster = document.getElementById('poster');
  const paneButtons = [...document.querySelectorAll('[data-studio-pane]')];
  const panels = [...document.querySelectorAll('[data-editor-pane]')];
  const paneTitle = document.getElementById('inspectorPaneTitle');
  const paneDescription = document.getElementById('inspectorPaneDescription');
  const sceneIndex = document.getElementById('canvasSceneIndex');
  const gridButton = document.getElementById('canvasGridToggle');
  const panelButton = document.getElementById('canvasPanelToggle');
  const labels = {
    scenes: ['作品与模板', '在五组海报中选择基础视觉效果，继续编辑当前作品。'],
    layers: ['图层与元素', '添加文字与图形，在画布上直接拖动、调整细节。'],
    material: ['材质与光照', '使用预设或独立参数，细致调整浮雕纸张与光影。'],
    all: ['所有编辑设置', '按作品、图层、材质的顺序浏览并修改所有参数。']
  };
  if (!workspace || !inspector || !canvas || !poster || !paneButtons.length || !panels.length) return;

  function setPane(name) {
    if (!Object.prototype.hasOwnProperty.call(labels, name)) return;
    inspector.dataset.activePane = name;
    for (const button of paneButtons) {
      const active = button.dataset.studioPane === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const panel of panels) {
      panel.hidden = name !== 'all' && panel.dataset.editorPane !== name;
    }
    paneTitle.textContent = labels[name][0];
    paneDescription.textContent = labels[name][1];
    const scroller = inspector.querySelector('.sidebar-scroll');
    if (scroller) scroller.scrollTop = 0;
    workspace.classList.remove('is-inspector-collapsed');
    syncPanelButton();
  }

  function sceneNumber() {
    const value = Number(poster.dataset.scene);
    return Number.isInteger(value) && value >= 0 && value < 5 ? value : 0;
  }

  function updateSceneIndex() {
    const current = sceneNumber();
    sceneIndex.textContent = String(current + 1).padStart(2, '0') + ' / 05';
  }

  function changeScene(delta) {
    const next = (sceneNumber() + delta + 5) % 5;
    // Use the existing scene handler to retain poster, SVG layers and local setting state.
    document.querySelector('.scene-select[data-target="' + next + '"]')?.click();
    updateSceneIndex();
  }

  function syncPanelButton() {
    const open = !workspace.classList.contains('is-inspector-collapsed');
    panelButton.setAttribute('aria-expanded', String(open));
    panelButton.setAttribute('aria-label', open ? '收起编辑面板' : '展开编辑面板');
    panelButton.title = open ? '收起编辑面板' : '展开编辑面板';
  }

  paneButtons.forEach((button, index) => {
    button.addEventListener('click', () => setPane(button.dataset.studioPane));
    button.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const narrow = window.matchMedia('(max-width: 1024px)').matches;
      const next = event.key === 'Home' ? 0 :
        event.key === 'End' ? paneButtons.length - 1 :
        index + ((event.key === (narrow ? 'ArrowRight' : 'ArrowDown')) ? 1 :
          event.key === (narrow ? 'ArrowLeft' : 'ArrowUp') ? -1 : 0);
      if (next === index && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      paneButtons[(next + paneButtons.length) % paneButtons.length].focus();
    });
  });

  document.getElementById('canvasPrevScene')?.addEventListener('click', () => changeScene(-1));
  document.getElementById('canvasNextScene')?.addEventListener('click', () => changeScene(1));

  gridButton.addEventListener('click', () => {
    const showing = canvas.dataset.showGrid !== 'true';
    canvas.dataset.showGrid = String(showing);
    gridButton.setAttribute('aria-pressed', String(showing));
    gridButton.setAttribute('aria-label', showing ? '隐藏画布参考网格' : '显示画布参考网格');
    gridButton.title = showing ? '隐藏画布参考网格' : '显示画布参考网格';
    try { localStorage.setItem('emboss-lab-canvas-grid', String(showing)); } catch (_) {}
  });

  panelButton.addEventListener('click', () => {
    workspace.classList.toggle('is-inspector-collapsed');
    syncPanelButton();
  });

  // Current scene also changes through keyboard, random action and shared URL.
  new MutationObserver(updateSceneIndex).observe(poster, {
    attributes: true,
    attributeFilter: ['data-scene']
  });

  try {
    const showGrid = localStorage.getItem('emboss-lab-canvas-grid') === 'true';
    canvas.dataset.showGrid = String(showGrid);
    gridButton.setAttribute('aria-pressed', String(showGrid));
    gridButton.setAttribute('aria-label', showGrid ? '隐藏画布参考网格' : '显示画布参考网格');
    gridButton.title = showGrid ? '隐藏画布参考网格' : '显示画布参考网格';
  } catch (_) {}

  setPane('layers');
  updateSceneIndex();
  syncPanelButton();
  window.EmbossStudioUI = { setPane };
})();