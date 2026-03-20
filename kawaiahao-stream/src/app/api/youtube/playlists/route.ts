import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  getPlaylists,
  createPlaylist,
  addVideoToPlaylist,
} from "@/lib/youtube";

export async function GET() {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!channelId) {
      return NextResponse.json(
        { error: "YOUTUBE_CHANNEL_ID not configured" },
        { status: 500 }
      );
    }

    const playlists = await getPlaylists(channelId);

    return NextResponse.json({ playlists });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch playlists: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, description, privacy } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      );
    }

    const playlistId = await createPlaylist(
      title,
      description || "",
      privacy || "public"
    );

    return NextResponse.json({
      status: "playlist_created",
      playlistId,
      title,
      description: description || "",
      privacy: privacy || "public",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create playlist: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { playlistId, videoId } = await request.json();

    if (!playlistId || !videoId) {
      return NextResponse.json(
        { error: "Missing required fields: playlistId, videoId" },
        { status: 400 }
      );
    }

    await addVideoToPlaylist(playlistId, videoId);

    return NextResponse.json({
      status: "video_added",
      playlistId,
      videoId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to add video to playlist: ${message}` },
      { status: 500 }
    );
  }
}
