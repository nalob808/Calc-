import { google, gmail_v1 } from 'googleapis';
import { getGmailAuth } from './google-auth';

function getGmailClient(): gmail_v1.Gmail {
  const auth = getGmailAuth();
  return google.gmail({ version: 'v1', auth });
}

export interface MessageHeader {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
}

export interface FullMessage extends MessageHeader {
  body: string;
  htmlBody: string;
  attachments: AttachmentMeta[];
}

export interface AttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Extracts headers from a Gmail message payload.
 */
function extractHeaders(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers || []) {
    if (h.name && h.value) {
      map[h.name.toLowerCase()] = h.value;
    }
  }
  return map;
}

/**
 * Decodes base64url-encoded body content.
 */
function decodeBody(encoded: string | undefined | null): string {
  if (!encoded) return '';
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Recursively extracts body text and HTML from message parts.
 */
function extractParts(
  parts: gmail_v1.Schema$MessagePart[] | undefined,
  result: { text: string; html: string; attachments: AttachmentMeta[] }
): void {
  for (const part of parts || []) {
    const mimeType = part.mimeType || '';

    if (mimeType === 'text/plain' && part.body?.data) {
      result.text += decodeBody(part.body.data);
    } else if (mimeType === 'text/html' && part.body?.data) {
      result.html += decodeBody(part.body.data);
    }

    if (part.filename && part.body?.attachmentId) {
      result.attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType,
        size: part.body.size || 0,
      });
    }

    if (part.parts) {
      extractParts(part.parts, result);
    }
  }
}

/**
 * Searches Gmail messages matching a query string.
 */
export async function listMessages(
  query: string,
  maxResults: number = 10
): Promise<MessageHeader[]> {
  const gmail = getGmailClient();

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages: MessageHeader[] = [];

    for (const msg of res.data.messages || []) {
      if (!msg.id) continue;

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date'],
      });

      const headers = extractHeaders(detail.data.payload?.headers);

      messages.push({
        messageId: msg.id,
        threadId: msg.threadId || '',
        subject: headers['subject'] || '',
        from: headers['from'] || '',
        to: headers['to'] || '',
        date: headers['date'] || '',
        snippet: detail.data.snippet || '',
      });
    }

    return messages;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list messages: ${message}`);
  }
}

/**
 * Gets the full content of a message including body and attachment metadata.
 */
export async function getMessage(messageId: string): Promise<FullMessage> {
  const gmail = getGmailClient();

  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = extractHeaders(res.data.payload?.headers);
    const result = { text: '', html: '', attachments: [] as AttachmentMeta[] };

    // Single-part message
    if (res.data.payload?.body?.data) {
      const mimeType = res.data.payload.mimeType || '';
      if (mimeType === 'text/html') {
        result.html = decodeBody(res.data.payload.body.data);
      } else {
        result.text = decodeBody(res.data.payload.body.data);
      }
    }

    // Multi-part message
    if (res.data.payload?.parts) {
      extractParts(res.data.payload.parts, result);
    }

    return {
      messageId,
      threadId: res.data.threadId || '',
      subject: headers['subject'] || '',
      from: headers['from'] || '',
      to: headers['to'] || '',
      date: headers['date'] || '',
      snippet: res.data.snippet || '',
      body: result.text,
      htmlBody: result.html,
      attachments: result.attachments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get message ${messageId}: ${message}`);
  }
}

/**
 * Downloads an attachment and returns the raw Buffer.
 */
export async function getAttachment(
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const gmail = getGmailClient();

  try {
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    const data = res.data.data || '';
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to get attachment ${attachmentId} from message ${messageId}: ${message}`
    );
  }
}

export interface BulletinEmailMatch {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  hasAttachment: boolean;
  attachments: AttachmentMeta[];
}

/**
 * Searches for emails matching bulletin criteria from specific senders
 * containing specific keywords.
 */
export async function checkForBulletin(
  senders: string[],
  keywords: string[]
): Promise<BulletinEmailMatch[]> {
  const senderQuery = senders.map((s) => `from:${s}`).join(' OR ');
  const keywordQuery = keywords.map((k) => `"${k}"`).join(' OR ');
  const query = `(${senderQuery}) (${keywordQuery}) newer_than:7d`;

  try {
    const headers = await listMessages(query, 10);
    const matches: BulletinEmailMatch[] = [];

    for (const header of headers) {
      const full = await getMessage(header.messageId);
      const pdfAttachments = full.attachments.filter(
        (a) =>
          a.mimeType === 'application/pdf' ||
          a.filename.toLowerCase().endsWith('.pdf')
      );

      matches.push({
        messageId: header.messageId,
        subject: header.subject,
        from: header.from,
        date: header.date,
        snippet: header.snippet,
        hasAttachment: pdfAttachments.length > 0,
        attachments: pdfAttachments,
      });
    }

    return matches;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check for bulletin: ${message}`);
  }
}
