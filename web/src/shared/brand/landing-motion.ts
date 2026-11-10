import timing from "../../../../docs/design/assets/approved/page-visual-v1/motion/motion-timing.json";

export const landingMotion = {
  desktop: { title: timing.variants.desktop.title, fire: timing.variants.desktop.fire },
  phone: { title: timing.variants.phone.title, fire: timing.variants.phone.fire },
  titleInterval: timing.playback.title.interval_ms,
};

export const chestTimelines = {
  open: [
    ["latch-release", 100], ["unlatched", 90], ["cracked", 150],
    ["half-open", 90], ["opening-wide", 70], ["near-open", 110], ["open", 140],
  ],
  close: [
    ["near-open", 120], ["opening-wide", 100], ["half-open", 80],
    ["cracked", 70], ["unlatched", 90], ["latch-release", 80], ["closed", 120],
  ],
} as const;

export type ChestFrame = (typeof chestTimelines)[keyof typeof chestTimelines][number][0];

export const batFlightMs = 2500;

export function batFlightKeyframes(bottom: number) {
  const distance = Math.ceil(bottom) + 1;
  const steps = Math.ceil(distance / 4);
  return Array.from({ length: steps + 1 }, (_, step) => {
    const y = Math.round(step * distance / steps);
    const sway = step === 0 ? 0 : step % 2 === 1 ? 1 : -1;
    const x = Math.round(y / 2) + sway;
    // 0–20% outbound, 20–80% offscreen, 80–100% along the same steps in reverse.
    const offset = step * 20 / steps;
    return `${offset}%,${100 - offset}%{transform:translate(${x}px,${-y}px)}`;
  }).join("");
}

export function playLandingFrames(
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
