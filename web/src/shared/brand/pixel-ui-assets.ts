export const pixelUiFiles = {
  characters: {
    idle: "/pixel-ui/characters/mimiku-idle.png",
    happy: "/pixel-ui/characters/mimiku-happy.png",
    thinking: "/pixel-ui/characters/mimiku-thinking.png",
    reminder: "/pixel-ui/characters/mimiku-reminder.png",
    serious: "/pixel-ui/characters/mimiku-serious.png",
    lost: "/pixel-ui/characters/mimiku-lost.png",
  },
  avatars: [
    "/pixel-ui/avatars/avatar-01.png",
    "/pixel-ui/avatars/avatar-02.png",
    "/pixel-ui/avatars/avatar-03.png",
    "/pixel-ui/avatars/avatar-04.png",
  ],
  deferred: {
    scenes: {
      treasuryMobile: "/pixel-ui/scenes/treasury-mobile.png",
      treasuryDesktop: "/pixel-ui/scenes/treasury-desktop.png",
    },
    frame: "/pixel-ui/frames/frames-ui.png",
  },
} as const;

export const pixelUiRoles = {
  dashboard: pixelUiFiles.characters.idle,
  emptyGroup: pixelUiFiles.characters.thinking,
  emptyFund: pixelUiFiles.characters.lost,
  invitation: pixelUiFiles.characters.reminder,
  success: pixelUiFiles.characters.happy,
  blockingError: pixelUiFiles.characters.serious,
} as const;
