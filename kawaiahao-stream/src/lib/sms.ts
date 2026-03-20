import twilio from 'twilio';

/**
 * Gets the configured Twilio client.
 */
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      'Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN'
    );
  }

  return twilio(accountSid, authToken);
}

/**
 * Sends an SMS message to the configured personal phone number.
 * Uses TWILIO_FROM_NUMBER as sender and PERSONAL_PHONE as recipient.
 */
export async function sendSMS(message: string): Promise<string> {
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.PERSONAL_PHONE;

  if (!fromNumber) {
    throw new Error('Missing TWILIO_FROM_NUMBER env var');
  }

  if (!toNumber) {
    throw new Error('Missing PERSONAL_PHONE env var');
  }

  try {
    const client = getTwilioClient();
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber,
    });

    return result.sid;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send SMS: ${msg}`);
  }
}
