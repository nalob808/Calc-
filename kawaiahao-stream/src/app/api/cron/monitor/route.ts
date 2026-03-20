import { NextRequest, NextResponse } from "next/server";
import { getBroadcastHealth, transitionBroadcast } from "@/lib/youtube";
import { getCurrentService, updateCurrentService, appendLog } from "@/lib/data";
import { sendSMS } from "@/lib/sms";

/**
 * Cron endpoint for stream health monitoring.
 * Runs on Sundays after 11 AM HST.
 * - Polls broadcast health status
 * - Ends stream after detecting 5+ minutes of silence/no audio
 * - Safety net: alerts at 2 PM HST if stream is still running
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
    // Check if it's Sunday after 11 AM HST
    const now = new Date();
    const hstOffset = -10 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const hstMinutes = utcMinutes + hstOffset;
    const hstTotalMinutes = ((hstMinutes % 1440) + 1440) % 1440;
    const hstHours = Math.floor(hstTotalMinutes / 60);

    let hstDay = now.getUTCDay();
    if (hstMinutes < 0) {
      hstDay = (hstDay - 1 + 7) % 7;
    }

    const isSunday = hstDay === 0;
    const isAfter11 = hstHours >= 11;

    if (!isSunday || !isAfter11) {
      return NextResponse.json({
        status: "skipped",
        message: "Not within monitoring window (Sunday after 11 AM HST)",
        hstDay,
        hstHours,
      });
    }

    // Check for active broadcast
    const service = await getCurrentService();

    if (!service || !service.broadcastId) {
      return NextResponse.json({
        status: "skipped",
        message: "No active broadcast to monitor",
      });
    }

    if (service.status === "complete" || service.status === "idle") {
      return NextResponse.json({
        status: "skipped",
        message: `Broadcast status is "${service.status}", nothing to monitor`,
      });
    }

    const broadcastId = service.broadcastId;

    // Safety net: If it's 2 PM HST or later and still live, alert
    if (hstHours >= 14 && service.status === "live") {
      await appendLog({
        step: "cron-monitor",
        status: "warning",
        details: `SAFETY NET: Stream still running at ${hstHours}:00 HST for broadcast ${broadcastId}`,
      });

      // Send SMS alert
      try {
        await sendSMS(
          `[Kawaiahao Stream] Safety alert: Broadcast ${broadcastId} is still live at ${hstHours}:00 HST. ` +
            `Please check and end the stream manually if needed.`
        );
      } catch (smsError) {
        await appendLog({
          step: "cron-monitor",
          status: "error",
          details: `Failed to send safety net SMS: ${smsError instanceof Error ? smsError.message : String(smsError)}`,
        });
      }

      // Auto-end after 2:30 PM as absolute safety
      if (hstHours >= 14 && (hstTotalMinutes % 60) >= 30) {
        try {
          await transitionBroadcast(broadcastId, "complete");
          await updateCurrentService({ status: "complete" });
          await appendLog({
            step: "cron-monitor",
            status: "success",
            details: `Safety net: Auto-ended broadcast ${broadcastId} at ${hstHours}:${String(hstTotalMinutes % 60).padStart(2, "0")} HST`,
          });

          return NextResponse.json({
            status: "auto_ended",
            broadcastId,
            reason: "Safety net timeout (after 2:30 PM HST)",
          });
        } catch (endError) {
          const msg =
            endError instanceof Error ? endError.message : String(endError);
          await appendLog({
            step: "cron-monitor",
            status: "error",
            details: `Safety net auto-end failed: ${msg}`,
          });
        }
      }

      return NextResponse.json({
        status: "alert_sent",
        broadcastId,
        message: "Safety net alert sent - stream still running after 2 PM HST",
      });
    }

    // Normal monitoring: check broadcast health
    const health = await getBroadcastHealth(broadcastId);

    await appendLog({
      step: "cron-monitor",
      status: "info",
      details: `Health check: status=${health.status}, health=${health.healthStatus}, audio=${health.audioHealthStatus}`,
    });

    // Check for silence / no data (indicates stream may have ended)
    const isUnhealthy =
      health.healthStatus === "noData" ||
      health.healthStatus === "bad" ||
      health.status === "complete" ||
      health.status === "revoked";

    if (isUnhealthy && service.status === "live") {
      // If stream appears dead, end it
      await appendLog({
        step: "cron-monitor",
        status: "warning",
        details: `Stream appears inactive (health: ${health.healthStatus}). Ending broadcast.`,
      });

      try {
        await transitionBroadcast(broadcastId, "complete");
        await updateCurrentService({ status: "complete" });

        await appendLog({
          step: "cron-monitor",
          status: "success",
          details: `Broadcast ${broadcastId} auto-ended due to inactive stream`,
        });

        return NextResponse.json({
          status: "auto_ended",
          broadcastId,
          reason: `Stream inactive (health: ${health.healthStatus})`,
          health,
        });
      } catch (endError) {
        const msg =
          endError instanceof Error ? endError.message : String(endError);
        return NextResponse.json({
          status: "end_failed",
          broadcastId,
          error: msg,
          health,
        });
      }
    }

    return NextResponse.json({
      status: "monitoring",
      broadcastId,
      serviceStatus: service.status,
      health,
      hstHours,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "cron-monitor",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Stream monitor failed: ${message}` },
      { status: 500 }
    );
  }
}
