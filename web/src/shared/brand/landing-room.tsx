import { Fragment } from "react";
import type { CSSProperties } from "react";
import { landingAssetRoot, landingScene, sceneLayers } from "./landing-scene";
import { batFlightMs, landingMotion } from "./landing-motion";
import { propNames, type LandingProp, type useLandingInteractions } from "./landing-interactions";
import styles from "./landing-stage.module.css";

type Variant = keyof typeof landingScene;

type Box = { x: number; y: number; width: number; height: number };

function boxStyle(box: Box) {
  return {
    "--layer-x": box.x,
    "--layer-y": box.y,
    "--layer-width": box.width,
    "--layer-height": box.height,
  } as CSSProperties;
}

function isProp(id: string): id is LandingProp {
  return Object.hasOwn(propNames, id);
}

// Flame centers within the approved torch artwork, in logical pixels.
const flameCenters = {
  torch: [15.3, 14],
  torchHigh: [19.25, 17.5],
  torchLow: [19.5, 16.2],
} as const;

export function LandingRoom({ name, interactions }: {
  name: Variant;
  interactions: ReturnType<typeof useLandingInteractions>;
}) {
  const scene = landingScene[name];
  const layers = sceneLayers(name);
  const phone = name === "phone";
  const { activate, chest, open, chestPlaying, revealed, feedback } = interactions;
  const targets = layers.filter(({ id }) => isProp(id) || id === "sign")
    .sort((left, right) => left.x - right.x);

  return (
    <div
      className={styles.viewport}
      data-landing-viewport={name}
      role={phone ? "region" : undefined}
      aria-label={phone ? "洞窟場景，可左右捲動" : undefined}
      tabIndex={phone ? 0 : undefined}
      style={{
        "--stage-width": scene.width,
        "--stage-height": scene.height,
        "--viewport-width": scene.viewportWidth,
      } as CSSProperties}
    >
      <div className={styles.room}>
        <div data-landing-scene={name} className={styles.scene}>
          {layers.map((layer) => {
            const flame = flameCenters[layer.id as keyof typeof flameCenters];
            const active = isProp(layer.id) && feedback[layer.id];
            const chestAsset = layer.id === "chest" && "variants" in layer
              ? layer.variants?.[chest as keyof typeof layer.variants]?.asset_id
              : undefined;
            return (
              <Fragment key={layer.id}>
                {flame && active && <div aria-hidden="true" className={styles.glow} data-torch-glow={layer.id}
                  style={{
                    ...boxStyle(layer),
                    "--flame-x": flame[0],
                    "--flame-y": flame[1],
                    zIndex: layer.depth,
                  } as CSSProperties} />}
                <div
                  data-layer={layer.id}
                  data-chest-frame={layer.id === "chest" ? chest : undefined}
                  data-revealed={layer.id === "carving" ? revealed : undefined}
                  data-flight={layer.id === "bats" && active ? "" : undefined}
                  className={styles.layer}
                  aria-hidden="true"
                  style={{
                    ...boxStyle(layer),
                    "--sheet-frames": layer.id === "wordmark" ? landingMotion[name].title.frames : 1,
                    ...(layer.id === "bats" && {
                      "--bat-flight-name": `landing-bats-${name}`,
                      "--bat-flight-duration": `${batFlightMs}ms`,
                    }),
                    backgroundImage: chestAsset && chest !== "closed" ? `url(${landingAssetRoot}/${chestAsset})` : undefined,
                    zIndex: layer.depth,
                  } as CSSProperties}
                >
                  {layer.id === "carving" && <><div className={styles.carvingHidden} data-carving-hidden /><div className={styles.revealed} data-carving-revealed /></>}
                  {layer.id === "fire" && <div className={styles.campfire} data-campfire-sheet />}
                </div>
              </Fragment>
            );
          })}
          {targets.map((layer) => {
            const { id } = layer;
            // The high torch overlaps 24 logical px of transparent chest padding.
            // Keep a further 6 logical px between the two focus outlines.
            const hit = name === "desktop" && id === "chest"
              ? { ...layer, y: layer.y + 30, height: layer.height - 30 }
              : layer;
            const props = {
              className: styles.target,
              style: boxStyle(hit),
              "data-landing-target": id,
            };
            if (!isProp(id)) return <a key={id} {...props} href="#features" aria-label="功能" />;
            return (
              <button key={id} {...props} type="button" aria-label={propNames[id]}
                aria-pressed={id === "chest" ? open : undefined}
                data-chest-playing={id === "chest" && chestPlaying ? "" : undefined}
                onClick={() => activate(id)}
              />
            );
          })}
        </div>
        <span aria-hidden="true" data-sign-label className={styles.signLabel} style={boxStyle(scene.signLabel)}><span>功能</span></span>
        {phone && [0, 1, 2].map((segment) => (
          <span key={segment} aria-hidden="true" data-snap={segment} className={styles.snap} />
        ))}
      </div>
    </div>
  );
}
