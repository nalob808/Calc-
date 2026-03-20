# Kawaiahao Church — Livestream Automation System

End-to-end church livestream automation for Kawaiahao Church (Honolulu, HI). Monitors Gmail for bulletins, creates YouTube Live events, updates Teradek Core stream destinations, manages WordPress live page embeds, and auto-manages Sunday broadcasts.

## Architecture

```
Gmail (bulletin PDF) → Extract sermon data → User confirms
  → YouTube Data API (create broadcast)
  → Cowork → Teradek Core (update stream key)
  → WordPress REST API (update live page embed)
  → Sunday 9:15 AM: YouTube API starts broadcast
  → After 11:00 AM: Auto-end on silence detection
  → Post-stream: Auto-archive
```

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd kawaiahao-stream
npm install

# 2. Configure environment
cp .env.example .env
# Fill in all values (see Environment Variables below)

# 3. Run OAuth consent flow (first time only)
npm run setup

# 4. Development
npm run dev

# 5. Deploy
vercel deploy --prod
```

## Google Cloud Project Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Name it `kawaiahao-stream` and create
4. Note your **Project ID**

### Step 2: Enable APIs

In the Google Cloud Console, navigate to **APIs & Services → Library** and enable:

1. **YouTube Data API v3** — for live broadcasts, streams, playlists, video management
2. **Gmail API** — for monitoring inbox and downloading bulletin PDFs
3. **Google Sheets API** — for logging prayer requests

### Step 3: Create OAuth 2.0 Credentials (YouTube + Gmail)

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Kawaiahao Stream`
5. Authorized redirect URIs: add `http://localhost:3000/api/auth/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** to your `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. User Type: **External** (or Internal if using Workspace)
3. Fill in app name: `Kawaiahao Stream`
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube` (YouTube full access)
   - `https://www.googleapis.com/auth/gmail.readonly` (Gmail read)
5. Add your Google account as a test user

### Step 5: Get Refresh Tokens

Run the first-time setup to open the OAuth consent flow in your browser:

```bash
npm run setup
```

This will:
1. Open a browser window for YouTube permissions — approve and it saves `YOUTUBE_REFRESH_TOKEN`
2. Open a browser window for Gmail permissions — approve and it saves `GMAIL_REFRESH_TOKEN`
3. Write both tokens to your `.env` file

### Step 6: Create Service Account (Google Sheets)

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Name: `kawaiahao-sheets`
4. Grant role: **Editor**
5. Click on the service account → **Keys → Add Key → JSON**
6. Download the JSON key file
7. Copy the entire JSON content into your `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
   ```
8. Share your Google Sheet with the service account email (found in the JSON)

### Step 7: Create the Prayer Request Sheet

1. Create a new Google Sheet
2. Name it `Kawaiahao Prayer Requests`
3. Add headers in Row 1: `Timestamp | Name | Email | Request`
4. Share the sheet with your service account email (Editor access)
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
6. Add to `.env`: `GOOGLE_SHEET_ID=your-sheet-id`

## Other Service Setup

### Twilio (SMS Notifications)

1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get a phone number
3. Copy credentials to `.env`:
   ```
   TWILIO_ACCOUNT_SID=your-sid
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_FROM_NUMBER=+1234567890
   PERSONAL_PHONE=+1808XXXXXXX
   ```

### WordPress (Live Page)

1. In WordPress admin, go to **Users → Your Profile**
2. Scroll to **Application Passwords**
3. Create a new application password named `kawaiahao-stream`
4. Copy credentials to `.env`:
   ```
   WP_URL=https://kawaiahao.org
   WP_USER=your-username
   WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### Teradek Core

Teradek Core credentials are used by Cowork browser automation:
```
TERADEK_CORE_URL=https://core.teradek.com
TERADEK_EMAIL=your-email
TERADEK_PASSWORD=your-password
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `YOUTUBE_REFRESH_TOKEN` | YouTube OAuth refresh token | Yes |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token | Yes |
| `YOUTUBE_CHANNEL_ID` | YouTube channel ID | Yes |
| `WP_URL` | WordPress site URL | Yes |
| `WP_USER` | WordPress username | Yes |
| `WP_APP_PASSWORD` | WordPress app password | Yes |
| `TERADEK_CORE_URL` | Teradek Core dashboard URL | Yes |
| `TERADEK_EMAIL` | Teradek login email | Yes |
| `TERADEK_PASSWORD` | Teradek login password | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes |
| `TWILIO_FROM_NUMBER` | Twilio sender phone number | Yes |
| `PERSONAL_PHONE` | Your phone for SMS alerts | Yes |
| `PERSONAL_EMAIL` | Your email for notifications | Yes |
| `ADMIN_USERNAME` | Dashboard login username | Yes |
| `ADMIN_PASSWORD` | Dashboard login password | Yes |
| `JWT_SECRET` | JWT signing secret | No (defaults to ADMIN_PASSWORD) |
| `PRAYER_REQUEST_EMAIL` | Email for prayer requests | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `GOOGLE_SHEET_ID` | Prayer request sheet ID | Yes |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON | Yes |
| `CRON_SECRET` | Secret token for cron endpoints | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set all environment variables in Vercel dashboard
4. Deploy

