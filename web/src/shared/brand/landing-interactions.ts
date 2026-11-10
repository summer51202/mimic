import { useEffect, useRef, useState } from "react";
import { batFlightMs, chestTimelines, playLandingFrames, type ChestFrame } from "./landing-motion";

export const propNames = {
  chest: "舊寶箱",
  carving: "岩壁上的刻痕",
  bats: "蝙蝠",
  torch: "火把",
  torchHigh: "火把",
  torchLow: "火把",
};

export type LandingProp = keyof typeof propNames;

const lines = {
  open: "那是普通的寶箱，不是我親戚喔！",
  close: "還是蓋好比較安心。",
  carving: "這是⋯⋯很久以前的我？原來早就有冒險者陪著我了。",
  bats: "噓——牠們白天在睡覺啦。",
  torch: "小心火！我可是木頭做的⋯⋯",
};

const motionQuery = "(prefers-reduced-motion: reduce)";
const reducedMotion = () => window.matchMedia(motionQuery).matches;

export function useLandingInteractions() {
  const [line, setLine] = useState<{ text: string; id: number }>();
  const [chest, setChest] = useState<ChestFrame>("closed");
  const [open, setOpen] = useState(false);
  const [chestPlaying, setChestPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<Partial<Record<LandingProp, boolean>>>({});
  const primary = useRef<{ finish: () => void; cancel: () => void } | null>(null);
  const pendingCarving = useRef(false);
  const secondaryTimers = useRef(new Map<LandingProp, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(motionQuery);
    const timers = secondaryTimers.current;
    function clearSecondary() {
      timers.forEach(clearTimeout);
      timers.clear();
    }
    function sync() {
      if (!query.matches) return;
      primary.current?.finish();
      clearSecondary();
      setFeedback({});
    }
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      primary.current?.cancel();
      clearSecondary();
    };
  }, []);

  function revealCarving() {
    setRevealed(true);
    if (reducedMotion()) return;

    const timer = setTimeout(finish, 400);
    function cancel() {
      clearTimeout(timer);
    }
    function finish() {
      cancel();
      primary.current = null;
    }
    primary.current = { finish, cancel };
  }

  function speak(text: string) {
    setLine((previous) => ({ text, id: (previous?.id ?? 0) + 1 }));
  }

  function activate(prop: LandingProp) {
    if (prop === "chest") {
      if (primary.current) return;
      const action = open ? "close" : "open";
      const target = open ? "closed" : "open";
      speak(lines[action]);
      if (reducedMotion()) {
        setChest(target);
        setOpen(!open);
        return;
      }
      const frames = chestTimelines[action];
      setChestPlaying(true);
      const cancel = playLandingFrames(frames.map(([, ms]) => ms), (index) => setChest(frames[index][0]), () => finish());
      function finish() {
        cancel();
        primary.current = null;
        setChest(target);
        setOpen(!open);
        setChestPlaying(false);
        if (pendingCarving.current) {
          pendingCarving.current = false;
          revealCarving();
        }
      }
      primary.current = { finish, cancel };
      return;
    }
    if (prop === "carving") {
      speak(lines.carving);
      if (revealed) return;
      if (primary.current) pendingCarving.current = true;
      else revealCarving();
      return;
    }
    const timers = secondaryTimers.current;
    if (prop === "bats" && timers.has(prop)) return;
    speak(prop === "bats" ? lines.bats : lines.torch);
    if (reducedMotion() || timers.has(prop)) return;
    setFeedback((active) => ({ ...active, [prop]: true }));
    timers.set(prop, setTimeout(() => {
      timers.delete(prop);
      setFeedback((active) => ({ ...active, [prop]: false }));
    }, prop === "bats" ? batFlightMs : 600));
  }

  return { activate, chest, open, chestPlaying, revealed, feedback, line };
}
