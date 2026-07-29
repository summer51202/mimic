export const pixelUiAssets = {
  mimiku: {
    dashboard: "/pixel-ui/mimiku-dashboard.png",
    emptyGroup: "/pixel-ui/mimiku-empty-group.png",
    emptyFund: "/pixel-ui/mimiku-empty-fund.png",
    invite: "/pixel-ui/mimiku-invite.png",
    success: "/pixel-ui/mimiku-success.png",
    serious: "/pixel-ui/mimiku-serious.png",
  },
  scenes: {
    treasuryMobile: "/pixel-ui/treasury-mobile.png",
    treasuryDesktop: "/pixel-ui/treasury-desktop.png",
  },
  avatars: [
    "/pixel-ui/avatar-01.png",
    "/pixel-ui/avatar-02.png",
    "/pixel-ui/avatar-03.png",
    "/pixel-ui/avatar-04.png",
  ],
  sheets: {
    icons: "/pixel-ui/icons-ui.png",
    frames: "/pixel-ui/frames-ui.png",
  },
} as const;

export const pixelUiAssetPolicy = {
  runtimeFirstScreen: [
    pixelUiAssets.mimiku.dashboard,
    pixelUiAssets.scenes.treasuryMobile,
    pixelUiAssets.scenes.treasuryDesktop,
    ...pixelUiAssets.avatars,
  ],
  sourceSheets: [pixelUiAssets.sheets.icons, pixelUiAssets.sheets.frames],
} as const;
