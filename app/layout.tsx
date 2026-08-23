import type { Metadata } from "next";
import { Inter, Source_Serif_4, Geist } from "next/font/google";
import { QueryProvider } from "@/components/QueryProvider";
import CanvasCursor from "@/components/CanvasCursor";
import SpaceBackground from "@/components/SpaceBackground";
import { Footer } from "@/components/Footer";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cosmica - Astronomy Picture of the Day",
  description:
    "A calm, editorial reader for NASA's Astronomy Picture of the Day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        sourceSerif.variable,
        "font-sans",
        geist.variable,
        "bg-main-bg",
      )}
    >
      <body className="min-h-full flex flex-col text-hero-fg">
        <SpaceBackground />
        <CanvasCursor />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <QueryProvider>{children}</QueryProvider>
          <Footer />
        </div>
      </body>
    </html>
  );
}
