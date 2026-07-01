import type { Metadata } from "next";
import { Anton, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Display: Anton — condensed, stadium-board weight. Used only for the signature
// surname, jersey number, and scoreboard figures.
const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Body: Archivo — a sporty grotesque for everything readable.
const body = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Utility: IBM Plex Mono — tabular data, labels, meta.
const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nightmatch — Football Player Lookup",
  description:
    "Search any footballer for a floodlit profile card: bio, club, position-aware season stats, and transfer history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
