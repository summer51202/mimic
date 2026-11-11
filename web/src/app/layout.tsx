import type { Metadata } from "next";
import { RegisterServiceWorker } from "@/shared/pwa/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "mimic",
  description: "mimic web application",
  icons: {
    icon: [16, 32].map((size) => ({
      url: `/pixel-ui/v1/icons/install/favicon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
