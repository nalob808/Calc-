import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const valid = verifyCredentials(username, password);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = createToken(username);

    return NextResponse.json({
      token,
      username,
      expiresIn: "24h",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}
