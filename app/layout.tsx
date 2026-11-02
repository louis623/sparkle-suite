import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import ClientErrorReporter from "@/components/client-error-reporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const prelaunchDisplay = Playfair_Display({
  variable: "--font-prelaunch-display",
  subsets: ["latin"],
});

const prelaunchSans = DM_Sans({
  variable: "--font-prelaunch-sans",
  subsets: ["latin"],
});

const amethystDisplay = Playfair_Display({
  variable: "--font-amethyst-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.yoursparklesuite.com"),
  applicationName: "Sparkle Suite",
  title: {
    default: "Sparkle Suite",
    template: "%s | Sparkle Suite",
  },
  icons: {
    icon: [
      {
        url: "/icon",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    apple: [
      {
        url: "/apple-icon",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${prelaunchDisplay.variable} ${prelaunchSans.variable} ${amethystDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<ClientErrorReporter /></body>
    </html>
  );
}
