import { NextRequest, NextResponse } from "next/server";
import { transitionBroadcast } from "@/lib/youtube";
import { getCurrentService, updateCurrentService, appendLog } from "@/lib/data";

/**
 * Cron endpoint for Sunday go-live automation.
 * Triggers at ~9:15 AM HST on Sundays.
 * Transitions broadcast from scheduled -> testing -> live.
 * Authenticated via CRON_SECRET query parameter.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if it's Sunday ~9:15 AM HST
    const now = new Date();
    const hstOffset = -10 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const hstMinutes = utcMinutes + hstOffset;
    const hstTotalMinutes = ((hstMinutes % 1440) + 1440) % 1440;
    const hstHours = Math.floor(hstTotalMinutes / 60);
    const hstMins = hstTotalMinutes % 60;

    let hstDay = now.getUTCDay();
    if (hstMinutes < 0) {
      hstDay = (hstDay - 1 + 7) % 7;
    }

    // Check if it's Sunday (0) and approximately 9:15 AM HST (allow 9:00-9:30 window)
    const isSunday = hstDay === 0;
    const isGoLiveTime = hstHours === 9 && hstMins >= 0 && hstMins <= 30;

    if (!isSunday || !isGoLiveTime) {
      return NextResponse.json({
        status: "skipped",
        message: "Not within Sunday go-live window (9:00-9:30 AM HST)",
        hstDay,
        hstTime: `${hstHours}:${String(hstMins).padStart(2, "0")}`,
      });
    }

    // Check for active broadcast
    const service = await getCurrentService();

    if (!service || !service.broadcastId) {
      return NextResponse.json({
        status: "skipped",
        message: "No active broadcast found in current-service.json",
      });
    }

    if (service.status === "live") {
      return NextResponse.json({
        status: "already_live",
        message: "Broadcast is already live",
        broadcastId: service.broadcastId,
      });
    }

    if (service.status === "complete") {
      return NextResponse.json({
        status: "skipped",
        message: "Broadcast already completed",
        broadcastId: service.broadcastId,
      });
    }

    const broadcastId = service.broadcastId;

    await appendLog({
      step: "cron-golive",
      status: "info",
      details: `Cron go-live triggered for broadcast ${broadcastId}`,
    });

    // Step 1: Transition to testing
    try {
      await transitionBroadcast(broadcastId, "testing");
      await updateCurrentService({ status: "testing" });
      await appendLog({
        step: "cron-golive",
        status: "info",
        details: `Broadcast ${broadcastId} transitioned to testing`,
      });
    } catch (testError) {
      const msg =
        testError instanceof Error ? testError.message : String(testError);
      await appendLog({
        step: "cron-golive",
        status: "warning",
        details: `Testing transition note: ${msg}`,
      });
    }

    // Brief delay for stream initialization
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 2: Transition to live
    await transitionBroadcast(broadcastId, "live");
    await updateCurrentService({ status: "live" });

    await appendLog({
      step: "cron-golive",
      status: "success",
      details: `Broadcast ${broadcastId} is now LIVE via cron`,
    });

    return NextResponse.json({
      status: "live",
      broadcastId,
      message: "Broadcast transitioned to live via cron",
      liveAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "cron-golive",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Cron go-live failed: ${message}` },
      { status: 500 }
    );
  }
}
