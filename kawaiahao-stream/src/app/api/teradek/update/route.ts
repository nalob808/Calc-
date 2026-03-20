import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { updateStreamDestination } from "@/lib/teradek";
import { appendLog } from "@/lib/data";

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
    const { streamKey } = await request.json();

    if (!streamKey) {
      return NextResponse.json(
        { error: "Missing required field: streamKey" },
        { status: 400 }
      );
    }

    const result = await updateStreamDestination(streamKey);

    await appendLog({
      step: "teradek-update",
      status: result.success ? "success" : "warning",
      details: result.message,
    });

    return NextResponse.json({
      status: result.success ? "teradek_updated" : "teradek_pending",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: "teradek-update",
      status: "error",
      details: message,
    }).catch(() => {});
    return NextResponse.json(
      { error: `Failed to update Teradek: ${message}` },
      { status: 500 }
    );
  }
}
