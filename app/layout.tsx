import type { Metadata, Viewport } from "next";
import { lora } from '@/app/fonts';
import {
  APP_DESCRIPTION,
  APP_NAME,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  getManifestHref,
} from "@/lib/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: getManifestHref(),
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lora.className} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
