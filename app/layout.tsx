import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goal Galaxy — Every World Cup goal as light",
  description:
    "Every goal from the World Cups StatsBomb opens up — 1958 to 2023, men's and women's — rendered as a real ballistic arc, coloured by how improbable it was. Built on StatsBomb Open Data. No API, no upkeep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
