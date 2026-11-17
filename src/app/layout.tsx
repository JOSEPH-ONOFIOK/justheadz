import type { Metadata, Viewport } from "next";
import { Bowlby_One, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SITE, X_HANDLE } from "@/lib/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ClickBurst } from "@/components/motion/ClickBurst";
import { INTRO_BOOT } from "@/lib/intro";

const bowlby = Bowlby_One({ variable: "--font-bowlby", weight: "400", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });

const TITLE = "JustHeadz · new evolution";
const DESCRIPTION = "Heads only. No bodies, no mercy. Poke the pile, find your mood and check if you're a Head.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: "%s · JustHeadz" },
  description: DESCRIPTION,
  applicationName: "JustHeadz",
  keywords: ["JustHeadz", "Just Headz", "NFT", "PFP", "whitelist", "heads", "new evolution"],
  authors: [{ name: "JustHeadz", url: SITE.url }],
  creator: "JustHeadz",
  publisher: "JustHeadz",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: { type: "website", url: "/", siteName: "JustHeadz", locale: "en_US", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", site: X_HANDLE, creator: X_HANDLE, title: TITLE, description: DESCRIPTION },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { themeColor: "#f8d8a7", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: INTRO_BOOT may add data-seen before React loads
    <html lang="en" className={`${bowlby.variable} ${grotesk.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <ClickBurst />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
