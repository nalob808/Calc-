"use client";

export interface VideoCardProps {
  thumbnail: string;
  title: string;
  pastor: string;
  date: string;
  duration: string;
  eventType: string;
  viewCount: string;
  videoId: string;
  onPlay?: (videoId: string) => void;
}

export default function VideoCard({
  thumbnail,
  title,
  pastor,
  date,
  duration,
  eventType,
  viewCount,
  videoId,
  onPlay,
}: VideoCardProps) {
  return (
    <button
      onClick={() => onPlay?.(videoId)}
      className="card group text-left p-0 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-[#c9972b]/50 hover:shadow-[0_0_20px_rgba(201,151,43,0.1)] w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[#1a1a1a]">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-[#e8e8e8] text-xs px-2 py-0.5 rounded font-medium">
            {duration}
          </span>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <svg
            className="w-14 h-14 text-[#c9972b] drop-shadow-lg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Event type pill */}
        {eventType && (
          <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#c9972b]/15 text-[#c9972b] border border-[#c9972b]/30 mb-2">
            {eventType}
          </span>
        )}

        {/* Title */}
        <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-[#e8e8e8] line-clamp-2 mb-2 group-hover:text-[#c9972b] transition-colors">
          {title}
        </h3>

        {/* Meta */}
        <div className="flex flex-col gap-1 text-sm text-[#888888]">
          {pastor && <p className="truncate">{pastor}</p>}
          <div className="flex items-center gap-3 text-xs text-[#555555]">
            <span>{date}</span>
            {viewCount && (
              <>
                <span className="text-[#2a2a2a]">&bull;</span>
                <span>{viewCount} views</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
