/**
 * First-time OAuth setup script.
 * Opens browser for YouTube and Gmail consent flows,
 * then saves refresh tokens to .env file.
 *
 * Usage: npm run setup
 */

import { google } from "googleapis";
import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";

const SCOPES_YOUTUBE = ["https://www.googleapis.com/auth/youtube"];
const SCOPES_GMAIL = ["https://www.googleapis.com/auth/gmail.readonly"];
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

function loadEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env");
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
  }
  return env;
}

function saveEnv(env: Record<string, string>): void {
  const envPath = path.join(process.cwd(), ".env");
  let content = "";
  for (const [key, value] of Object.entries(env)) {
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content);
  console.log("Saved to .env");
}

async function getRefreshToken(
  clientId: string,
  clientSecret: string,
  scopes: string[],
  label: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });

    console.log(`\n--- ${label} ---`);
    console.log(`Open this URL in your browser:\n${authUrl}\n`);

    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) return;

      const query = url.parse(req.url, true).query;
      const code = query.code as string;

      if (!code) {
        res.writeHead(400);
        res.end("No authorization code received.");
        server.close();
        reject(new Error("No code received"));
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<h1>${label} authorized!</h1><p>You can close this tab.</p>`);
        server.close();
        resolve(tokens.refresh_token || "");
      } catch (err) {
        res.writeHead(500);
        res.end("Error exchanging code for tokens.");
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Waiting for ${label} authorization on port ${REDIRECT_PORT}...`);
    });
  });
}

async function main() {
  console.log("Kawaiahao Stream — OAuth Setup\n");

  const env = loadEnv();
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
    console.error("1. Copy .env.example to .env");
    console.error("2. Fill in your Google OAuth client ID and secret");
    console.error("3. Run this script again");
    process.exit(1);
  }

  // YouTube
  const ytToken = await getRefreshToken(clientId, clientSecret, SCOPES_YOUTUBE, "YouTube");
  if (ytToken) {
    env.YOUTUBE_REFRESH_TOKEN = ytToken;
    console.log("YouTube refresh token saved.");
  }

  // Gmail
  const gmailToken = await getRefreshToken(clientId, clientSecret, SCOPES_GMAIL, "Gmail");
  if (gmailToken) {
    env.GMAIL_REFRESH_TOKEN = gmailToken;
    console.log("Gmail refresh token saved.");
  }

  saveEnv(env);
  console.log("\nSetup complete! You can now run: npm run dev");
}

main().catch(console.error);
