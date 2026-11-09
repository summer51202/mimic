const { groups, scenes, homeRegistration, idle } = window.calibration;
const zoom = document.querySelector('#zoom');
const reduce = document.querySelector('#reduce');
const status = document.querySelector('#status');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
reduce.checked = preference.matches;
preference.addEventListener('change', (event) => {
  reduce.checked = event.matches;
  active?.finish();
});
document.querySelector('#gray').onchange = (event) => document.body.classList.toggle('gray', event.target.checked);
const images = new Map();
function load(path) {
  if (!images.has(path)) {
    const image = new Image();
    image.src = path;
    images.set(path, image.decode().then(() => image));
  }
  return images.get(path);
}
function figure(caption, item, className = 'raster') {
  const node = document.createElement('figure');
  const box = document.createElement('div');
  box.className = className;
  box.append(item);
  const label = document.createElement('figcaption');
  label.textContent = caption;
  node.append(box, label);
  return node;
}
function masterFigure(master) {
  const image = new Image();
  image.src = master.path;
  image.alt = '核准 master';
  image.loading = 'lazy';
  return figure('核准 master', image);
}
function canvasFor(width, height, label) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  return canvas;
}
function bindZoom(canvas) {
  const update = () => { canvas.style.width = canvas.width * Number(zoom.value) + 'px'; };
  update();
  zoom.addEventListener('change', update);
}
function slice(context, sprite, group, index, x, y, width, height) {
  context.drawImage(sprite, index * group.width, 0, group.width, group.height, x, y, width, height);
}
async function still(group) {
  const canvas = canvasFor(group.width, group.height, group.label);
  bindZoom(canvas);
  slice(canvas.getContext('2d'), await load(group.file), group, 0, 0, 0, group.width, group.height);
  return figure(group.label.split(' · ')[1] + ' · ' + group.width + ' px', canvas);
}
let active;
reduce.addEventListener('change', () => active?.finish());
document.addEventListener('visibilitychange', () => { if (document.hidden) active?.pause(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') active?.finish(); });
async function sequence(group, parent) {
  const article = document.createElement('article');
  article.id = 'review-' + group.id;
  article.innerHTML = '<h3></h3><div class="controls"><button type="button">播放一次</button><button type="button">暫停</button><button type="button">跳到結束</button><label>逐格 <select></select></label><small></small></div><div class="gallery"></div>';
  article.querySelector('h3').textContent = group.label;
  article.querySelector('small').textContent = group.width + '×' + group.height + ' · ' + group.count + ' 格 · ' + group.ms.join(' / ') + ' ms';
  const [play, stop, skip] = article.querySelectorAll('button');
  const select = article.querySelector('select');
  const canvas = canvasFor(group.width, group.height, group.label);
  const context = canvas.getContext('2d');
  const gallery = article.querySelector('.gallery');
  gallery.append(masterFigure(group.master));
  let oldCanvas, oldSprite;
  if (group.previous) {
    const description = document.createElement('p');
    description.textContent = group.story;
    article.querySelector('h3').after(description);
    oldCanvas = canvasFor(group.width, group.height, 'B2-1 舊版 · ' + group.label);
    oldSprite = await load(group.previous.path);
    bindZoom(oldCanvas);
    const comparison = document.createElement('div');
    comparison.className = 'gallery comparison';
    const prior = group.revision === 'B2-1R2' ? 'B2-1R' : 'B2-1';
    comparison.append(figure(group.revision + ' 候選格', canvas), figure(prior + ' 舊版 · 比對用', oldCanvas));
    gallery.append(comparison);
    if (group.readabilitySummary) {
      const metrics = document.createElement('small');
      metrics.className = 'readability';
      metrics.textContent = group.readabilitySummary;
      gallery.after(metrics);
    }
  } else {
    gallery.append(figure('候選格', canvas));
  }
  bindZoom(canvas);
  for (let i = 0; i < group.count; i++) select.add(new Option(String(i + 1), String(i)));
  if (group.final === 'idle') select.add(new Option('待機', 'idle'));
  const sprite = await load(group.file);
  const fallback = group.final === 'idle' ? await load(idle) : null;
  let variant = 'desktop';
  let sceneCanvas, sceneContext;
  const sceneImages = new Map();
  let mirror;
  if (group.scene) {
    const bar = document.createElement('div');
    bar.className = 'controls';
    const layout = document.createElement('select');
    layout.setAttribute('aria-label', 'Home 場景尺寸');
    layout.add(new Option('Home 桌機', 'desktop'));
    layout.add(new Option('Home 手機', 'phone'));
    bar.append(layout);
    if (group.id === 'guide') {
      const label = document.createElement('label');
      mirror = document.createElement('input');
      mirror.type = 'checkbox';
      label.append(mirror, ' 左右鏡像');
      bar.append(label);
      mirror.onchange = () => render(select.value);
    }
    sceneCanvas = canvasFor(scenes.desktop.width, scenes.desktop.height, 'Home 場景 · ' + group.label);
    sceneContext = sceneCanvas.getContext('2d');
    layout.onchange = () => { variant = layout.value; render(select.value); };
    article.append(bar, figure('Home 原場景比例 · 與核准場景同一落地座標', sceneCanvas, 'scene'));
    for (const scene of Object.values(scenes)) {
      for (const layer of scene.layers.filter((item) => item.id !== 'idle')) sceneImages.set(layer.path, await load(layer.path));
    }
  }
  function render(value) {
    select.value = value;
    canvas.dataset.frame = value;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (value === 'idle') context.drawImage(fallback, 0, 0);
    else {
      context.save();
      if (mirror?.checked) { context.translate(group.width, 0); context.scale(-1, 1); }
      slice(context, sprite, group, Number(value), 0, 0, group.width, group.height);
      context.restore();
    }
    if (oldCanvas) {
      const oldContext = oldCanvas.getContext('2d');
      oldCanvas.dataset.frame = value;
      oldContext.clearRect(0, 0, oldCanvas.width, oldCanvas.height);
      oldContext.save();
      if (mirror?.checked) { oldContext.translate(group.width, 0); oldContext.scale(-1, 1); }
      slice(oldContext, oldSprite, group, Number(value), 0, 0, group.width, group.height);
      oldContext.restore();
    }
    if (!sceneContext) return;
    const scene = scenes[variant];
    const { scale: homeScale, ground } = homeRegistration[variant];
    sceneCanvas.width = scene.width;
    sceneCanvas.height = scene.height;
    sceneContext.imageSmoothingEnabled = false;
    for (const layer of scene.layers.filter((item) => item.id !== 'idle')) sceneContext.drawImage(sceneImages.get(layer.path), layer.x, layer.y);
    const size = Math.round(group.width * homeScale / (group.sceneScale ?? 1));
    const scale = group.sceneScale ? size / group.width : homeScale;
    const bounds = group.frameBounds[Number(value)];
    const left = Math.round(ground[0] - (group.anchorX ?? group.width / 2) * scale);
    const top = Math.round(ground[1] - (group.anchorY ?? bounds.y + bounds.height) * scale);
    sceneCanvas.dataset.spriteSize = String(size);
    sceneContext.save();
    if (mirror?.checked) { sceneContext.translate(2 * ground[0], 0); sceneContext.scale(-1, 1); }
    slice(sceneContext, sprite, group, Number(value), left, top, size, size);
    sceneContext.restore();
  }
  let timer, position = 0;
  const controller = {
    pause() {
      clearTimeout(timer);
      stop.disabled = true;
      if (active === controller) active = undefined;
    },
    finish() {
      controller.pause();
      render(String(group.final));
      status.textContent = group.label + ' · 結束';
    },
  };
  function advance() {
    if (position === group.count) return controller.finish();
    render(String(position));
    timer = setTimeout(advance, group.ms[position++]);
  }
  play.onclick = () => {
    active?.finish();
    if (reduce.checked) return controller.finish();
    active = controller;
    position = 0;
    stop.disabled = false;
    advance();
  };
  stop.onclick = controller.pause;
  skip.onclick = controller.finish;
  select.onchange = () => { controller.pause(); render(select.value); };
  stop.disabled = true;
  render(reduce.checked ? String(group.final) : '0');
  parent.append(article);
}
async function start() {
  const list = document.querySelector('.portrait-list');
  for (const group of groups.filter((item) => item.count > 1)) {
    await sequence(group, document.querySelector(group.id === 'wordmark' ? '#wordmark' : '#actions'));
  }
  const avatarGroups = groups.filter((group) => group.count === 1);
  for (let index = 0; index < avatarGroups.length; index += 2) {
    const [portrait, full] = avatarGroups.slice(index, index + 2);
    const article = document.createElement('article');
    const name = document.createElement('h3');
    name.textContent = portrait.label.split(' · ')[0];
    const gallery = document.createElement('div');
    gallery.className = 'gallery';
    gallery.append(masterFigure(portrait.master), await still(portrait), await still(full));
    article.append(name, gallery);
    list.append(article);
  }
  document.body.dataset.ready = 'true';
}
start().catch((error) => {
  status.classList.remove('sr');
  status.textContent = '預覽載入失敗 · ' + error.message;
  console.error(error);
});
