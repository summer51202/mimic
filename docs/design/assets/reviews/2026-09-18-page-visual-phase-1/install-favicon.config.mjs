export const installFaviconCalibration = {
  decision: "approved",
  strategy: "single-master-resize",
  canonicalMasterId: "icon-512",
  resizeKernel: "nearest",
  phaseException:
    "Complete Mimiku and heart coin remain at every size without optical redraws.",
  outputs: [
    {
      id: "icon-512",
      filename: "icon-512.png",
      size: 512,
      purpose: "install-master",
      consumer: "Canonical install review master",
    },
    {
      id: "icon-192",
      filename: "icon-192.png",
      size: 192,
      purpose: "install",
      consumer: "PWA install and launcher evidence",
    },
    {
      id: "icon-48",
      filename: "icon-48.png",
      size: 48,
      purpose: "optical-evidence",
      consumer: "Intermediate optical evidence only",
    },
    {
      id: "favicon-32",
      filename: "favicon-32.png",
      size: 32,
      purpose: "favicon",
      consumer: "High-density browser favicon evidence",
    },
    {
      id: "favicon-16",
      filename: "favicon-16.png",
      size: 16,
      purpose: "favicon",
      consumer: "Smallest browser favicon evidence",
    },
  ],
};
