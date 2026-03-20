import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createBroadcast } from "@/lib/youtube";
import { updateStreamDestination } from "@/lib/teradek";
import { updateLivePage } from "@/lib/wordpress";
import {
  updateCurrentService,
  appendLog,
  getCurrentBulletin,
} from "@/lib/data";
import { getUpcomingSunday } from "@/lib/bulletin";
import { getConfig } from "@/lib/data";

interface ChainStepResult {
  step: string;
  status: "success" | "error" | "skipped";
  details: string;
  data?: Record<string, unknown>;
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
    const { confirmed, bulletinData } = await request.json();

    if (!confirmed) {
      return NextResponse.json(
        { error: "Automation chain must be explicitly confirmed" },
        { status: 400 }
      );
    }

    const results: ChainStepResult[] = [];
    const config = await getConfig();

    // Use provided bulletin data or fall back to stored bulletin
    const bulletin = bulletinData || (await getCurrentBulletin());

    if (!bulletin) {
      return NextResponse.json(
        { error: "No bulletin data available. Run bulletin check first." },
        { status: 400 }
      );
    }

    const sermonTitle = bulletin.sermonTitle || "Sunday Worship Service";
    const pastorName = bulletin.pastorName || "";
    const serviceDate = bulletin.serviceDate || "";

    // Build broadcast title
    const title = `${sermonTitle} — Kawaia\u02BBaha\u02BBo Church${serviceDate ? ` | ${serviceDate}` : ""}`;
    const description = [
      sermonTitle,
      pastorName ? `Speaker: ${pastorName}` : "",
      serviceDate ? `Date: ${serviceDate}` : "",
      "",
      "Kawaia\u02BBaha\u02BBo Church",
      "957 Punchbowl Street, Honolulu, HI 96813",
      "https://kawaiahao.org",
    ]
      .filter(Boolean)
      .join("\n");

    // Compute scheduled start for upcoming Sunday at configured service time
    const sunday = getUpcomingSunday();
    const [hours, minutes] = (config.defaultServiceTime || "09:00")
      .split(":")
      .map(Number);
    sunday.setHours(hours, minutes, 0, 0);
    const scheduledStart = sunday.toISOString();

    await appendLog({
      step: "automation-chain",
      status: "info",
      details: `Starting automation chain for "${sermonTitle}"`,
    });

    // Step 1: Create YouTube broadcast
    let broadcastId = "";
    let streamKey = "";
    let videoId = "";

    try {
      const broadcastResult = await createBroadcast(
        title,
        description,
        scheduledStart,
        (config.defaultPrivacy as "public" | "private" | "unlisted") || "public"
      );

      broadcastId = broadcastResult.broadcastId;
      streamKey = broadcastResult.streamKey;
      videoId = broadcastResult.videoId;

      await updateCurrentService({
        broadcastId,
        streamKey,
        videoId,
        title,
        description,
        scheduledStartTime: scheduledStart,
        sermonTitle,
        pastorName,
        status: "scheduled",
      });

      results.push({
        step: "youtube-create",
        status: "success",
        details: `Broadcast created: ${broadcastId}`,
        data: { broadcastId, streamKey, videoId },
      });

      await appendLog({
        step: "youtube-create",
        status: "success",
        details: `Broadcast ${broadcastId} created for "${title}"`,
      });
    } catch (ytError) {
      const msg =
        ytError instanceof Error ? ytError.message : String(ytError);
      results.push({
        step: "youtube-create",
        status: "error",
        details: msg,
      });
      await appendLog({
        step: "youtube-create",
        status: "error",
        details: msg,
      });
      // Cannot continue without a broadcast
      return NextResponse.json({
        status: "chain_failed",
        message: "Failed at YouTube broadcast creation",
        results,
      });
    }

    // Step 2: Update Teradek stream destination
    try {
      const teradekResult = await updateStreamDestination(streamKey);
      results.push({
        step: "teradek-update",
        status: teradekResult.success ? "success" : "skipped",
        details: teradekResult.message,
      });
      await appendLog({
        step: "teradek-update",
        status: teradekResult.success ? "success" : "warning",
        details: teradekResult.message,
      });
    } catch (tdError) {
      const msg =
        tdError instanceof Error ? tdError.message : String(tdError);
      results.push({
        step: "teradek-update",
        status: "error",
        details: msg,
      });
      await appendLog({
        step: "teradek-update",
        status: "error",
        details: msg,
      });
    }

    // Step 3: Update WordPress live page
    try {
      await updateLivePage(videoId, sermonTitle, pastorName);
      results.push({
        step: "wordpress-update",
        status: "success",
        details: `WordPress live page updated with video ${videoId}`,
      });
      await appendLog({
        step: "wordpress-update",
        status: "success",
        details: `WordPress updated with video ${videoId}`,
      });
    } catch (wpError) {
      const msg =
        wpError instanceof Error ? wpError.message : String(wpError);
      results.push({
        step: "wordpress-update",
        status: "error",
        details: msg,
      });
      await appendLog({
        step: "wordpress-update",
        status: "error",
        details: msg,
      });
    }

    await appendLog({
      step: "automation-chain",
      status: "success",
      details: `Chain completed: ${results.filter((r) => r.status === "success").length}/${results.length} steps succeeded`,
    });

    return NextResponse.json({
      status: "chain_complete",
      broadcastId,
      streamKey,
      videoId,
      title,
      scheduledStart,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "automation-chain",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Automation chain failed: ${message}` },
      { status: 500 }
    );
  }
}
