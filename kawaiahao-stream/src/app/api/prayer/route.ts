import { NextRequest, NextResponse } from "next/server";
import { sendPrayerRequest } from "@/lib/email";
import { appendPrayerRequest } from "@/lib/sheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, request: prayerRequest } = body;

    if (!name || !email || !prayerRequest) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, request" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const errors: string[] = [];

    // Send email notification
    try {
      await sendPrayerRequest(name, email, prayerRequest);
    } catch (emailError) {
      errors.push(
        `Email: ${emailError instanceof Error ? emailError.message : String(emailError)}`
      );
    }

    // Log to Google Sheet
    try {
      await appendPrayerRequest(name, email, prayerRequest, timestamp);
    } catch (sheetError) {
      errors.push(
        `Sheet: ${sheetError instanceof Error ? sheetError.message : String(sheetError)}`
      );
    }

    if (errors.length === 2) {
      return NextResponse.json(
        {
          error: "Failed to process prayer request",
          details: errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "prayer_request_received",
      submitted: true,
      timestamp,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to submit prayer request: ${message}` },
      { status: 500 }
    );
  }
}
