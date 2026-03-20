"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VideoCard from "@/components/VideoCard";
import VideoModal from "@/components/VideoModal";
import FilterBar, { ActiveFilters } from "@/components/FilterBar";

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  eventType: string;
}

const PAGE_SIZE = 12;

function parsePastor(title: string): string {
  const parts = title.split(" \u2014 ");
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  const dashParts = title.split(" - ");
  if (dashParts.length >= 2) return dashParts[dashParts.length - 1].trim();
  return "";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function SkeletonCard() {
  return (
    <div className="card p-0 overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#1a1a1a]" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-20 bg-[#1a1a1a] rounded-full" />
        <div className="h-5 w-3/4 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-1/2 bg-[#1a1a1a] rounded" />
        <div className="h-3 w-1/3 bg-[#1a1a1a] rounded" />
      </div>
    </div>
  );
}

export default function SermonsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({
    speaker: "",
    year: "",
    eventType: "",
  });

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch("/api/youtube/archive", {
          headers: { "Cache-Control": "max-age=10800, stale-while-revalidate=10800" },
        });
        if (!res.ok) throw new Error("Failed to fetch videos");
        const data = await res.json();
        setVideos(data.videos ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  // Build filter options from data
  const speakers = useMemo(() => {
    const names = new Set<string>();
    videos.forEach((v) => {
      const pastor = parsePastor(v.title);
      if (pastor) names.add(pastor);
    });
    return Array.from(names).sort();
  }, [videos]);

  const years = useMemo(() => {
    const yrs = new Set<string>();
    videos.forEach((v) => {
      try {
        const yr = new Date(v.publishedAt).getFullYear().toString();
        yrs.add(yr);
      } catch { /* skip */ }
    });
    return Array.from(yrs).sort().reverse();
  }, [videos]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    videos.forEach((v) => {
      if (v.eventType) types.add(v.eventType);
    });
    // Default set if none from API
    if (types.size === 0) return ["Sunday Service", "Concert", "Special Event"];
    return Array.from(types).sort();
  }, [videos]);

  // Filter videos
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (filters.speaker && parsePastor(v.title) !== filters.speaker) return false;
      if (filters.year) {
        try {
          if (new Date(v.publishedAt).getFullYear().toString() !== filters.year) return false;
        } catch {
          return false;
        }
      }
      if (filters.eventType && v.eventType !== filters.eventType) return false;
      return true;
    });
  }, [videos, filters]);

  const visibleVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  const handleFilterChange = useCallback((newFilters: ActiveFilters) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Page Heading */}
          <div className="mb-8">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#e8e8e8] mb-2">
              Sermon Archive
            </h1>
            <p className="text-[#888888]">
              Watch past sermons, services, and special events.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mb-8">
            <FilterBar
              speakers={speakers}
              years={years}
              eventTypes={eventTypes}
              activeFilters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="card text-center py-12">
              <p className="text-[#ef4444] mb-2">Something went wrong</p>
              <p className="text-sm text-[#888888]">{error}</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Video Grid */}
          {!loading && !error && (
            <>
              {filteredVideos.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-[#888888]">No videos found matching your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleVideos.map((video) => (
                    <VideoCard
                      key={video.videoId}
                      videoId={video.videoId}
                      thumbnail={video.thumbnail}
                      title={video.title}
                      pastor={parsePastor(video.title)}
                      date={formatDate(video.publishedAt)}
                      duration={video.duration}
                      viewCount={video.viewCount}
                      eventType={video.eventType}
                      onPlay={(id) =>
                        setActiveVideo({ videoId: id, title: video.title })
                      }
                    />
                  ))}
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="btn-outline px-8 py-3"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          videoId={activeVideo.videoId}
          title={activeVideo.title}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
