import { checkForBulletin, getAttachment } from './gmail';
import {
  extractBulletinData,
  getUpcomingSunday,
  compareBulletins,
  type BulletinData,
} from './bulletin';
import {
  createBroadcast,
  updateBroadcast,
  transitionBroadcast,
  getBroadcastHealth,
  addVideoToPlaylist,
  getVideoDetails,
} from './youtube';
import { updateStreamDestination } from './teradek';
import { updateLivePage } from './wordpress';
import { sendSMS } from './sms';
import { sendBulletinNotification } from './email';
import {
  getConfig,
  getCurrentService,
  updateCurrentService,
  getCurrentBulletin,
  updateCurrentBulletin,
  appendLog,
  addPrivateEvent,
  type CurrentService,
} from './data';

/**
 * Main automation orchestrator for the Kawaiahao Church streaming system.
 *
 * The automation chain:
 * Part 1-2: Gmail monitoring + bulletin extraction (runBulletinCheck)
 * Part 3:   YouTube broadcast creation
 * Part 4:   Teradek stream key update
 * Part 5:   WordPress live page update
 * Part 6:   Go-live + monitoring + auto-end
 * Part 7:   Archive to playlist
 * Part 9:   Special/private events
 */

// --- Part 1-2: Bulletin Check ---

export interface BulletinCheckResult {
  found: boolean;
  bulletinData: BulletinData | null;
  emailId: string | null;
  changes: Array<{ field: string; oldValue: string; newValue: string }>;
  message: string;
}

/**
 * Checks Gmail for new bulletin emails, extracts data from PDF attachments,
 * compares with current bulletin, and sends notification if new data found.
 */
