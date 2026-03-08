import type { Metadata } from "next";

import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans, Outfit } from "next/font/google";

import "../index.css";
import Header from "@/components/blocks/Header";
import Providers from "@/components/providers/providers";
import { Analytics } from "@vercel/analytics/next"
import Footer from "@/components/blocks/Footer";
import MobileBottomNav from "@/components/blocks/MobileBottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://sift.v19.tech/";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sift | Recall What You've Learned | Active Recall Engine | AI Courses and Quizzes",
    template: "%s | Sift",
  },
  description:
    "Sift is an active recall platform that turns your content into quizzes, flashcards, learning paths, and continuous courses so you can keep learning deeper.",
  applicationName: "Sift",
  keywords: [
    "active recall",
    "flashcards",
    "spaced repetition",
    "quiz generator",
    "learning paths",
    "continuous courses",
    "study app",
    "knowledge retention",
  ],
  creator: "Sift",
  publisher: "Sift",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Sift",
    description:
      "Sift is an active recall platform that turns your content into quizzes, flashcards, learning paths, and continuous courses so you can keep learning deeper.",
    siteName: "Sift",
    images: [
      {
        url: "/banner.png",
        width: 512,
        height: 512,
        alt: "Sift",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sift",
    description:
      "Sift is an active recall platform that turns your content into quizzes, flashcards, learning paths, and continuous courses so you can keep learning deeper.",
    images: ["/banner.png"],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${geistMono.variable} ${jakarta.variable} ${outfit.variable} antialiased relative`}>
        {/* Global Hatching Pattern Background */}
        {/* <div className="fixed inset-0 -z-50 h-full w-full bg-white dark:bg-black pointer-events-none">
          <div className="absolute h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00000008_10px,#00000008_11px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ffffff08_10px,#ffffff08_11px)]" />
        </div> */}
        
        <Providers>
          <div className="grid min-h-svh grid-rows-[auto_1fr]">
            <Analytics />
            <Header />
            <main className="wrapperx">
              {children}
            </main>
            <MobileBottomNav />
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
