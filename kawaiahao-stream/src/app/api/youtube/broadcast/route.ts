import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  createBroadcast,
  updateBroadcast,
  getVideoDetails,
  getBroadcastHealth,
} from "@/lib/youtube";
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
    const { title, description, scheduledStart, privacy } =
      await request.json();

    if (!title || !scheduledStart) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledStart" },
        { status: 400 }
      );
    }

    const result = await createBroadcast(
      title,
      description || "",
      scheduledStart,
      privacy || "public"
    );

    await updateCurrentService({
      broadcastId: result.broadcastId,
      streamKey: result.streamKey,
      videoId: result.videoId,
      title,
      description: description || "",
      scheduledStartTime: scheduledStart,
      status: "scheduled",
    });

    await appendLog({
      step: "youtube-create",
      status: "success",
      details: `Broadcast created: ${result.broadcastId} - "${title}"`,
    });

    return NextResponse.json({
      status: "broadcast_created",
      broadcastId: result.broadcastId,
      streamKey: result.streamKey,
      videoId: result.videoId,
      title,
      scheduledStart,
      privacy: privacy || "public",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "youtube-create",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Failed to create broadcast: ${message}` },
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
    const { broadcastId, title, description } = await request.json();

    if (!broadcastId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: broadcastId, title" },
        { status: 400 }
      );
    }

    await updateBroadcast(broadcastId, title, description || "");

    await updateCurrentService({ title, description: description || "" });

    await appendLog({
      step: "youtube-update",
      status: "success",
      details: `Broadcast ${broadcastId} updated: "${title}"`,
    });

    return NextResponse.json({
      status: "broadcast_updated",
      broadcastId,
      title,
      description: description || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to update broadcast: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get("broadcastId");

    if (!broadcastId) {
      return NextResponse.json(
        { error: "Missing required query param: broadcastId" },
        { status: 400 }
      );
    }

    const [details, health] = await Promise.all([
      getVideoDetails(broadcastId),
      getBroadcastHealth(broadcastId),
    ]);

    return NextResponse.json({
      status: "ok",
      broadcast: details,
      health,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to get broadcast: ${message}` },
      { status: 500 }
    );
  }
}