export async function runBulletinCheck(): Promise<BulletinCheckResult> {
  await appendLog({ step: 'bulletin-check', status: 'info', details: 'Starting bulletin check' });

  try {
    const config = await getConfig();
    const senders = config.bulletinSenders;
    const keywords = config.bulletinKeywords;

    if (senders.length === 0) {
      await appendLog({
        step: 'bulletin-check',
        status: 'warning',
        details: 'No bulletin senders configured',
      });
      return {
        found: false,
        bulletinData: null,
        emailId: null,
        changes: [],
        message: 'No bulletin senders configured. Update config.json.',
      };
    }

    // Search for bulletin emails
    const matches = await checkForBulletin(senders, keywords);

    if (matches.length === 0) {
      await appendLog({
        step: 'bulletin-check',
        status: 'info',
        details: 'No new bulletin emails found',
      });
      return {
        found: false,
        bulletinData: null,
        emailId: null,
        changes: [],
        message: 'No new bulletin emails found.',
      };
    }

    // Find first email with PDF attachment
    const bulletinEmail = matches.find((m) => m.hasAttachment);

    if (!bulletinEmail) {
      await appendLog({
        step: 'bulletin-check',
        status: 'warning',
        details: 'Bulletin emails found but none had PDF attachments',
      });
      return {
        found: false,
        bulletinData: null,
        emailId: matches[0].messageId,
        changes: [],
        message: 'Bulletin email found but no PDF attachment detected.',
      };
    }

    // Download and extract PDF
    const pdfAttachment = bulletinEmail.attachments[0];
    const pdfBuffer = await getAttachment(
      bulletinEmail.messageId,
      pdfAttachment.attachmentId
    );

    const bulletinData = await extractBulletinData(pdfBuffer);

    // Compare with existing bulletin
    const existingBulletin = await getCurrentBulletin();
    const changes = existingBulletin
      ? compareBulletins(existingBulletin, bulletinData)
      : [];

    // Save new bulletin
    await updateCurrentBulletin(bulletinData);

    // Send notification
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    try {
      await sendBulletinNotification(bulletinData, dashboardUrl);
    } catch (emailError) {
      console.error('Failed to send bulletin notification email:', emailError);
    }

    // Send SMS notification
    try {
      await sendSMS(
        `New bulletin received: "${bulletinData.sermonTitle}" by ${bulletinData.pastorName} — ${bulletinData.serviceDate}. Review in dashboard.`
      );
    } catch (smsError) {
      console.error('Failed to send bulletin SMS:', smsError);
    }

    await appendLog({
      step: 'bulletin-check',
      status: 'success',
      details: `Bulletin extracted: "${bulletinData.sermonTitle}" by ${bulletinData.pastorName}`,
    });

    return {
      found: true,
      bulletinData,
      emailId: bulletinEmail.messageId,
      changes,
      message: `Bulletin found and extracted: "${bulletinData.sermonTitle}"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog({
      step: 'bulletin-check',
      status: 'error',
      details: `Bulletin check failed: ${message}`,
    });
    throw new Error(`Bulletin check failed: ${message}`);
  }
}

// --- Parts 3-5: Full Chain (YouTube + Teradek + WordPress) ---

export interface FullChainResult {
  broadcastId: string;
  streamKey: string;
  videoId: string;
  teradekUpdated: boolean;
  wordpressUpdated: boolean;
  message: string;
}

/**
 * Runs the full automation chain: creates YouTube broadcast, updates Teradek
 * stream destination, and updates the WordPress live page.
 *
 * @param bulletinData - Extracted bulletin data to use for titles/descriptions
 * @param confirmed - Whether the admin has confirmed the data (skip if true)
 */
export async function runFullChain(
  bulletinData: BulletinData,
  confirmed: boolean = false
): Promise<FullChainResult> {
  if (!confirmed) {
    throw new Error('Bulletin data must be confirmed before running the full chain.');
  }

  await appendLog({
    step: 'full-chain',
    status: 'info',
    details: 'Starting full automation chain (Parts 3-5)',
  });

  const config = await getConfig();
  const upcomingSunday = getUpcomingSunday();

  // Build broadcast title and description
  const title = bulletinData.sermonTitle
    ? `${bulletinData.sermonTitle} — Kawaia\u02BBha\u02BBo Church`
    : `Sunday Worship Service — Kawaia\u02BBha\u02BBo Church`;

  const description = [
    bulletinData.sermonTitle && `Sermon: ${bulletinData.sermonTitle}`,
    bulletinData.pastorName && `Preacher: ${bulletinData.pastorName}`,
    bulletinData.serviceDate && `Date: ${bulletinData.serviceDate}`,
    '',
    'Join us for worship at Kawaia\u02BBha\u02BBo Church.',
    '',
    bulletinData.orderOfService.length > 0 && 'Order of Service:',
    ...bulletinData.orderOfService.map((item) => `  ${item.type}: ${item.title}`),
  ]
    .filter(Boolean)
    .join('\n');

  // Set scheduled start time
  const serviceTime = bulletinData.serviceTimes[0] || config.defaultServiceTime;
  const [hours, minutes] = serviceTime.replace(/[ap]\.?m\.?/i, '').trim().split(':');
  const isPM = /pm|p\.m\./i.test(serviceTime);
  let hour = parseInt(hours, 10);
  if (isPM && hour < 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  const scheduledStart = new Date(upcomingSunday);
  scheduledStart.setHours(hour, parseInt(minutes, 10) || 0, 0, 0);

  // Part 3: Create YouTube broadcast
  let broadcastResult;
  try {
    broadcastResult = await createBroadcast(
      title,
      description,
      scheduledStart.toISOString(),
      config.defaultPrivacy
    );

    await appendLog({
      step: 'youtube-create',
      status: 'success',
      details: `Broadcast created: ${broadcastResult.broadcastId}, Video: ${broadcastResult.videoId}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'youtube-create', status: 'error', details: msg });
    throw new Error(`Part 3 (YouTube) failed: ${msg}`);
  }

  // Update current service
  await updateCurrentService({
    broadcastId: broadcastResult.broadcastId,
    streamKey: broadcastResult.streamKey,
    videoId: broadcastResult.videoId,
    title,
    description,
    scheduledStartTime: scheduledStart.toISOString(),
    status: 'scheduled',
    sermonTitle: bulletinData.sermonTitle,
    pastorName: bulletinData.pastorName,
  });

  // Part 4: Update Teradek stream destination
  let teradekUpdated = false;
  try {
    const teradekResult = await updateStreamDestination(broadcastResult.streamKey);
    teradekUpdated = teradekResult.success;

    await appendLog({
      step: 'teradek-update',
      status: teradekUpdated ? 'success' : 'warning',
      details: teradekResult.message,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'teradek-update', status: 'error', details: msg });
    // Don't throw — Teradek can be updated manually
  }

  // Part 5: Update WordPress live page
  let wordpressUpdated = false;
  try {
    await updateLivePage(
      broadcastResult.videoId,
      bulletinData.sermonTitle,
      bulletinData.pastorName
    );
    wordpressUpdated = true;

    await appendLog({
      step: 'wordpress-update',
      status: 'success',
      details: `Live page updated with video ID: ${broadcastResult.videoId}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'wordpress-update', status: 'error', details: msg });
    // Don't throw — WordPress can be updated manually
  }

  // Send SMS summary
  try {
    const statusParts = [
      `YouTube: created`,
      `Teradek: ${teradekUpdated ? 'updated' : 'needs manual update'}`,
      `WordPress: ${wordpressUpdated ? 'updated' : 'needs manual update'}`,
    ];
    await sendSMS(
      `Stream setup complete for "${bulletinData.sermonTitle}". ` +
      statusParts.join(', ') +
      `. Video: https://youtu.be/${broadcastResult.videoId}`
    );
  } catch {
    // SMS failure is not critical
  }

  return {
    broadcastId: broadcastResult.broadcastId,
    streamKey: broadcastResult.streamKey,
    videoId: broadcastResult.videoId,
    teradekUpdated,
    wordpressUpdated,
    message: 'Full chain completed.',
  };
}

