import type { Metadata } from "next";
import "./globals.css";
import { Splash } from "../components/Splash";

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
      </body>
    </html>
  );
}
