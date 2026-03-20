"use client";

import { useState, FormEvent } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type FormState = "idle" | "submitting" | "success" | "error";

export default function PrayerPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [request, setRequest] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!request.trim()) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Anonymous",
          email: email.trim() || undefined,
          request: request.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit prayer request");
      }

      setFormState("success");
      setName("");
      setEmail("");
      setRequest("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setFormState("error");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#e8e8e8] mb-4">
              Prayer Requests
            </h1>
            <p className="text-[#888888] leading-relaxed max-w-lg mx-auto">
              We believe in the power of prayer. Share your request below and our
              church ohana will lift you up in prayer. All submissions are treated
              with care and confidentiality.
            </p>
          </div>

          {/* Success State */}
          {formState === "success" ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4" aria-hidden="true">
                {/* Dove SVG */}
                <svg className="w-16 h-16 mx-auto text-[#c9972b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#e8e8e8] mb-3">
                Mahalo for sharing
              </h2>
              <p className="text-[#888888] mb-6">
                Your prayer request has been received. Our church community holds you
                in prayer and in our hearts.
              </p>
              <button
                onClick={() => setFormState("idle")}
                className="btn-outline"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="card space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="prayer-name" className="block text-sm font-medium text-[#e8e8e8] mb-2">
                  Name <span className="text-[#555555]">(optional)</span>
                </label>
                <input
                  id="prayer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="prayer-email" className="block text-sm font-medium text-[#e8e8e8] mb-2">
                  Email <span className="text-[#555555]">(optional)</span>
                </label>
                <input
                  id="prayer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field"
                />
              </div>

              {/* Prayer Request */}
              <div>
                <label htmlFor="prayer-request" className="block text-sm font-medium text-[#e8e8e8] mb-2">
                  Prayer Request <span className="text-[#ef4444]">*</span>
                </label>
                <textarea
                  id="prayer-request"
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="Share what is on your heart..."
                  required
                  rows={6}
                  className="input-field resize-y"
                />
              </div>

              {/* Error Message */}
              {formState === "error" && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-4">
                  <p className="text-sm text-[#ef4444]">{errorMsg}</p>
                  <p className="text-xs text-[#888888] mt-1">Please try again.</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={formState === "submitting" || !request.trim()}
                className="btn-gold w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Prayer Request"
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