// --- Part 6: Go Live ---

/**
 * Transitions a broadcast to live status.
 */
export async function goLive(broadcastId: string): Promise<void> {
  await appendLog({
    step: 'go-live',
    status: 'info',
    details: `Transitioning broadcast ${broadcastId} to live`,
  });

  try {
    // First transition to testing to verify stream is active
    const health = await getBroadcastHealth(broadcastId);

    if (health.status === 'ready' || health.status === 'testing') {
      await transitionBroadcast(broadcastId, 'live');
    } else if (health.status === 'created') {
      // Need to go through testing first
      await transitionBroadcast(broadcastId, 'testing');

      // Wait for stream to be ready (poll for up to 60 seconds)
      let attempts = 0;
      while (attempts < 12) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const currentHealth = await getBroadcastHealth(broadcastId);
        if (currentHealth.healthStatus === 'good' || currentHealth.status === 'testing') {
          break;
        }
        attempts++;
      }

      await transitionBroadcast(broadcastId, 'live');
    } else {
      await transitionBroadcast(broadcastId, 'live');
    }

    await updateCurrentService({ status: 'live' });

    await appendLog({
      step: 'go-live',
      status: 'success',
      details: `Broadcast ${broadcastId} is now live`,
    });

    try {
      await sendSMS(`Kawaia\u02BBha\u02BBo Church is now LIVE. Broadcast: ${broadcastId}`);
    } catch {
      // SMS failure is not critical
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'go-live', status: 'error', details: msg });
    throw new Error(`Go live failed: ${msg}`);
  }
}

// --- Part 6: Monitor and Auto-End ---

export interface MonitorResult {
  ended: boolean;
  reason: string;
  duration: number;
}

/**
 * Monitors a live broadcast and automatically ends it when conditions are met.
 * Checks stream health periodically and transitions to "complete" after timeout
 * or when the stream signal is lost.
 */
export async function monitorAndEndStream(
  broadcastId: string
): Promise<MonitorResult> {
  const config = await getConfig();
  const intervalMs = config.streamMonitorIntervalMs;
  const maxMinutes = config.autoEndAfterMinutes;
  const startTime = Date.now();

  await appendLog({
    step: 'monitor',
    status: 'info',
    details: `Starting stream monitor for ${broadcastId}. Auto-end after ${maxMinutes} minutes.`,
  });

  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      const elapsed = (Date.now() - startTime) / 1000 / 60;

      try {
        const health = await getBroadcastHealth(broadcastId);

        // Auto-end conditions
        if (health.status === 'complete') {
          clearInterval(timer);
          await appendLog({
            step: 'monitor',
            status: 'info',
            details: 'Broadcast already complete',
          });
          resolve({ ended: true, reason: 'Broadcast already complete', duration: elapsed });
          return;
        }

        // Stream signal lost
        if (health.healthStatus === 'noData' && elapsed > 5) {
          clearInterval(timer);
          await appendLog({
            step: 'monitor',
            status: 'warning',
            details: `Stream signal lost after ${elapsed.toFixed(1)} minutes. Ending broadcast.`,
          });

          await transitionBroadcast(broadcastId, 'complete');
          await updateCurrentService({ status: 'complete' });

          try {
            await sendSMS(
              `Stream signal lost for Kawaia\u02BBha\u02BBo broadcast. Auto-ended after ${elapsed.toFixed(0)} minutes.`
            );
          } catch {
            // SMS failure not critical
          }

          resolve({ ended: true, reason: 'Stream signal lost', duration: elapsed });
          return;
        }

        // Max duration reached
        if (elapsed >= maxMinutes) {
          clearInterval(timer);
          await appendLog({
            step: 'monitor',
            status: 'warning',
            details: `Max duration (${maxMinutes} min) reached. Ending broadcast.`,
          });

          await transitionBroadcast(broadcastId, 'complete');
          await updateCurrentService({ status: 'complete' });

          try {
            await sendSMS(
              `Kawaia\u02BBha\u02BBo broadcast auto-ended after ${maxMinutes} minutes (max duration).`
            );
          } catch {
            // SMS failure not critical
          }

          resolve({ ended: true, reason: 'Max duration reached', duration: elapsed });
          return;
        }

        // Log health check (every ~5 checks to avoid log spam)
        if (Math.random() < 0.2) {
          await appendLog({
            step: 'monitor',
            status: 'info',
            details: `Health check: status=${health.status}, health=${health.healthStatus}, elapsed=${elapsed.toFixed(1)}min`,
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Monitor health check error: ${msg}`);
      }
    }, intervalMs);
  });
}

// --- Part 7: Archive Stream ---

export interface ArchiveResult {
  videoId: string;
  playlistId: string;
  title: string;
  added: boolean;
}

/**
 * Archives a completed broadcast by adding it to the archive playlist
 * and updating its metadata.
 */
export async function archiveStream(broadcastId: string): Promise<ArchiveResult> {
  await appendLog({
    step: 'archive',
    status: 'info',
    details: `Archiving broadcast ${broadcastId}`,
  });

  try {
    const config = await getConfig();
    const service = await getCurrentService();

    if (!config.archivePlaylistId) {
      await appendLog({
        step: 'archive',
        status: 'warning',
        details: 'No archive playlist configured',
      });
      return {
        videoId: service?.videoId || broadcastId,
        playlistId: '',
        title: service?.title || '',
        added: false,
      };
    }

    const videoId = service?.videoId || broadcastId;

    // Get video details for confirmation
    const videoDetails = await getVideoDetails(videoId);

    // Add to archive playlist
    await addVideoToPlaylist(config.archivePlaylistId, videoId);

    await updateCurrentService({ status: 'complete' });

    await appendLog({
      step: 'archive',
      status: 'success',
      details: `Video "${videoDetails.title}" added to archive playlist`,
    });

    try {
      await sendSMS(
        `Stream archived: "${videoDetails.title}" added to playlist. https://youtu.be/${videoId}`
      );
    } catch {
      // SMS failure not critical
    }

    return {
      videoId,
      playlistId: config.archivePlaylistId,
      title: videoDetails.title,
      added: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'archive', status: 'error', details: msg });
    throw new Error(`Archive failed: ${msg}`);
  }
}

