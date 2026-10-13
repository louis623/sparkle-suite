import type { Metadata } from "next";
import { FinderLearnPage } from "@/components/learn/FinderLearnPage";
import { finderLearnContent } from "@/lib/sparkle-finder/learn-page-content";

export const metadata: Metadata = {
  title: {
    absolute: finderLearnContent.seoTitle,
  },
  description: finderLearnContent.seoDescription,
  alternates: {
    canonical: "/learn",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: finderLearnContent.seoTitle,
    description: finderLearnContent.seoDescription,
    url: "/learn",
    siteName: "Sparkle Finder",
    type: "website",
  },
};

export default function LearnPage() {
  return <FinderLearnPage />;
}
