import "./globals.css";

import type { Metadata } from "next";
import { Noto_Sans_Myanmar } from "next/font/google";
import { ReactNode } from "react";

const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  variable: "--font-myanmar",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Undercover",
  description: "Realtime social deduction party game"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={notoSansMyanmar.variable}>{children}</body>
    </html>
  );
}