// --- Part 9: Special Events ---

export interface SpecialEventResult {
  eventId: string;
  broadcastId: string;
  videoId: string;
  streamKey: string;
}

/**
 * Handles creation of a special or private event broadcast.
 * Creates the YouTube broadcast, updates Teradek, and stores event data.
 */
export async function handleSpecialEvent(
  name: string,
  date: string,
  time: string,
  visibility: 'private' | 'unlisted',
  eventType: string
): Promise<SpecialEventResult> {
  await appendLog({
    step: 'special-event',
    status: 'info',
    details: `Creating special event: "${name}" (${eventType}) on ${date} at ${time}`,
  });

  try {
    // Parse the date and time
    const scheduledStart = new Date(`${date}T${time}:00`);

    if (isNaN(scheduledStart.getTime())) {
      throw new Error(`Invalid date/time: ${date} ${time}`);
    }

    const title = `${name} — Kawaia\u02BBha\u02BBo Church`;
    const description = [
      `Event: ${name}`,
      `Type: ${eventType}`,
      `Date: ${date}`,
      `Time: ${time}`,
      '',
      `Kawaia\u02BBha\u02BBo Church — ${visibility} stream`,
    ].join('\n');

    // Create the broadcast
    const broadcastResult = await createBroadcast(
      title,
      description,
      scheduledStart.toISOString(),
      visibility
    );

    // Store private event data
    const event = await addPrivateEvent({
      name,
      date,
      time,
      visibility,
      eventType,
      broadcastId: broadcastResult.broadcastId,
      videoId: broadcastResult.videoId,
      streamKey: broadcastResult.streamKey,
    });

    // Update Teradek (non-blocking)
    try {
      await updateStreamDestination(broadcastResult.streamKey);
    } catch {
      console.log('Teradek update skipped for special event — manual update needed.');
    }

    await appendLog({
      step: 'special-event',
      status: 'success',
      details: `Special event created: ${event.id}, broadcast: ${broadcastResult.broadcastId}`,
    });

    try {
      await sendSMS(
        `Special event "${name}" (${visibility}) created for ${date} at ${time}. ` +
        `Video: https://youtu.be/${broadcastResult.videoId}`
      );
    } catch {
      // SMS failure not critical
    }

    return {
      eventId: event.id,
      broadcastId: broadcastResult.broadcastId,
      videoId: broadcastResult.videoId,
      streamKey: broadcastResult.streamKey,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await appendLog({ step: 'special-event', status: 'error', details: msg });
    throw new Error(`Special event creation failed: ${msg}`);
  }
}
