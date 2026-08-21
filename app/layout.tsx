import type { Metadata } from "next";
import { lora } from '@/app/fonts';
import "./globals.css";

export const metadata: Metadata = {
  title: "TableRunner",
  description: "A game played between a table-top board game and an app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lora.className} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
