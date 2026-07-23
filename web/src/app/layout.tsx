import type { Metadata } from "next";
import { RegisterServiceWorker } from "@/shared/pwa/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "mimic",
  description: "mimic web application",
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
