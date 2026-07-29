import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Splash } from "../components/Splash";
import { ClickSpark } from "../components/ClickSpark";
import { CursorTrail } from "../components/CursorTrail";
import { RotatePrompt } from "../components/MobileGate";
import { MuteToggle } from "../components/MuteToggle";
import { SensoryUIProvider } from "@/lib/provider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Custom UNO",
  description: "Multiplayer UNO with configurable house rules",
};

// The mobile board is a fixed-viewport portrait layout, so lock the scale:
// pinch-zoom would only push the table out of frame mid-game.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <SensoryUIProvider
          config={{
            theme: "arcade",
            volume: 0.3,
            categories: {
              interaction: true,
              overlay: true,
              navigation: true,
              notification: true,
              hero: true, // enable the win fanfare (hero.complete)
            },
          }}
        >
          <Splash>{children}</Splash>
          <ClickSpark />
          <CursorTrail />
          <RotatePrompt />
          <MuteToggle />
        </SensoryUIProvider>
        <Analytics />
      </body>
    </html>
  );
}