Vercel cron jobs are configured in `vercel.json`:
- Bulletin check: every 15 minutes
- Go-live trigger: Sunday 9:14 AM UTC (9:14 PM HST Saturday → converts to 9:15 AM HST Sunday)
- Stream monitor: every minute during Sunday service window

## Project Structure

```
kawaiahao-stream/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage with live embed
│   │   ├── sermons/page.tsx      # Sermon archive
│   │   ├── prayer/page.tsx       # Prayer request form
│   │   ├── admin/
│   │   │   ├── page.tsx          # Admin dashboard
│   │   │   └── login/page.tsx    # Admin login
│   │   └── api/
│   │       ├── auth/             # Authentication
│   │       ├── gmail/            # Gmail monitoring
│   │       ├── youtube/          # YouTube API
│   │       ├── teradek/          # Teradek Core
│   │       ├── wordpress/        # WordPress API
│   │       ├── prayer/           # Prayer requests
│   │       ├── automation/       # Automation chain
│   │       ├── events/           # Special events
│   │       ├── dashboard/        # Dashboard data
│   │       └── cron/             # Scheduled jobs
│   ├── lib/
│   │   ├── google-auth.ts        # Google OAuth helpers
│   │   ├── youtube.ts            # YouTube Data API
│   │   ├── gmail.ts              # Gmail API
│   │   ├── bulletin.ts           # PDF extraction
│   │   ├── sms.ts                # Twilio SMS
│   │   ├── email.ts              # Nodemailer
│   │   ├── wordpress.ts          # WordPress REST API
│   │   ├── teradek.ts            # Teradek Core
│   │   ├── data.ts               # Data file management
│   │   ├── sheets.ts             # Google Sheets API
│   │   ├── auth.ts               # JWT auth
│   │   └── automation.ts         # Orchestration
│   └── components/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── VideoCard.tsx
│       ├── VideoModal.tsx
│       ├── FilterBar.tsx
│       └── StatusIndicator.tsx
├── data/
│   ├── config.json
│   ├── current-service.json
│   ├── current-bulletin.json
│   ├── private-events.json
│   ├── automation-log.json
│   ├── event-tags.json
│   └── bulletin-schema.md
├── vercel.json
├── .env.example
└── package.json
```

## How It Works

### Weekly Automation Flow

1. **Thursday–Saturday**: Gmail API monitors inbox every 15 min for bulletin PDF
2. **Detection**: Multi-signal matching (sender, PDF attachment, Sunday date, keywords)
3. **Extraction**: Parses sermon title, pastor, order of service from PDF
4. **Notification**: SMS + email + dashboard preview sent to admin
5. **Confirmation**: Admin reviews and confirms in dashboard
6. **YouTube**: Creates live broadcast with sermon details
7. **Teradek**: Updates stream destination with new stream key
8. **WordPress**: Updates live page embed URL
9. **Sunday 9:15 AM**: Broadcast transitions to live
10. **After 11:00 AM**: Monitors audio, auto-ends after 5 min silence
11. **Post-stream**: Archives video, updates records, sends confirmation

### Change Detection

If a revised bulletin arrives before Saturday noon, the system:
- Compares new data against current service
- Sends SMS alert with specific changes
- Waits for explicit confirmation before pushing updates
- Updates YouTube broadcast (no duplicate created)

### Special Events

Admin can create one-off events (memorials, concerts) via dashboard form.
Full automation chain runs with custom title, time, and visibility settings.
