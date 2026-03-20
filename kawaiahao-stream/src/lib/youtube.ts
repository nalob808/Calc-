import { google, youtube_v3 } from 'googleapis';
import { getYouTubeAuth } from './google-auth';

function getYouTubeClient(): youtube_v3.Youtube {
  const auth = getYouTubeAuth();
  return google.youtube({ version: 'v3', auth });
}

export interface BroadcastResult {
  broadcastId: string;
  streamKey: string;
  videoId: string;
}

/**
 * Creates a liveBroadcast + liveStream, binds them together.
 */
export async function createBroadcast(
  title: string,
  description: string,
  scheduledStartTime: string,
  privacy: 'public' | 'private' | 'unlisted' = 'public'
): Promise<BroadcastResult> {
  const yt = getYouTubeClient();

  try {
    // Create the broadcast
    const broadcastRes = await yt.liveBroadcasts.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: {
        snippet: {
          title,
          description,
          scheduledStartTime,
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: false,
          enableAutoStop: true,
          enableDvr: true,
          enableEmbed: true,
          recordFromStart: true,
          monitorStream: { enableMonitorStream: false },
        },
      },
    });

    const broadcastId = broadcastRes.data.id!;
    const videoId = broadcastRes.data.id!;

    // Create the stream
    const streamRes = await yt.liveStreams.insert({
      part: ['snippet', 'cdn'],
      requestBody: {
        snippet: {
          title: `${title} - Stream`,
        },
        cdn: {
          frameRate: '30fps',
          ingestionType: 'rtmp',
          resolution: '1080p',
        },
      },
    });

    const streamId = streamRes.data.id!;
    const streamKey = streamRes.data.cdn?.ingestionInfo?.streamName || '';

    // Bind broadcast to stream
    await yt.liveBroadcasts.bind({
      id: broadcastId,
      part: ['id', 'contentDetails'],
      streamId,
    });

    return { broadcastId, streamKey, videoId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create broadcast: ${message}`);
  }
}

/**
 * Updates an existing broadcast's title and description.
 */
export async function updateBroadcast(
  broadcastId: string,
  title: string,
  description: string
): Promise<void> {
  const yt = getYouTubeClient();

  try {
    await yt.liveBroadcasts.update({
      part: ['snippet'],
      requestBody: {
        id: broadcastId,
        snippet: {
          title,
          description,
          scheduledStartTime: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update broadcast ${broadcastId}: ${message}`);
  }
}

/**
 * Transitions a broadcast to a new status: 'testing', 'live', or 'complete'.
 */
