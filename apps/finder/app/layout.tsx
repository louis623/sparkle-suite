import type { Metadata } from "next";
import { DM_Sans, Inter, Italiana, Playfair_Display } from "next/font/google";
import { loadSparkleFinderAppearance, toSparkleFinderThemeStyle } from "@/lib/sparkle-finder/appearance";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const italiana = Italiana({
  subsets: ["latin"],
  variable: "--font-italiana",
  weight: "400",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sparkle Finder",
  description: "Sparkle Finder by Sparkle Suite",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearance = await loadSparkleFinderAppearance();

  return (
    <html
      className={`${playfair.variable} ${dmSans.variable} ${italiana.variable} ${inter.variable}`}
      data-finder-theme={appearance.preset}
      lang="en"
    >
      <body style={toSparkleFinderThemeStyle(appearance)}>{children}</body>
    </html>
  );
}
