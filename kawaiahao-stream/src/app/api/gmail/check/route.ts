import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { checkForBulletin, getAttachment } from "@/lib/gmail";
import { extractBulletinData, compareBulletins } from "@/lib/bulletin";
import {
  getConfig,
  getCurrentBulletin,
  updateCurrentBulletin,
  appendLog,
} from "@/lib/data";
import { sendBulletinNotification } from "@/lib/email";

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
      step: "bulletin-check",
      status: "info",
      details: "Starting bulletin check",
    });

    const matches = await checkForBulletin(senders, keywords);

    if (matches.length === 0) {
      await appendLog({
        step: "bulletin-check",
        status: "info",
        details: "No bulletin emails found",
      });
      return NextResponse.json({
        status: "no_bulletin",
        message: "No matching bulletin emails found",
      });
    }

    // Process the most recent match with a PDF attachment
    const withPdf = matches.find((m) => m.hasAttachment);

    if (!withPdf) {
      await appendLog({
        step: "bulletin-check",
        status: "warning",
        details: "Bulletin emails found but no PDF attachments",
      });
      return NextResponse.json({
        status: "no_pdf",
        message: "Bulletin emails found but none have PDF attachments",
        matches: matches.map((m) => ({
          subject: m.subject,
          from: m.from,
          date: m.date,
        })),
      });
    }

    // Download and parse the first PDF attachment
    const pdfAttachment = withPdf.attachments[0];
    const pdfBuffer = await getAttachment(
      withPdf.messageId,
      pdfAttachment.attachmentId
    );
    const bulletinData = await extractBulletinData(pdfBuffer);

    // Check if this is different from the current bulletin
    const existingBulletin = await getCurrentBulletin();
    let diffs = null;
    if (existingBulletin) {
      if (existingBulletin.rawText === bulletinData.rawText) {
        await appendLog({
          step: "bulletin-check",
          status: "info",
          details: "Bulletin unchanged from current version",
        });
        return NextResponse.json({
          status: "unchanged",
          message: "Bulletin content matches current version",
        });
      }
      diffs = compareBulletins(existingBulletin, bulletinData);
    }

    // Save the new bulletin
    await updateCurrentBulletin(bulletinData);
    await appendLog({
      step: "bulletin-check",
      status: "success",
      details: `New bulletin extracted: "${bulletinData.sermonTitle}" by ${bulletinData.pastorName}`,
    });

    // Send notification email
    const dashboardUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    try {
      await sendBulletinNotification(
        bulletinData,
        `${dashboardUrl}/dashboard`
      );
      await appendLog({
        step: "bulletin-notification",
        status: "success",
        details: "Bulletin notification email sent",
      });
    } catch (emailError) {
      await appendLog({
        step: "bulletin-notification",
        status: "error",
        details: `Failed to send notification: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
      });
    }

    return NextResponse.json({
      status: "new_bulletin",
      message: "New bulletin extracted and saved",
      bulletin: {
        sermonTitle: bulletinData.sermonTitle,
        pastorName: bulletinData.pastorName,
        serviceDate: bulletinData.serviceDate,
        serviceTimes: bulletinData.serviceTimes,
        orderOfServiceItems: bulletinData.orderOfService.length,
      },
      diffs,
      source: {
        subject: withPdf.subject,
        from: withPdf.from,
        date: withPdf.date,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "bulletin-check",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Bulletin check failed: ${message}` },
      { status: 500 }
    );
  }
}
