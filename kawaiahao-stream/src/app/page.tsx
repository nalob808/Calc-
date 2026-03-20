"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function HomePage() {
  const embedUrl =
    "https://www.youtube.com/embed/live_stream?channel=UCkPKHsQsZ7KBaVgr0EVMuHg&rel=0";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-[#0a0a0a]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
            {/* YouTube Embed */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#141414] shadow-2xl ring-1 ring-[#2a2a2a]">
              <iframe
                src={embedUrl}
                title="Kawaiahao Church Live Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#e8e8e8] mb-4">
            Kawaiahao Church
          </h1>
          <p className="text-lg sm:text-xl text-[#888888] mb-2">
            Join us for Sunday worship
          </p>
          <p className="text-sm text-[#555555] mb-8">
            Sundays at 9:00 AM HST &middot; 957 Punchbowl St, Honolulu, HI 96813
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a
              href="https://www.youtube.com/@kawaiahao/live"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold text-base px-8 py-3"
            >
              Watch Live
            </a>
            <Link href="/sermons" className="btn-outline text-base px-8 py-3">
              Sermon Archive
            </Link>
          </div>

          {/* Giving Link */}
          <div className="mt-4">
            <a
              href="https://kawaiahao.org/give"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#c9972b] hover:text-[#d4a940] transition-colors underline underline-offset-4"
            >
              Support Kawaiahao Church &mdash; Give Online
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
