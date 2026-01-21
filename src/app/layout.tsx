import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Budget Tool - Negros Power",
  description: "Budget Submission & Approval Tool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2F5E3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/satoshi/Fonts/WEB/fonts/Satoshi-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for Supabase */}
        <link
          rel="dns-prefetch"
          href="https://onuekzzpmuiylethhkuk.supabase.co"
        />
        <link
          rel="preconnect"
          href="https://onuekzzpmuiylethhkuk.supabase.co"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
