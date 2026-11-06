export const maskableCalibration = {
  decision: "approved",
  strategy: "dedicated-maskable-master",
  canonicalMasterId: "maskable-512",
  resizeKernel: "nearest",
  backgroundRgb: [12, 16, 37],
  safeZone: { shape: "circle", diameterPercent: 80 },
  reviewOnly: true,
  outputs: [
    {
      id: "maskable-512",
      filename: "maskable-512.png",
      size: 512,
      purpose: "maskable-master",
      consumer: "Canonical maskable review master",
    },
    {
      id: "maskable-192",
      filename: "maskable-192.png",
      size: 192,
      purpose: "maskable",
      consumer: "Installed-PWA maskable evidence",
    },
  ],
};
