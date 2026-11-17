import type { Metadata, Viewport } from "next";
import { Bowlby_One, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";
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
  openGraph: { type: "website", url: "/", siteName: "JustHeadz", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
