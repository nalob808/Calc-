import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kawaiahao Church — Live Stream",
  description: "Sunday worship livestream and sermon archive for Kawaiahao Church, Honolulu, HI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
