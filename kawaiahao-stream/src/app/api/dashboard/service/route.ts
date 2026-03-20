import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getCurrentService, updateCurrentService } from "@/lib/data";

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
    const service = await getCurrentService();

    if (!service) {
      return NextResponse.json({
        service: null,
        message: "No active service",
      });
    }

    return NextResponse.json({ service });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to get service data: ${message}` },
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
    const updates = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      "title",
      "description",
      "sermonTitle",
      "pastorName",
      "scheduledStartTime",
      "status",
    ];

    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filtered[key] = updates[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json(
        {
          error: `No valid fields to update. Allowed: ${allowedFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const service = await updateCurrentService(filtered);

    return NextResponse.json({
      status: "service_updated",
      service,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to update service data: ${message}` },
      { status: 500 }
    );
  }
}
