/**
 * WordPress REST API integration for updating the live streaming page.
 * Uses basic auth with WP_URL, WP_USER, WP_APP_PASSWORD env vars.
 */

export interface LivePageContent {
  id: number;
  title: string;
  content: string;
  modified: string;
}

/**
 * Returns WordPress credentials and base URL from env vars.
 */
function getWPConfig() {
  const wpUrl = process.env.WP_URL;
  const wpUser = process.env.WP_USER;
  const wpAppPassword = process.env.WP_APP_PASSWORD;

  if (!wpUrl || !wpUser || !wpAppPassword) {
    throw new Error('Missing WordPress env vars: WP_URL, WP_USER, WP_APP_PASSWORD');
  }

  const authHeader =
    'Basic ' + Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64');

  return { wpUrl: wpUrl.replace(/\/+$/, ''), authHeader };
}

/**
 * Updates the live streaming page with a YouTube embed and service details.
 * Finds the live page by slug (configurable via WP_LIVE_PAGE_SLUG, defaults to "live").
 */
export async function updateLivePage(
  youtubeVideoId: string,
  sermonTitle: string,
  pastorName: string
): Promise<void> {
  const { wpUrl, authHeader } = getWPConfig();
  const pageSlug = process.env.WP_LIVE_PAGE_SLUG || 'live';

  try {
    // Find the live page by slug
    const searchRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(pageSlug)}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!searchRes.ok) {
      throw new Error(`Failed to search for live page: ${searchRes.status} ${searchRes.statusText}`);
    }

    const pages = (await searchRes.json()) as Array<{ id: number }>;

    if (pages.length === 0) {
      throw new Error(`Live page with slug "${pageSlug}" not found`);
    }

    const pageId = pages[0].id;

    // Build the updated content with YouTube embed
    const content = `
<!-- wp:html -->
<div class="live-stream-container" style="background-color: #0a0a0a; padding: 24px 0;">
  <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; overflow: hidden;">
    <iframe
      src="https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  </div>
  <div style="text-align: center; margin-top: 24px; font-family: 'DM Sans', sans-serif;">
    <h2 style="font-family: 'Playfair Display', serif; color: #c9972b; font-size: 28px; margin: 0 0 8px;">
      ${sermonTitle}
    </h2>
    <p style="color: #e0e0e0; font-size: 16px; margin: 0;">
      ${pastorName}
    </p>
  </div>
</div>
<!-- /wp:html -->
    `.trim();

    // Update the page
    const updateRes = await fetch(
      `${wpUrl}/wp-json/wp/v2/pages/${pageId}`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`Failed to update live page: ${updateRes.status} ${updateRes.statusText}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`WordPress updateLivePage failed: ${message}`);
  }
}

/**
 * Fetches the current content of the live streaming page.
 */
export async function getLivePage(): Promise<LivePageContent> {
  const { wpUrl, authHeader } = getWPConfig();
  const pageSlug = process.env.WP_LIVE_PAGE_SLUG || 'live';

  try {
    const res = await fetch(
      `${wpUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(pageSlug)}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch live page: ${res.status} ${res.statusText}`);
    }

    const pages = (await res.json()) as Array<{
      id: number;
      title: { rendered: string };
      content: { rendered: string };
      modified: string;
    }>;

    if (pages.length === 0) {
      throw new Error(`Live page with slug "${pageSlug}" not found`);
    }

    const page = pages[0];

    return {
      id: page.id,
      title: page.title.rendered,
      content: page.content.rendered,
      modified: page.modified,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`WordPress getLivePage failed: ${message}`);
  }
}
