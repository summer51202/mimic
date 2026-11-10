import approvedLayout from "../../../../docs/design/assets/approved/page-visual-v1/scenes/landing/layout.json";

export const landingScene = approvedLayout;
export const landingDesktopMedia = "(min-width: 760px)";
export const landingPhoneMedia = "(width < 760px)";
export const landingAssetRoot = "/pixel-ui/v1";

export function sceneLayers(name: keyof typeof landingScene) {
  const { architecture, width, height, layers } = landingScene[name];
  return [
    { ...architecture, id: "architecture", x: 0, y: 0, width, height, depth: -101 },
    ...layers,
  ];
}
