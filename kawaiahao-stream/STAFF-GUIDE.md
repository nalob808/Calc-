# Kawaiahao Church — Staff Guide

Everything you need to know about the livestream automation system.

## What Happens Automatically

**You don't need to do anything for a normal Sunday service.** The system handles everything:

1. Watches for the bulletin email (Thursday–Saturday)
2. Reads the sermon title and pastor name from the PDF
3. Sets up YouTube Live with the right title and description
4. Points the Teradek encoder to the new stream
5. Updates the website's live page
6. Starts the stream at 9:15 AM Sunday
7. Ends the stream when the service is over
8. Archives the video on the YouTube channel

You'll get a text message at each major step so you always know what's happening.

## Text Message Confirmations

You'll receive SMS messages at key points. Here's what they look like and how to respond:

### Bulletin Found
```
Bulletin found for March 23. Sermon: "Walking in Grace" — Pastor Keola.
Review: https://your-dashboard-url/admin
```
**What to do:** Tap the link to review the details in the dashboard. Click "Confirm" if everything looks right.

### Bulletin Update Detected
```
Bulletin update detected. Changed: sermon title, pastor name.
Push updates to YouTube, Teradek, WordPress? Reply YES or tap: https://your-dashboard-url/admin
```
**What to do:** Reply **YES** to push the updates, or tap the link to review first.

### Ambiguous Bulletin
```
Found a possible bulletin from office@kawaiahao.org but couldn't confirm the date.
Here's what I found: [summary]. Is this right? Reply YES or NO.
```
**What to do:** Reply **YES** if it's the right bulletin, **NO** if it's not.

### Stream Is Live
```
Stream is live.
```
**What to do:** Nothing needed. Just confirmation that everything is working.

### Stream Ended
```
Stream ended. Archiving now.
```
**What to do:** Nothing needed.

### Stream Still Running (Safety Alert)
```
Stream still running at 2pm. End it now?
```
**What to do:** This means the auto-end didn't trigger. Tap the dashboard link to end the stream manually, or reply YES to end it.

### Archived
```
Archived: "Walking in Grace" — https://youtube.com/watch?v=xxxxx
```
**What to do:** Nothing needed. The video is live on YouTube.

## Using the Admin Dashboard

### Logging In

1. Go to your dashboard URL (e.g., `https://stream.kawaiahao.org/admin`)
2. Enter your username and password
3. You'll see the main dashboard

### Live Tab

This shows what's currently live on the website.

- **Current embed URL**: The YouTube video currently on the live page
- **Manual override**: If you need to quickly swap in a different YouTube URL, paste it here and click "Push Live"
- **Pipeline status**: Green checkmarks show which steps completed successfully

### This Week's Service Tab

Shows all the details for this Sunday's service.

- **Edit fields**: Click on any field (sermon title, pastor, etc.) to edit it
- **Order of service**: Preview of what was extracted from the bulletin
- **Action buttons**: Re-run any step individually if something needs updating

### Archive Tab

Manage the sermon archive.

- Videos pull directly from YouTube — nothing to maintain
- **Toggle event type**: Change a video's category tag
- **Add manually**: Paste a YouTube video ID to add a video that wasn't streamed through the system
- **Private events**: See unlisted videos and get shareable links

### Special Events Tab

Create a one-off event (memorial, concert, etc.).

1. Fill in: event name, date, time
2. Choose: **Public** (visible to everyone) or **Unlisted** (only accessible via direct link)
3. Select event type: Memorial, Concert, Special Event
4. Click **Create Event**
5. Watch the status indicators as each step completes

### Log Tab

See everything the system has done, with timestamps and status codes. Useful for troubleshooting.

## Creating a Special Event

Example: A memorial service for the Kahananui family.

1. Go to **Dashboard → Special Events**
2. Event name: `Memorial Service — Kahananui Family`
3. Date: March 28, 2026
4. Time: 2:00 PM
5. Visibility: **Unlisted** (family only)
6. Event type: **Memorial**
7. Click **Create Event**
8. Wait for all steps to complete (about 30 seconds)
9. You'll get a confirmation SMS with the YouTube link

## Sharing a Private Event Link

For unlisted events (memorials, private ceremonies):

1. Go to **Dashboard → Archive → Private Events**
2. Find the event in the list
3. Click the YouTube link — this is the direct URL
4. Share this link with the family or attendees
5. Only people with the link can watch — it won't appear in search or on the channel

## What to Do If Something Fails

### Bulletin wasn't detected
- Go to **Dashboard → Live → Re-trigger Gmail Check**
- Or manually enter the sermon details in **This Week's Service**

### YouTube event wasn't created
- Go to **Dashboard → This Week's Service**
- Fill in the sermon title and pastor name
- Click **Create YouTube Event**

### Teradek wasn't updated
- Go to **Dashboard → Live → Re-trigger Teradek**
- Or log into Teradek Core manually and update the stream key

### WordPress wasn't updated
- Go to **Dashboard → Live → Re-trigger WordPress**
- Or use the **Manual Override** to paste the YouTube URL directly

### Stream didn't start at 9:15
- Go to **Dashboard → Live → Go Live Now**
- Or go to YouTube Studio and start the broadcast manually

### Stream didn't auto-end
- Go to **Dashboard → Live → End Stream**
- Or go to YouTube Studio and end the broadcast manually

### Nothing is working
- Check the **Log tab** for error messages
- Make sure all environment variables are set correctly in Vercel
- Check that Google API tokens haven't expired (re-run `npm run setup` if needed)

## Weekly Checklist (Optional)

While the system is fully automatic, you may want to:

- [ ] **Thursday afternoon**: Check your phone for the bulletin detection SMS
- [ ] **Friday/Saturday**: Review the dashboard to confirm everything looks right
- [ ] **Sunday 9:10 AM**: Glance at dashboard to confirm "Go Live" is scheduled
- [ ] **Sunday 9:20 AM**: Check that the stream is live on YouTube
- [ ] **Sunday after service**: Confirm you got the "archived" SMS

## Contact

If you need help with the system, contact your tech administrator.
