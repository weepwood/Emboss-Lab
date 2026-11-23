/* Emboss Lab / composition engine. No dependencies; validated, data-only layers. */
(() => {
  'use strict';
  const svg = document.getElementById('compositionSvg');
  const poster = document.getElementById('poster');
  const layerList = document.getElementById('compositionLayers');
  const panel = document.getElementById('compositionProperties');
  const message = document.getElementById('compositionHint');
  if (!svg || !layerList || !panel) return;
  const NS = 'http://www.w3.org/2000/svg';
  const KEY = 'emboss-lab-composition-v1';
  const MAX = 24;
  const H = 1222;
  const types = ['text','rect','circle','line','star','arrow'];
  const titles = {text:'文字',rect:'矩形',circle:'圆形',line:'线条',star:'星形',arrow:'箭头'};
  const fonts = {sans:'Arial,Helvetica,sans-serif',serif:'Georgia,serif',mono:'Consolas,monospace',display:'Arial Black,Arial,sans-serif'};
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const number = (v,d,a,b) => v !== null && v !== '' && Number.isFinite(Number(v)) ? clamp(Number(v),a,b) : d;
  const validColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#322a43';
  const el = tag => document.createElementNS(NS,tag);
  const dom = id => document.getElementById(id);
  let counter = 0;
  const id = () => 'layer-'+Date.now().toString(36)+'-'+(++counter).toString(36);
  let documentScenes = [[],[],[],[],[]];
  let scene = number(poster.dataset.scene,0,0,4);
  let selected = '';
  let drag = null;
  const inputs = {text:dom('layerText'),font:dom('layerFont'),weight:dom('layerWeight'),size:dom('layerSize'),x:dom('layerX'),y:dom('layerY'),angle:dom('layerAngle'),opacity:dom('layerOpacity'),color:dom('layerColor'),stroke:dom('layerStroke'),outline:dom('layerOutline'),emboss:dom('layerEmboss')};
  const layers = () => documentScenes[scene];
  const active = () => layers().find(v=>v.id===selected);
  const label = o => o.type==='text' ? (o.text.trim().replace(/\s+/g,' ').slice(0,18)||'空白文字') : titles[o.type];
  const inform = text => {message.textContent=text;};

  function sanitize(o) {
    if (!o || typeof o !== 'object' || !types.includes(o.type)) return null;
    return {id:id(),type:o.type,text:typeof o.text==='string'?o.text.slice(0,160):'在此输入文字',
      font:Object.prototype.hasOwnProperty.call(fonts,o.font)?o.font:'sans',
      weight:[400,500,600,700,800,900].includes(Number(o.weight))?Number(o.weight):700,
      x:number(o.x,50,0,100),y:number(o.y,50,0,100),
      size:number(o.size,o.type==='text'?56:130,16,320),
      angle:number(o.angle,0,-180,180),opacity:number(o.opacity,100,0,100),
      stroke:number(o.stroke,5,1,25),color:validColor(o.color),
      outline:!!o.outline,emboss:o.emboss!==false};
  }
  function cleanList(a){return Array.isArray(a)?a.slice(0,MAX).map(sanitize).filter(Boolean):[];}
  function load(){
    try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(data?.scenes))documentScenes=documentScenes.map((_,i)=>cleanList(data.scenes[i]));}catch(_){}
    try{const raw=new URLSearchParams(location.search).get('layers');if(raw&&raw.length<=16000)documentScenes[scene]=cleanList(JSON.parse(raw));}catch(_){}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,scenes:documentScenes}));}catch(_){inform('无法自动保存，请使用「保存工程」下载备份。');}}

  function drawLayer(o,selectedOutline){
    const g=el('g'),shape=el('g');
    g.dataset.layerId=o.id;
    g.setAttribute('transform','translate('+(o.x*10).toFixed(2)+' '+(o.y*H/100).toFixed(2)+') rotate('+o.angle+')');
    g.setAttribute('opacity',o.opacity/100);
    g.style.pointerEvents='visiblePainted';
    g.style.cursor='grab';
    shape.setAttribute('fill',o.outline&&o.type!=='text'?'none':o.color);
    shape.setAttribute('stroke',o.type==='text'?'none':o.color);
    shape.setAttribute('stroke-width',o.stroke);
    shape.setAttribute('stroke-linecap','round');
    shape.setAttribute('stroke-linejoin','round');
    if(o.emboss)shape.style.filter='drop-shadow(2px 2px 1px rgba(255,255,255,.42)) drop-shadow(-2px -2px 1px rgba(30,22,46,.42))';
    let w=o.size*1.5,h=o.size;
    if(o.type==='text'){
      const lines=(o.text||' ').split(/\r?\n/).slice(0,5);
      w=Math.max(o.size,Math.max(...lines.map(line=>[...line].length))*o.size*(o.font==='mono'?.62:.6));
      h=o.size*Math.max(1.1,lines.length*1.18);
      const t=el('text');
      t.setAttribute('font-size',o.size);t.setAttribute('font-family',fonts[o.font]);t.setAttribute('font-weight',o.weight);
      t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','central');
      t.setAttribute('y',((1-lines.length)*o.size*.59).toFixed(2));
      t.setAttribute('fill',o.color);t.setAttribute('stroke','none');
      lines.forEach((line,i)=>{const s=el('tspan');s.setAttribute('x',0);if(i)s.setAttribute('dy',o.size*1.18);s.textContent=line||' ';t.appendChild(s);});
      shape.appendChild(t);
    }else if(o.type==='rect'){
      const r=el('rect');r.setAttribute('x',-w/2);r.setAttribute('y',-h/2);r.setAttribute('width',w);r.setAttribute('height',h);r.setAttribute('rx',Math.min(18,o.size*.07));shape.appendChild(r);
    }else if(o.type==='circle'){
      w=h=o.size;const circle=el('circle');circle.setAttribute('r',o.size/2);shape.appendChild(circle);
    }else if(o.type==='star'){
      w=h=o.size*1.15;const star=el('polygon');
      star.setAttribute('points',Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=o.size*(i%2===0?.55:.24);return (Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2);}).join(' '));
      shape.appendChild(star);
    }else{
      w=o.size*1.8;h=o.type==='arrow'?o.size*.75:o.stroke*4;
      const half=o.size*.88;
      const d=o.type==='arrow'?'M '+(-half)+' 0 L '+half+' 0 M '+(half-o.size*.38)+' '+(-o.size*.34)+' L '+half+' 0 L '+(half-o.size*.38)+' '+(o.size*.34):'M '+(-half)+' 0 L '+half+' 0';
      const p=el('path');p.setAttribute('d',d);p.setAttribute('fill','none');shape.appendChild(p);
      const hit=p.cloneNode(true);hit.setAttribute('stroke','transparent');hit.setAttribute('stroke-width',Math.max(22,o.stroke));shape.appendChild(hit);
    }
    if(selectedOutline){
      const bounds=el('rect');
      bounds.setAttribute('x',-w/2-11);bounds.setAttribute('y',-h/2-11);bounds.setAttribute('width',w+22);bounds.setAttribute('height',h+22);
      bounds.setAttribute('fill','none');bounds.setAttribute('stroke','#ffffff');bounds.setAttribute('stroke-width',2);bounds.setAttribute('stroke-dasharray','8 5');
      bounds.classList.add('composition-selection');bounds.style.pointerEvents='none';g.appendChild(bounds);
    }
    g.appendChild(shape);
    return g;
  }
  function renderCanvas(){svg.replaceChildren(...layers().map(o=>drawLayer(o,o.id===selected)));}
  function renderList(){
    layerList.replaceChildren();
    if(!layers().length){const p=document.createElement('p');p.className='composer-empty';p.textContent='暂无图层，使用上方按钮添加文字或元素。';layerList.appendChild(p);}
    [...layers()].reverse().forEach((o,i)=>{
      const b=document.createElement('button');b.type='button';b.className='composition-layer-row'+(o.id===selected?' is-selected':'');
      b.dataset.selectLayer=o.id;b.setAttribute('aria-pressed',String(o.id===selected));
      const name=document.createElement('span');name.className='composition-layer-name';name.textContent=label(o);
      const sub=document.createElement('span');sub.className='composition-layer-type';sub.textContent=titles[o.type]+' · '+String(layers().length-i).padStart(2,'0');
      b.append(name,sub);layerList.appendChild(b);
    });
    dom('compositionCount').textContent=String(layers().length).padStart(2,'0')+' / '+MAX;
  }
  function syncFields(){
    const o=active();panel.hidden=!o;if(!o)return;
    dom('layerTextOptions').hidden=o.type!=='text';
    dom('layerShapeOptions').hidden=o.type==='text';
    for(const [key,input] of Object.entries(inputs)){
      if(input.type==='checkbox')input.checked=!!o[key];else input.value=o[key];
    }
    panel.querySelectorAll('[data-value-for]').forEach(node=>{
      const k=node.dataset.valueFor;
      node.textContent=o[k]+({x:'%',y:'%',size:'px',angle:'°',opacity:'%',stroke:'px'}[k]||'');
    });
    dom('selectedLayerName').textContent=label(o);
    dom('layerUp').disabled=layers().indexOf(o)===layers().length-1;
    dom('layerDown').disabled=layers().indexOf(o)===0;
  }
  function render(full=true){renderCanvas();if(full)renderList();syncFields();}
  function choose(id){selected=layers().some(o=>o.id===id)?id:'';render();if(selected)inform('拖动海报中的元素调整位置，方向键可微调。');}
  function add(type,init={}){
    if(!types.includes(type))return;
    if(layers().length>=MAX){inform('每张海报最多 24 个图层。');return;}
    const o=sanitize({type,text:'在此输入文字',x:50,y:42+(layers().length%8)*6,...init});
    layers().push(o);selected=o.id;save();render();
    inform('已添加'+titles[type]+'，可直接拖动或在属性栏修改。');
    if(type==='text'){inputs.text.focus();inputs.text.select();}
  }
  function change(key){
    const o=active(),input=inputs[key];if(!o)return;
    const updated=sanitize({...o,[key]:input.type==='checkbox'?input.checked:input.value});
    if(!updated)return;
    updated.id=o.id;Object.assign(o,updated);
    renderCanvas();syncFields();if(key==='text')renderList();save();
  }
  function order(delta){
    const o=active();if(!o)return;const i=layers().indexOf(o),j=i+delta;
    if(j<0||j>=layers().length)return;
    layers().splice(i,1);layers().splice(j,0,o);save();render();
  }
  function remove(){
    const i=layers().findIndex(o=>o.id===selected);if(i<0)return;
    layers().splice(i,1);selected=layers()[Math.min(i,layers().length-1)]?.id||'';
    save();render();inform('图层已删除。');
  }
  function point(e){const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};}
  svg.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const node=e.target.closest('[data-layer-id]');if(!node)return;
    const o=layers().find(o=>o.id===node.dataset.layerId);if(!o)return;
    selected=o.id;drag={id:e.pointerId,start:point(e),x:o.x,y:o.y};
    svg.setPointerCapture(e.pointerId);render();e.preventDefault();
  });
  svg.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;const o=active();if(!o)return;
    const p=point(e);o.x=Math.round(clamp(drag.x+p.x-drag.start.x,0,100)*10)/10;
    o.y=Math.round(clamp(drag.y+p.y-drag.start.y,0,100)*10)/10;render(false);
  });
  const stop=e=>{if(drag&&e.pointerId===drag.id){drag=null;save();}};
  svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  svg.addEventListener('dblclick',e=>{
    const node=e.target.closest('[data-layer-id]'),o=layers().find(o=>o.id===node?.dataset.layerId);
    if(o?.type==='text'){choose(o.id);inputs.text.focus();inputs.text.select();}
  });
  poster.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-layer-id]')&&selected&&!drag)choose('');});
  dom('compositionAdd').addEventListener('click',e=>{const b=e.target.closest('[data-add-layer]');if(b)add(b.dataset.addLayer);});
  layerList.addEventListener('click',e=>{const b=e.target.closest('[data-select-layer]');if(b)choose(b.dataset.selectLayer);});
  for(const [key,input] of Object.entries(inputs)){
    input.addEventListener(input.type==='checkbox'||input.tagName==='SELECT'?'change':'input',()=>change(key));
  }
  dom('layerUp').addEventListener('click',()=>order(1));
  dom('layerDown').addEventListener('click',()=>order(-1));
  dom('layerDuplicate').addEventListener('click',()=>{const o=active();if(o)add(o.type,{...o,x:clamp(o.x+4,0,100),y:clamp(o.y+4,0,100)});});
  dom('layerRemove').addEventListener('click',remove);
  document.addEventListener('keydown',e=>{
    if(!selected||e.altKey||e.ctrlKey||e.metaKey||document.body.classList.contains('full-bleed'))return;
    if(e.target?.matches('input,textarea,select,[contenteditable],[role="tab"]'))return;
    if(e.target?.closest?.('.studio-rail, .canvas-toolbar'))return;
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault();remove();return;}
    const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];
    if(!d)return;
    e.preventDefault();e.stopImmediatePropagation();
    const o=active(),step=e.shiftKey?5:.5;if(!o)return;
    o.x=clamp(o.x+d[0]*step,0,100);o.y=clamp(o.y+d[1]*step,0,100);save();render(false);
  },true);
  dom('compositionSave').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({format:'emboss-lab-composition',version:1,scenes:documentScenes},null,2)],{type:'application/json'});
    const href=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=href;a.download='emboss-lab-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),2000);
    inform('工程已保存，包含五张海报的图层。');
  });
  dom('compositionOpen').addEventListener('click',()=>dom('compositionFile').click());
  dom('compositionFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>128*1024){inform('工程文件不能超过 128 KB。');return;}
    try{
      const data=JSON.parse(await file.text());
      if(data?.format==='emboss-lab-composition'&&Array.isArray(data.scenes))documentScenes=documentScenes.map((_,i)=>cleanList(data.scenes[i]));
      else if(Array.isArray(data?.layers))documentScenes[scene]=cleanList(data.layers);
      else throw Error('invalid');
      selected='';save();render();inform('工程已载入。');
    }catch(_){inform('导入失败，请检查 JSON 工程格式。');}
  });
  function onSceneChanged(index){scene=number(index,0,0,4);selected='';drag=null;render();}
  function getShareData(){return layers().length?JSON.stringify(layers().map(({id,...data})=>data)):null;}
  function applyLayers(values,{replace=false}={}){
    const data=cleanList(values);documentScenes[scene]=replace?data:layers().concat(data).slice(0,MAX);
    selected=documentScenes[scene].at(-1)?.id||'';save();render();return data.length;
  }
  async function drawToCanvas(ctx,width,height){
    if(!layers().length)return;
    const copy=svg.cloneNode(false);
    copy.setAttribute('xmlns',NS);copy.setAttribute('width',width);copy.setAttribute('height',height);
    copy.setAttribute('viewBox','0 0 1000 1222');
    layers().forEach(o=>copy.appendChild(drawLayer(o,false)));
    const img=new Image(),serialized=new XMLSerializer().serializeToString(copy);
    await new Promise((resolve,reject)=>{
      img.onload=()=>{ctx.drawImage(img,0,0,width,height);resolve();};
      img.onerror=()=>reject(Error('SVG composition export failed'));
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(serialized);
    });
  }
  load();render();
  window.EmbossComposer={onSceneChanged,getShareData,applyLayers,drawToCanvas};
})();