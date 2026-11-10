import { brand } from "./brand";
import { LandingStage } from "./landing-stage";
import { landingAssetRoot, landingDesktopMedia, landingPhoneMedia, landingScene, sceneLayers } from "./landing-scene";
import { batFlightKeyframes, chestTimelines, landingMotion } from "./landing-motion";
import styles from "./landing-stage.module.css";

const variants = [
  { name: "desktop", media: landingDesktopMedia },
  { name: "phone", media: landingPhoneMedia },
] as const;

// Gate requests to the active scene. The campfire sheet only overlays the static
// layer once its image has loaded, so a failed request leaves the static fire.
const backgroundRules = variants.map(({ name, media }) => {
  const root = `[data-landing-scene="${name}"]`;
  const rules = sceneLayers(name).map(({ id, asset_id }) =>
    `${root} [data-layer="${id}"]${id === "carving" ? " [data-carving-hidden]" : ""} {background-image:url("${landingAssetRoot}/${asset_id}")}`,
  );
  rules.push(`${root} [data-campfire-sheet][data-loaded] {
    background-image:url("${landingAssetRoot}/${landingMotion[name].fire.asset_id}");
    --sheet-frames:${landingMotion[name].fire.frames};
  }`);
  rules.push(`${root} [data-carving-revealed] {
    background-image:url("${landingAssetRoot}/props/landing/wall-carving-revealed-${name}.png");
  }`);
  const bats = landingScene[name].layers.find(({ id }) => id === "bats")!;
  rules.push(`@keyframes landing-bats-${name}{${batFlightKeyframes(bats.y + bats.height)}}`);
  return `@media ${media} {${rules.join("")}}`;
}).join("");

export function Hero({ authenticated }: { authenticated: boolean }) {
  return (
    <section className={styles.hero} data-landing-hero aria-labelledby="public-hero-title">
      <h1 id="public-hero-title" className={styles.visuallyHidden}>{brand.productName}</h1>
      <style>{backgroundRules}</style>
      {variants.map(({ name, media }) => (
        <link key={name} rel="preload" as="image" media={media}
          href={`${landingAssetRoot}/${landingScene[name].architecture.asset_id}`}
        />
      ))}
      {variants.flatMap(({ name, media }) => chestTimelines.open.map(([frame]) => (
        <link key={`${name}-${frame}`} rel="preload" as="image" media={media} fetchPriority="low"
          href={`${landingAssetRoot}/props/landing/chest-${frame}-${name}.png`}
        />
      )))}
      <LandingStage authenticated={authenticated} />
    </section>
  );
}
