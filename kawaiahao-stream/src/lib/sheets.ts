import { google } from 'googleapis';
import { getServiceAccountAuth } from './google-auth';

/**
 * Google Sheets API integration for managing prayer request submissions.
 * Uses service account auth and GOOGLE_SHEET_ID env var.
 */

/**
 * Appends a prayer request row to the configured Google Sheet.
 * Columns: Timestamp | Name | Email | Request
 */
export async function appendPrayerRequest(
  name: string,
  email: string,
  request: string,
  timestamp: string
): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID env var');
  }

  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Prayer Requests!A:D',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[timestamp, name, email, request]],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to append prayer request to sheet: ${message}`);
  }
}
