import Link from "next/link";
import { PixelDialogue } from "@/shared/ui/pixel-dialogue";
import { brand } from "./brand";
import { LandingStage } from "./landing-stage";
import {
  landingAssetRoot,
  landingDesktopMedia,
  landingPhoneMedia,
  landingScene,
} from "./landing-scene";
import styles from "./landing-stage.module.css";
import type { CSSProperties } from "react";

const variants = [
  { name: "desktop", media: landingDesktopMedia },
  { name: "phone", media: landingPhoneMedia },
] as const;

function sceneLayers(name: keyof typeof landingScene) {
  const { architecture, width, height, layers } = landingScene[name];
  return [
    { ...architecture, id: "architecture", x: 0, y: 0, width, height, depth: -101 },
    ...layers,
  ];
}

// Gate the actual background-image declaration so the inactive scene never fetches PNGs.
const backgroundRules = variants.map(({ name, media }) =>
  `@media ${media} {${sceneLayers(name).map(({ id, asset_id }) =>
    `[data-landing-scene="${name}"] [data-layer="${id}"] {background-image:url("${landingAssetRoot}/${asset_id}")}`,
  ).join("")}}`,
).join("");

export function Hero() {
  return (
    <section className={styles.hero} data-landing-hero aria-labelledby="public-hero-title">
      <h1 id="public-hero-title" className={styles.visuallyHidden}>{brand.productName}</h1>
      <style>{backgroundRules}</style>
      {variants.map(({ name, media }) => (
        <link
          key={name}
          rel="preload"
          as="image"
          media={media}
          href={`${landingAssetRoot}/${landingScene[name].architecture.asset_id}`}
        />
      ))}
      <LandingStage dialogue={
        <PixelDialogue
          speaker={`${brand.characterNameZh} / ${brand.characterNameEn}`}
          actions={<Link className={styles.cta} href="/register">開始冒險</Link>}
        >
          <p>{brand.tagline}</p>
        </PixelDialogue>
      }>
        {variants.map(({ name }) => {
          const scene = landingScene[name];
          const sceneStyle = {
            "--stage-width": scene.width,
            "--stage-height": scene.height,
            "--viewport-width": scene.viewportWidth,
            "--initial-x": scene.initialViewportX,
          } as CSSProperties;
          return (
            <div
              key={name}
              className={styles.viewport}
              data-landing-viewport={name}
              role={name === "phone" ? "region" : undefined}
              aria-label={name === "phone" ? "洞窟場景，可左右捲動" : undefined}
              tabIndex={name === "phone" ? 0 : undefined}
              style={sceneStyle}
            >
              <div data-landing-scene={name} className={styles.scene}>
                {sceneLayers(name).map((layer) => (
                  <div
                    key={layer.id}
                    data-layer={layer.id}
                    className={styles.layer}
                    aria-hidden="true"
                    style={{
                      "--layer-x": layer.x,
                      "--layer-y": layer.y,
                      "--layer-width": layer.width,
                      "--layer-height": layer.height,
                      // The approved title sheet contains three horizontal frames.
                      "--sheet-frames": layer.id === "wordmark" ? 3 : 1,
                      zIndex: layer.depth,
                      opacity: "opacity" in layer ? layer.opacity : undefined,
                    } as CSSProperties}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </LandingStage>
    </section>
  );
}
