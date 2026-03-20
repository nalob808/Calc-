import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { transitionBroadcast } from "@/lib/youtube";
import { updateCurrentService, appendLog, getConfig } from "@/lib/data";
import { addVideoToPlaylist } from "@/lib/youtube";

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
    const { broadcastId } = await request.json();

    if (!broadcastId) {
      return NextResponse.json(
        { error: "Missing required field: broadcastId" },
        { status: 400 }
      );
    }

    await appendLog({
      step: "end-stream",
      status: "info",
      details: `Ending broadcast ${broadcastId}`,
    });

    // Transition to complete
    await transitionBroadcast(broadcastId, "complete");
    await updateCurrentService({ status: "complete" });

    await appendLog({
      step: "end-stream",
      status: "success",
      details: `Broadcast ${broadcastId} ended`,
    });

    // Try to add to archive playlist if configured
    const config = await getConfig();
    if (config.archivePlaylistId) {
      try {
        await addVideoToPlaylist(config.archivePlaylistId, broadcastId);
        await appendLog({
          step: "archive-playlist",
          status: "success",
          details: `Video ${broadcastId} added to archive playlist ${config.archivePlaylistId}`,
        });
      } catch (playlistError) {
        const msg =
          playlistError instanceof Error
            ? playlistError.message
            : String(playlistError);
        await appendLog({
          step: "archive-playlist",
          status: "error",
          details: `Failed to add to archive playlist: ${msg}`,
        });
      }
    }

    return NextResponse.json({
      status: "stream_ended",
      broadcastId,
      endedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "end-stream",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Failed to end stream: ${message}` },
      { status: 500 }
    );
  }
}