export async function transitionBroadcast(
  broadcastId: string,
  status: 'testing' | 'live' | 'complete'
): Promise<void> {
  const yt = getYouTubeClient();

  try {
    await yt.liveBroadcasts.transition({
      broadcastStatus: status,
      id: broadcastId,
      part: ['status'],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to transition broadcast ${broadcastId} to ${status}: ${message}`
    );
  }
}

export interface BroadcastHealth {
  status: string;
  healthStatus: string;
  audioHealthStatus: string;
  configurationIssues: string[];
}

/**
 * Returns health status of a broadcast including stream and audio health.
 */
export async function getBroadcastHealth(
  broadcastId: string
): Promise<BroadcastHealth> {
  const yt = getYouTubeClient();

  try {
    const res = await yt.liveBroadcasts.list({
      id: [broadcastId],
      part: ['status', 'contentDetails'],
    });

    const broadcast = res.data.items?.[0];
    if (!broadcast) {
      throw new Error(`Broadcast ${broadcastId} not found`);
    }

    const streamId = broadcast.contentDetails?.boundStreamId;
    let healthStatus = 'unknown';
    let audioHealthStatus = 'unknown';
    const configurationIssues: string[] = [];

    if (streamId) {
      const streamRes = await yt.liveStreams.list({
        id: [streamId],
        part: ['status'],
      });

      const stream = streamRes.data.items?.[0];
      if (stream?.status) {
        healthStatus = stream.status.healthStatus?.status || 'unknown';
        const configIssues =
          stream.status.healthStatus?.configurationIssues || [];
        for (const issue of configIssues) {
          configurationIssues.push(
            `${issue.type}: ${issue.description} (severity: ${issue.severity})`
          );
        }
      }
    }

    return {
      status: broadcast.status?.lifeCycleStatus || 'unknown',
      healthStatus,
      audioHealthStatus,
      configurationIssues,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get broadcast health for ${broadcastId}: ${message}`
    );
  }
}

export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface ChannelVideosResult {
  videos: VideoItem[];
  nextPageToken?: string;
}

/**
 * Fetches videos from a channel for archive browsing.
 */
export async function getChannelVideos(
  channelId: string,
  maxResults: number = 25,
  pageToken?: string
): Promise<ChannelVideosResult> {
  const yt = getYouTubeClient();

  try {
    const res = await yt.search.list({
      channelId,
      part: ['snippet'],
      order: 'date',
      maxResults,
      pageToken,
      type: ['video'],
    });

    const videos: VideoItem[] = (res.data.items || []).map((item) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }));

    return {
      videos,
      nextPageToken: res.data.nextPageToken || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get channel videos for ${channelId}: ${message}`
    );
  }
}

export interface VideoDetails {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  thumbnailUrl: string;
  tags: string[];
  liveBroadcastContent: string;
}

/**
 * Fetches full details for a single video.
 */
export async function getVideoDetails(
  videoId: string
): Promise<VideoDetails> {
  const yt = getYouTubeClient();

  try {
    const res = await yt.videos.list({
      id: [videoId],
      part: ['snippet', 'contentDetails', 'statistics', 'liveStreamingDetails'],
    });

    const video = res.data.items?.[0];
    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    return {
      videoId: video.id || videoId,
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || '',
      duration: video.contentDetails?.duration || '',
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      thumbnailUrl:
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.default?.url ||
        '',
      tags: video.snippet?.tags || [],
      liveBroadcastContent: video.snippet?.liveBroadcastContent || 'none',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get video details for ${videoId}: ${message}`);
  }
}

export interface PlaylistItem {
  playlistId: string;
  title: string;
  description: string;
  itemCount: number;
  thumbnailUrl: string;
}

/**
 * Lists all playlists for a channel.
 */
export async function getPlaylists(
  channelId: string
): Promise<PlaylistItem[]> {
  const yt = getYouTubeClient();

  try {
    const res = await yt.playlists.list({
      channelId,
      part: ['snippet', 'contentDetails'],
      maxResults: 50,
    });

    return (res.data.items || []).map((item) => ({
      playlistId: item.id || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get playlists for ${channelId}: ${message}`
    );
  }
}

/**
 * Creates a new playlist.
 */
export async function createPlaylist(
  title: string,
  description: string,
  privacy: 'public' | 'private' | 'unlisted' = 'public'
): Promise<string> {
  const yt = getYouTubeClient();

  try {
    const res = await yt.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title, description },
        status: { privacyStatus: privacy },
      },
    });

    return res.data.id || '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create playlist: ${message}`);
  }
}

/**
 * Adds a video to a playlist.
 */
export async function addVideoToPlaylist(
  playlistId: string,
  videoId: string
): Promise<void> {
  const yt = getYouTubeClient();

  try {
    await yt.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to add video ${videoId} to playlist ${playlistId}: ${message}`
    );
  }
}

export interface PlaylistVideoItem {
  videoId: string;
  title: string;
  description: string;
  position: number;
  thumbnailUrl: string;
}

/**
 * Gets all videos in a playlist.
 */
export async function getPlaylistItems(
  playlistId: string
): Promise<PlaylistVideoItem[]> {
  const yt = getYouTubeClient();

  try {
    const items: PlaylistVideoItem[] = [];
    let pageToken: string | undefined;

    do {
      const res = await yt.playlistItems.list({
        playlistId,
        part: ['snippet'],
        maxResults: 50,
        pageToken,
      });

      for (const item of res.data.items || []) {
        items.push({
          videoId: item.snippet?.resourceId?.videoId || '',
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          position: item.snippet?.position || 0,
          thumbnailUrl:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.default?.url ||
            '',
        });
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get playlist items for ${playlistId}: ${message}`
    );
  }
}
