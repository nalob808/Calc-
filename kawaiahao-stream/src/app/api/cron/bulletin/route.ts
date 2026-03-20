import { NextRequest, NextResponse } from "next/server";
import { checkForBulletin, getAttachment } from "@/lib/gmail";
import { extractBulletinData } from "@/lib/bulletin";
import {
  getConfig,
  getCurrentBulletin,
  updateCurrentBulletin,
  appendLog,
} from "@/lib/data";
import { sendBulletinNotification } from "@/lib/email";

/**
 * Cron endpoint for bulletin monitoring.
 * Called by Vercel cron or an external scheduler.
 * Only runs between Thursday noon and Saturday noon HST.
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
    // Check if current time is within Thursday noon - Saturday noon HST
    const now = new Date();
    const hstOffset = -10 * 60; // HST is UTC-10
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const hstMinutes = utcMinutes + hstOffset;
    const hstHours = ((hstMinutes / 60 + 24) % 24);

    // Get HST day of week (adjust if we crossed midnight)
    let hstDay = now.getUTCDay();
    if (hstMinutes < 0) {
      hstDay = (hstDay - 1 + 7) % 7;
    }

    // Thursday = 4, Friday = 5, Saturday = 6
    const isInWindow =
      (hstDay === 4 && hstHours >= 12) || // Thursday after noon
      hstDay === 5 || // All of Friday
      (hstDay === 6 && hstHours < 12); // Saturday before noon

    if (!isInWindow) {
      return NextResponse.json({
        status: "skipped",
        message: "Outside bulletin check window (Thu noon - Sat noon HST)",
        hstDay,
        hstHours: Math.floor(hstHours),
      });
    }

    const config = await getConfig();
    const senders = config.bulletinSenders;
    const keywords = config.bulletinKeywords;

    if (senders.length === 0) {
      return NextResponse.json({
        status: "skipped",
        message: "No bulletin senders configured",
      });
    }

    await appendLog({
      step: "cron-bulletin",
      status: "info",
      details: "Cron bulletin check triggered",
    });

    const matches = await checkForBulletin(senders, keywords);

    if (matches.length === 0) {
      return NextResponse.json({
        status: "no_bulletin",
        message: "No matching bulletin emails found",
      });
    }

    const withPdf = matches.find((m) => m.hasAttachment);

    if (!withPdf) {
      return NextResponse.json({
        status: "no_pdf",
        message: "Bulletin emails found but no PDF attachments",
      });
    }

    // Download and parse the PDF
    const pdfAttachment = withPdf.attachments[0];
    const pdfBuffer = await getAttachment(
      withPdf.messageId,
      pdfAttachment.attachmentId
    );
    const bulletinData = await extractBulletinData(pdfBuffer);

    // Check if unchanged
    const existingBulletin = await getCurrentBulletin();
    if (existingBulletin && existingBulletin.rawText === bulletinData.rawText) {
      return NextResponse.json({
        status: "unchanged",
        message: "Bulletin content matches current version",
      });
    }

    // Save new bulletin
    await updateCurrentBulletin(bulletinData);

    await appendLog({
      step: "cron-bulletin",
      status: "success",
      details: `New bulletin found: "${bulletinData.sermonTitle}" by ${bulletinData.pastorName}`,
    });

    // Send notification
    const dashboardUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    try {
      await sendBulletinNotification(
        bulletinData,
        `${dashboardUrl}/dashboard`
      );
    } catch (emailError) {
      await appendLog({
        step: "cron-bulletin",
        status: "warning",
        details: `Notification email failed: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
      });
    }

    return NextResponse.json({
      status: "new_bulletin",
      bulletin: {
        sermonTitle: bulletinData.sermonTitle,
        pastorName: bulletinData.pastorName,
        serviceDate: bulletinData.serviceDate,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "cron-bulletin",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Cron bulletin check failed: ${message}` },
      { status: 500 }
    );
  }
}
