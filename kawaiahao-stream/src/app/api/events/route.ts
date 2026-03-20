import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getPrivateEvents, addPrivateEvent, appendLog } from "@/lib/data";

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
    const events = await getPrivateEvents();

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch events: ${message}` },
      { status: 500 }
    );
  }
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
    const { name, date, time, visibility, eventType } = await request.json();

    if (!name || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields: name, date, time" },
        { status: 400 }
      );
    }

    const validVisibility = ["private", "unlisted"];
    const vis = validVisibility.includes(visibility) ? visibility : "private";

    const event = await addPrivateEvent({
      name,
      date,
      time,
      visibility: vis,
      eventType: eventType || "special",
    });

    await appendLog({
      step: "event-create",
      status: "success",
      details: `Event created: "${name}" on ${date} at ${time} (${vis})`,
    });

    return NextResponse.json({
      status: "event_created",
      event,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create event: ${message}` },
      { status: 500 }
    );
  }
}
