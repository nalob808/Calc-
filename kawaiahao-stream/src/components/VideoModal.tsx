"use client";

import { useEffect, useCallback } from "react";

interface VideoModalProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

export default function VideoModal({ videoId, title, onClose }: VideoModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2 rounded-full bg-[#1a1a1a]/80 text-[#888888] hover:text-[#e8e8e8] hover:bg-[#2a2a2a] transition-all"
        aria-label="Close video"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Video container */}
      <div className="w-full max-w-5xl">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <p className="mt-4 text-center text-sm text-[#888888] truncate">{title}</p>
      </div>
    </div>
  );
}
