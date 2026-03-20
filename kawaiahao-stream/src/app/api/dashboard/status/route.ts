import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  getCurrentService,
  getAutomationLog,
  getCurrentBulletin,
} from "@/lib/data";

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
    const [service, log, bulletin] = await Promise.all([
      getCurrentService(),
      getAutomationLog(),
      getCurrentBulletin(),
    ]);

    // Derive pipeline step statuses from the log
    const pipelineSteps = [
      "bulletin-check",
      "youtube-create",
      "teradek-update",
      "wordpress-update",
      "go-live",
      "end-stream",
    ];

    const pipeline = pipelineSteps.map((step) => {
      const stepEntries = log.filter((entry) => entry.step === step);
      const latest = stepEntries.length > 0 ? stepEntries[stepEntries.length - 1] : null;

      return {
        step,
        status: latest?.status || "pending",
        lastRun: latest?.timestamp || null,
        details: latest?.details || null,
      };
    });

    // Get recent log entries (last 50)
    const recentLog = log.slice(-50).reverse();

    return NextResponse.json({
      service: service || { status: "idle" },
      bulletin: bulletin
        ? {
            sermonTitle: bulletin.sermonTitle,
            pastorName: bulletin.pastorName,
            serviceDate: bulletin.serviceDate,
            extractedAt: bulletin.extractedAt,
          }
        : null,
      pipeline,
      recentLog,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to get dashboard status: ${message}` },
      { status: 500 }
    );
  }
}
