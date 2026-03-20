import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { transitionBroadcast } from "@/lib/youtube";
import { getCurrentService, updateCurrentService, appendLog } from "@/lib/data";

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
      step: "go-live",
      status: "info",
      details: `Starting go-live sequence for broadcast ${broadcastId}`,
    });

    // Step 1: Transition to testing
    try {
      await transitionBroadcast(broadcastId, "testing");
      await updateCurrentService({ status: "testing" });
      await appendLog({
        step: "go-live",
        status: "info",
        details: `Broadcast ${broadcastId} transitioned to testing`,
      });
    } catch (testError) {
      // May already be in testing state, continue to live
      const msg =
        testError instanceof Error ? testError.message : String(testError);
      await appendLog({
        step: "go-live",
        status: "warning",
        details: `Testing transition note: ${msg}`,
      });
    }

    // Brief delay to allow stream to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 2: Transition to live
    await transitionBroadcast(broadcastId, "live");
    await updateCurrentService({ status: "live" });

    await appendLog({
      step: "go-live",
      status: "success",
      details: `Broadcast ${broadcastId} is now LIVE`,
    });

    return NextResponse.json({
      status: "live",
      broadcastId,
      message: "Broadcast is now live",
      liveAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "go-live",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Go-live failed: ${message}` },
      { status: 500 }
    );
  }
}
