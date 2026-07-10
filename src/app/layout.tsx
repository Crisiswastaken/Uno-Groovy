import type { Metadata } from "next";
import "./globals.css";
import { Splash } from "../components/Splash";
import { ClickSpark } from "../components/ClickSpark";
import { MobileGate } from "../components/MobileGate";

export const metadata: Metadata = {
  title: "Custom UNO",
  description: "Multiplayer UNO with configurable house rules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Splash>{children}</Splash>
        <ClickSpark />
        <MobileGate />
      </body>
    </html>
  );
}
