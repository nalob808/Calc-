import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { transitionBroadcast } from "@/lib/youtube";
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
    const { broadcastId, status } = await request.json();

    if (!broadcastId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: broadcastId, status" },
        { status: 400 }
      );
    }

    const validStatuses = ["testing", "live", "complete"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await transitionBroadcast(broadcastId, status);

    await updateCurrentService({
      status: status as "testing" | "live" | "complete",
    });

    await appendLog({
      step: "youtube-transition",
      status: "success",
      details: `Broadcast ${broadcastId} transitioned to "${status}"`,
    });

    return NextResponse.json({
      status: "transition_complete",
      broadcastId,
      newStatus: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "youtube-transition",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Failed to transition broadcast: ${message}` },
      { status: 500 }
    );
  }
}
