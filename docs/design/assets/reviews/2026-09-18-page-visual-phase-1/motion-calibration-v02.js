(() => {
  const data = window.motionCalibration;
  const byId = (id) => document.getElementById(id);
  const world = document.querySelector(".world");
  const mobile = matchMedia("(max-width: 767px)");
  const systemReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Map();
  const layers = new Map();
  const opened = { chest: false, carving: false };
  const lines = ["歡迎來到洞窟。篝火旁有個位置，先坐下休息吧。", "準備好了，就進入秘密基地。"];
  let scene = "landing";
  let primary;
  let pose = "idle";
  let celebrated = false;
  let paused = false;
  let lastTick;
  let blinkWait;
  let hovered = false;
  let titleVisible = false;
  let line = 0;
  let letters = 0;
  let typing = false;
  let zoom = 1;

  const still = () => document.hidden || systemReduce.matches || byId("reduce").checked;
  const sequence = (id) => data.sequences[id][mobile.matches ? "phone" : "desktop"];
  const idleBlocked = () => primary || pose !== "idle" || active.has("chest") || active.has("carving");
  function paint(id, frame, index) {
    const layer = layers.get(id === "ledger" || id === "celebration" ? "idle" : id);
    if (!layer) return;
    layer.src = frame.path;
    layer.style.width = frame.width + "px";
    layer.style.height = frame.height + "px";
    if (frame.groundAligned) {
      layer.style.left = Number(layer.dataset.groundX) - Math.floor(frame.width / 2) + "px";
      layer.style.top = Number(layer.dataset.groundY) - frame.height + "px";
    }
    world.dispatchEvent(new CustomEvent("motion-frame", { detail: { id, index } }));
  }

  function finish(id) {
    const run = active.get(id);
    if (!run) return;
    active.delete(id);
    if (primary === id) primary = undefined;
    run.finish();
  }

  function play(id, frames, { loop = false, onFinish = () => {} } = {}) {
    const run = { frames, loop, index: 0, elapsed: 0, finish: onFinish };
    active.set(id, run);
    paint(id, frames[0], 0);
  }

  function resetBlink() {
    blinkWait = 8000 + Math.random() * 7000;
  }

  function blink() {
    if (scene !== "landing" || still() || paused || active.has("title")) return;
    const frames = sequence("title");
    play("title", frames, { onFinish: () => paint("title", frames[0], 0) });
    resetBlink();
  }

  function syncLoops() {
    for (const id of ["idle", "fire"]) {
      if (!layers.has(id) || (id === "idle" && idleBlocked())) {
        active.delete(id);
        continue;
      }
      if (active.has(id)) continue;
      const frames = sequence(id);
      if (still()) {
        if (!layers.get(id).src.endsWith(frames[0].path)) paint(id, frames[0], 0);
      } else {
        play(id, frames, { loop: true });
      }
    }
  }

  function toggleProp(id) {
    opened[id] = !opened[id];
    byId(id).setAttribute("aria-pressed", String(opened[id]));
    const prop = sequence(id);
    const frames = opened[id] ? prop.open : prop.close;
    const showResult = () => paint(id, frames.at(-1), frames.length - 1);
    active.delete(id);
    active.delete("idle");
    if (still() || paused) showResult();
    else play(id, frames, { onFinish: showResult });
  }

  function startPrimary(id) {
    if (scene !== "home" || (id === "celebration" && celebrated)) return;
    if (id === "celebration") celebrated = true;
    if (primary) finish(primary);
    active.delete("idle");
    pose = id;
    const frames = sequence(id);
    const showResult = () => {
      paint(id, frames.at(-1), frames.length - 1);
      byId("result").textContent = id === "ledger" ? "已記帳" : "冒險完成";
      if (id === "ledger" && !still() && !paused) pose = "idle";
    };
    if (still() || paused) showResult();
    else {
      primary = id;
      play(id, frames, { onFinish: showResult });
    }
  }

  function skip() {
    if (primary === "celebration") finish(primary);
  }

  function displayLine(announce = true) {
    letters = still() || paused ? lines[line].length : 0;
    typing = letters === 0;
    byId("dialogue").firstElementChild.textContent = lines[line].slice(0, letters);
    if (announce) byId("sentence").textContent = lines[line];
  }

  function completeLine() {
    if (!typing) return;
    letters = lines[line].length;
    typing = false;
    byId("dialogue").firstElementChild.textContent = lines[line];
  }

  function settle() {
    for (const id of [...active.keys()]) finish(id);
    completeLine();
  }

  const titleObserver = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    titleVisible = entry.isIntersecting;
    if (!titleVisible) {
      finish("title");
      resetBlink();
    }
  });
  const fitScene = () => {
    const viewport = byId("scene");
    world.style.zoom = scene === "landing" && mobile.matches
      ? "1"
      : String(Math.min(1, viewport.clientWidth / Number(world.dataset.logicalWidth)));
  };
  new ResizeObserver(fitScene).observe(byId("scene"));

  function render() {
    const layout = data.scenes[scene][mobile.matches ? "phone" : "desktop"];
    active.clear();
    primary = undefined;
    hovered = false;
    titleVisible = false;
    titleObserver.disconnect();
    layers.clear();
    world.replaceChildren();
    world.dataset.logicalWidth = layout.width;
    world.style.setProperty("--scene-width", layout.width + "px");
    world.style.setProperty("--scene-height", layout.height + "px");
    for (const layer of layout.layers) {
      const img = document.createElement("img");
      img.className = "layer";
      img.alt = "";
      img.src = layer.path;
      Object.assign(img.style, { left: layer.x + "px", top: layer.y + "px", width: layer.width + "px", height: layer.height + "px" });
      if (layer.id === "idle") {
        img.dataset.groundX = layer.x + Math.floor(layer.width / 2);
        img.dataset.groundY = layer.y + layer.height;
      }
      layers.set(layer.id, img);
      world.append(img);
      if (layer.id === "title") titleObserver.observe(img);
      if (["title", "chest", "carving"].includes(layer.id)) {
        const button = document.createElement("button");
        button.className = "hotspot";
        button.dataset.prop = layer.id;
        button.setAttribute("aria-label", { title: "MIMIC 標題眨眼", chest: "開關寶箱", carving: "顯示或收起壁畫" }[layer.id]);
        Object.assign(button.style, { left: layer.x + "px", top: layer.y + "px", width: layer.width + "px", height: Math.max(44, layer.height) + "px" });
        button.onclick = () => layer.id === "title" ? blink() : toggleProp(layer.id);
        if (layer.id === "title") {
          button.onpointerenter = (event) => {
            if (!hovered && event.pointerType === "mouse") blink();
            hovered = true;
          };
          button.onpointerleave = () => { hovered = false; };
        }
        world.append(button);
      }
    }
    fitScene();
    byId("scene").scrollLeft = layout.initialX ?? 0;
    for (const id of ["chest", "carving"]) {
      if (scene !== "landing") continue;
      const prop = sequence(id);
      const frames = opened[id] ? prop.open : prop.close;
      paint(id, frames.at(-1), frames.length - 1);
    }
    if (scene === "home" && pose !== "idle") {
      const frames = sequence(pose);
      paint(pose, frames.at(-1), frames.length - 1);
    }
    byId("landing-controls").hidden = scene !== "landing";
    byId("dialogue-panel").hidden = scene !== "landing";
    byId("home-controls").hidden = scene !== "home";
    document.querySelectorAll("[data-scene]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.scene === scene));
    });
    resetBlink();
    syncLoops();
  }

  function changeScene(next) {
    if (scene === next) return;
    settle();
    scene = next;
    render();
    if (scene === "landing" && !byId("sentence").textContent) displayLine();
  }

  function tick(time) {
    const elapsed = Math.max(0, (time - (lastTick ?? time)) * Number(byId("speed").value));
    lastTick = time;
    requestAnimationFrame(tick);
    if (paused || still()) return;
    syncLoops();
    for (const [id, run] of active) {
      run.elapsed += elapsed;
      while (run.elapsed >= run.frames[run.index].ms) {
        run.elapsed -= run.frames[run.index].ms;
        if (run.index === run.frames.length - 1 && !run.loop) {
          finish(id);
          break;
        }
        run.index = (run.index + 1) % run.frames.length;
        paint(id, run.frames[run.index], run.index);
      }
    }
    if (scene === "landing") {
      if (titleVisible) {
        blinkWait -= elapsed;
        if (blinkWait <= 0) blink();
      }
      if (typing) {
        letters += elapsed * .035;
        byId("dialogue").firstElementChild.textContent = lines[line].slice(0, Math.floor(letters));
        if (letters >= lines[line].length) typing = false;
      }
    }
  }

  function updateStrips() {
    const container = byId("strips");
    container.replaceChildren();
    for (const [id, family] of Object.entries(data.sequences)) {
      for (const variant of ["desktop", "phone"]) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = family.label + " · " + (variant === "phone" ? "手機" : "桌機");
        const strip = document.createElement("div");
        strip.className = "strip";
        strip.tabIndex = 0;
        const frames = Array.isArray(family[variant]) ? family[variant] : family[variant].open;
        const master = family[variant + "Master"] ?? frames[0];
        [master, ...frames].forEach((frame, index) => {
          const fig = document.createElement("figure");
          const img = new Image(frame.width * zoom, frame.height * zoom);
          img.loading = "lazy";
          img.src = frame.path;
          img.alt = index ? "第 " + index + " 格" : "核准 master";
          const caption = document.createElement("figcaption");
          caption.textContent = index ? index + " · " + Math.round(frame.ms) + " ms" : "核准 master";
          fig.append(img, caption);
          strip.append(fig);
        });
        details.append(summary, strip);
        container.append(details);
      }
    }
  }

  document.querySelectorAll("[data-scene]").forEach((button) => {
    button.onclick = () => changeScene(button.dataset.scene);
  });
  byId("cta").onclick = () => changeScene("home");
  byId("blink").onclick = blink;
  byId("chest").onclick = () => toggleProp("chest");
  byId("carving").onclick = () => toggleProp("carving");
  byId("ledger").onclick = () => startPrimary("ledger");
  byId("celebration").onclick = () => startPrimary("celebration");
  byId("both").onclick = () => { startPrimary("ledger"); startPrimary("celebration"); };
  byId("skip").onclick = skip;
  byId("reset").onclick = () => {
    if (primary) finish(primary);
    pose = "idle";
    celebrated = false;
    byId("result").textContent = "等待操作";
    syncLoops();
  };
  byId("dialogue").onclick = () => {
    if (typing) completeLine();
    else if (line < lines.length - 1) {
      line += 1;
      displayLine();
    }
  };
  byId("pause").onclick = () => {
    paused = !paused;
    if (!paused && pose === "ledger" && !primary && !still()) pose = "idle";
    byId("pause").setAttribute("aria-pressed", String(paused));
    byId("pause").textContent = paused ? "繼續播放" : "暫停全部";
  };
  byId("scale").onclick = () => {
    zoom = zoom === 1 ? 4 : 1;
    byId("scale").setAttribute("aria-pressed", String(zoom === 4));
    byId("scale").textContent = zoom === 4 ? "還原 1×" : "放大至 4×";
    const strips = [...document.querySelectorAll("details")].map((item) => item.open);
    updateStrips();
    document.querySelectorAll("details").forEach((item, index) => { item.open = strips[index]; });
  };
  function policyChanged() {
    lastTick = undefined;
    if (still()) settle();
    else if (!paused && pose === "ledger" && !primary) pose = "idle";
    syncLoops();
  }
  byId("reduce").onchange = policyChanged;
  systemReduce.addEventListener("change", policyChanged);
  document.addEventListener("visibilitychange", policyChanged);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") skip(); });
  mobile.addEventListener("change", () => { settle(); render(); });
  render();
  displayLine();
  updateStrips();
  requestAnimationFrame(tick);
})();
