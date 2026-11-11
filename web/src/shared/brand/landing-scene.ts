import { layersWithArchitecture } from "../scene/geometry";
import approvedLayout from "../../../../docs/design/assets/approved/page-visual-v1/scenes/landing/layout.json";

export const landingScene = approvedLayout;
export const landingDesktopMedia = "(min-width: 760px)";
export const landingPhoneMedia = "(width < 760px)";
export { sceneAssetRoot as landingAssetRoot } from "../scene/geometry";

export function sceneLayers(name: keyof typeof landingScene) {
  return layersWithArchitecture<(typeof landingScene)[keyof typeof landingScene]["layers"][number]>(landingScene[name]);
}
