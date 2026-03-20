import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { updateLivePage } from "@/lib/wordpress";
import { updateCurrentService, appendLog } from "@/lib/data";

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
    const { videoId, sermonTitle, pastorName } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "Missing required field: videoId" },
        { status: 400 }
      );
    }

    await updateLivePage(videoId, sermonTitle || "", pastorName || "");

    await updateCurrentService({
      sermonTitle: sermonTitle || "",
      pastorName: pastorName || "",
    });

    await appendLog({
      step: "wordpress-update",
      status: "success",
      details: `WordPress live page updated with video ${videoId}`,
    });

    return NextResponse.json({
      status: "wordpress_updated",
      videoId,
      sermonTitle: sermonTitle || "",
      pastorName: pastorName || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "wordpress-update",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Failed to update WordPress: ${message}` },
      { status: 500 }
    );
  }
}
