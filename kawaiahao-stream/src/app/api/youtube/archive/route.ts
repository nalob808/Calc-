import { NextRequest, NextResponse } from "next/server";
import { getChannelVideos } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "50", 10);

    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!channelId) {
      return NextResponse.json(
        { error: "YOUTUBE_CHANNEL_ID not configured" },
        { status: 500 }
      );
    }

    const clampedMaxResults = Math.min(Math.max(1, maxResults), 50);
    const result = await getChannelVideos(
      channelId,
      clampedMaxResults,
      pageToken
    );

    return NextResponse.json({
      videos: result.videos,
      nextPageToken: result.nextPageToken || null,
      channelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch archive: ${message}` },
      { status: 500 }
    );
  }
}
