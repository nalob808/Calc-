/**
 * Teradek Core integration for updating stream destinations.
 *
 * This module is designed to automate Teradek Core encoder management.
 * The full implementation requires Cowork (browser automation) to interact
 * with the Teradek Core web UI. This provides an HTTP-based helper that
 * documents the automation flow and can be replaced with actual Cowork
 * integration when available.
 *
 * Uses TERADEK_CORE_URL, TERADEK_EMAIL, TERADEK_PASSWORD env vars.
 */

export interface TeradekConfig {
  coreUrl: string;
  email: string;
  password: string;
}

export interface StreamDestinationResult {
  success: boolean;
  message: string;
  timestamp: string;
  streamKey?: string;
}

/**
 * Returns Teradek Core credentials from env vars.
 */
function getTeradekConfig(): TeradekConfig {
  const coreUrl = process.env.TERADEK_CORE_URL;
  const email = process.env.TERADEK_EMAIL;
  const password = process.env.TERADEK_PASSWORD;

  if (!coreUrl || !email || !password) {
    throw new Error(
      'Missing Teradek env vars: TERADEK_CORE_URL, TERADEK_EMAIL, TERADEK_PASSWORD'
    );
  }

  return { coreUrl: coreUrl.replace(/\/+$/, ''), email, password };
}

/**
 * Updates the YouTube stream destination on the Teradek Core encoder.
 *
 * Automation flow (to be implemented with Cowork browser automation):
 * 1. Navigate to TERADEK_CORE_URL
 * 2. Log in with TERADEK_EMAIL and TERADEK_PASSWORD
 * 3. Navigate to the encoder/channel management page
 * 4. Find the active encoder (or the first available encoder)
 * 5. Open the stream destination settings
 * 6. Update the RTMP destination with:
 *    - Server URL: rtmp://a.rtmp.youtube.com/live2
 *    - Stream Key: the provided streamKey
 * 7. Save the configuration
 * 8. Verify the destination was updated successfully
 *
 * Currently logs the intended action and returns a placeholder result.
 * Replace the body of this function with Cowork automation when available.
 */
export async function updateStreamDestination(
  streamKey: string
): Promise<StreamDestinationResult> {
  const config = getTeradekConfig();

  const timestamp = new Date().toISOString();

  console.log(`[Teradek] ${timestamp} - Stream destination update requested`);
  console.log(`[Teradek] Core URL: ${config.coreUrl}`);
  console.log(`[Teradek] User: ${config.email}`);
  console.log(`[Teradek] Stream Key: ${streamKey.substring(0, 8)}...`);
  console.log(`[Teradek] Target RTMP: rtmp://a.rtmp.youtube.com/live2`);

  // --- Cowork automation placeholder ---
  // When Cowork is available, replace this block with:
  //
  // const browser = await cowork.launch();
  // const page = await browser.newPage();
  //
  // // Step 1: Login
  // await page.goto(config.coreUrl);
  // await page.fill('input[name="email"]', config.email);
  // await page.fill('input[name="password"]', config.password);
  // await page.click('button[type="submit"]');
  // await page.waitForNavigation();
  //
  // // Step 2: Navigate to encoder settings
  // await page.click('a[href*="encoder"]');
  // await page.waitForSelector('.encoder-list');
  //
  // // Step 3: Select active encoder
  // await page.click('.encoder-item.active, .encoder-item:first-child');
  //
  // // Step 4: Open destination settings
  // await page.click('button:has-text("Destinations"), a:has-text("Destinations")');
  // await page.waitForSelector('.destination-settings');
  //
  // // Step 5: Update RTMP destination
  // await page.fill('input[name="rtmpUrl"]', 'rtmp://a.rtmp.youtube.com/live2');
  // await page.fill('input[name="streamKey"]', streamKey);
  //
  // // Step 6: Save
  // await page.click('button:has-text("Save")');
  // await page.waitForSelector('.success-message');
  //
  // await browser.close();
  // --- End Cowork placeholder ---

  console.log(
    `[Teradek] NOTE: Cowork automation not yet integrated. ` +
    `Stream key must be manually entered in Teradek Core, ` +
    `or replace this function with actual Cowork browser automation.`
  );

  return {
    success: false,
    message:
      'Teradek stream destination update logged but not executed. ' +
      'Cowork browser automation integration required. ' +
      'Please manually update the stream key in Teradek Core.',
    timestamp,
    streamKey,
  };
}
