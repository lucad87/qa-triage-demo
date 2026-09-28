import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskDeck — demo app under test",
  description: "Minimal task board used as the system under test in the Playwright triage demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
