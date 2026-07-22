import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
