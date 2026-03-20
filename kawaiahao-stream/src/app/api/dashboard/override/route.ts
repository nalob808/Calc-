import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { updateLivePage } from "@/lib/wordpress";
import { appendLog, getCurrentService } from "@/lib/data";

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
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "Missing required field: youtubeUrl" },
        { status: 400 }
      );
    }

    // Extract video ID from various YouTube URL formats
    let videoId = "";
    try {
      const url = new URL(youtubeUrl);
      if (url.hostname.includes("youtu.be")) {
        videoId = url.pathname.slice(1);
      } else if (url.hostname.includes("youtube.com")) {
        videoId = url.searchParams.get("v") || url.pathname.split("/").pop() || "";
      }
    } catch {
      // Assume it's a raw video ID
      videoId = youtubeUrl;
    }

    if (!videoId) {
      return NextResponse.json(
        { error: "Could not extract video ID from URL" },
        { status: 400 }
      );
    }

    // Get current service info for sermon title and pastor name
    const service = await getCurrentService();
    const sermonTitle = service?.sermonTitle || "Sunday Worship Service";
    const pastorName = service?.pastorName || "";

    await updateLivePage(videoId, sermonTitle, pastorName);

    await appendLog({
      step: "manual-override",
      status: "success",
      details: `WordPress manually updated with video ${videoId} from URL: ${youtubeUrl}`,
    });

    return NextResponse.json({
      status: "override_complete",
      videoId,
      sermonTitle,
      pastorName,
      message: "WordPress live page updated via manual override",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "manual-override",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Manual override failed: ${message}` },
      { status: 500 }
    );
  }
}
