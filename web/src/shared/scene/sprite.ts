export function playSceneFrames(
  durations: readonly number[],
  draw: (index: number) => void,
  onEnd?: () => void,
) {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const origin = performance.now();
  let request: number;
  let previous = 0;
  draw(0);

  function tick(now: number) {
    let elapsed = now - origin;
    if (onEnd && elapsed >= total) {
      onEnd();
      return;
    }
    elapsed %= total;
    let index = 0;
    while (index < durations.length - 1 && elapsed >= durations[index]) {
      elapsed -= durations[index++];
    }
    if (previous !== index) {
      previous = index;
      draw(index);
    }
    request = requestAnimationFrame(tick);
  }

  request = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(request);
}

export function drawFrame(layer: HTMLElement, index: number) {
  layer.style.setProperty("--frame", String(index));
}

export function loadSheet(layer: HTMLElement, url: string, onLoad?: () => void) {
  const image = new Image();
  image.onload = () => {
    layer.dataset.loaded = "";
    onLoad?.();
  };
  image.src = url;
  return () => { image.onload = null; };
}
