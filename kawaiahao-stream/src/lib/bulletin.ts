// Lazy-load pdf-parse to avoid test file issue during build
function getPdfParse() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('pdf-parse');
}

export interface OrderOfServiceItem {
  type: string;
  title: string;
  leader?: string;
  hymn?: string;
}

export interface BulletinData {
  sermonTitle: string;
  pastorName: string;
  serviceDate: string;
  serviceTimes: string[];
  orderOfService: OrderOfServiceItem[];
  rawText: string;
  extractedAt: string;
}

export interface BulletinDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * Extracts structured bulletin data from a PDF buffer.
 * Parses the text content for sermon title, pastor name, order of service, etc.
 */
export async function extractBulletinData(
  pdfBuffer: Buffer
): Promise<BulletinData> {
  const pdfParse = getPdfParse();
  const parsed = await pdfParse(pdfBuffer);
  const text: string = parsed?.text || '';
  const lines = text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const sermonTitle = extractSermonTitle(lines);
  const pastorName = extractPastorName(lines);
  const serviceDate = extractServiceDate(lines);
  const serviceTimes = extractServiceTimes(lines);
  const orderOfService = extractOrderOfService(lines);

  return {
    sermonTitle,
    pastorName,
    serviceDate,
    serviceTimes,
    orderOfService,
    rawText: text,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extracts sermon title from bulletin text lines.
 */
function extractSermonTitle(lines: string[]): string {
  const sermonPatterns = [
    /sermon[:\s]*["""]?(.+?)["""]?\s*$/i,
    /message[:\s]*["""]?(.+?)["""]?\s*$/i,
    /title[:\s]*["""]?(.+?)["""]?\s*$/i,
  ];

  for (const line of lines) {
    for (const pattern of sermonPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim().replace(/["""]/g, '');
      }
    }
  }

  // Fallback: look for a line after "Sermon" keyword
  for (let i = 0; i < lines.length; i++) {
    if (/^sermon$/i.test(lines[i]) && i + 1 < lines.length) {
      return lines[i + 1].trim();
    }
  }

  return '';
}

/**
 * Extracts pastor/preacher name from bulletin text lines.
 */
function extractPastorName(lines: string[]): string {
  const pastorPatterns = [
    /(?:pastor|rev\.?|reverend|preacher|minister)[:\s]+(.+)/i,
    /(?:preaching|speaker)[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of pastorPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

/**
 * Extracts service date from bulletin text lines.
 */
function extractServiceDate(lines: string[]): string {
  const datePatterns = [
    /(\w+day,?\s+\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\w+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }

  return '';
}

/**
 * Extracts service times from bulletin text lines.
 */
function extractServiceTimes(lines: string[]): string[] {
  const times: string[] = [];
  const timePattern = /(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))/gi;

  for (const line of lines) {
    if (/service|worship|time/i.test(line)) {
      const matches = line.match(timePattern);
      if (matches) {
        times.push(...matches.map((t) => t.trim()));
      }
    }
  }

  return [...new Set(times)];
}

/**
 * Extracts order of service items from bulletin text lines.
 */
function extractOrderOfService(lines: string[]): OrderOfServiceItem[] {
  const items: OrderOfServiceItem[] = [];
  let inOrderSection = false;

  const orderKeywords = [
    'prelude',
    'call to worship',
    'invocation',
    'hymn',
    'prayer',
    'scripture',
    'anthem',
    'sermon',
    'offering',
    'doxology',
    'benediction',
    'postlude',
    'responsive reading',
    'gloria patri',
    'pastoral prayer',
    'offertory',
    'choral response',
  ];

  for (const line of lines) {
    if (/order\s+of\s+(worship|service)/i.test(line)) {
      inOrderSection = true;
      continue;
    }

    if (inOrderSection || orderKeywords.some((k) => line.toLowerCase().includes(k))) {
      const lowerLine = line.toLowerCase();
      const matchedKeyword = orderKeywords.find((k) => lowerLine.includes(k));

      if (matchedKeyword) {
        const item: OrderOfServiceItem = {
          type: matchedKeyword,
          title: line.trim(),
        };

        // Try to extract hymn number
        const hymnMatch = line.match(/(?:hymn|#)\s*(\d+)/i);
        if (hymnMatch) {
          item.hymn = hymnMatch[1];
        }

        // Try to extract leader name after a dash or comma
        const leaderMatch = line.match(/[-–—,]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
        if (leaderMatch) {
          item.leader = leaderMatch[1].trim();
        }

        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Checks if an email subject and body match bulletin criteria keywords.
 */
export function matchesBulletinCriteria(
  emailSubject: string,
  emailBody: string,
  keywords: string[]
): boolean {
  const combined = `${emailSubject} ${emailBody}`.toLowerCase();
  return keywords.some((keyword) => combined.includes(keyword.toLowerCase()));
}

/**
 * Returns the next Sunday date from today (or today if it is Sunday).
 */
export function getUpcomingSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
}

/**
 * Compares two bulletin data objects and returns a list of changed fields.
 */
export function compareBulletins(
  oldBulletin: BulletinData,
  newBulletin: BulletinData
): BulletinDiff[] {
  const diffs: BulletinDiff[] = [];

  if (oldBulletin.sermonTitle !== newBulletin.sermonTitle) {
    diffs.push({
      field: 'sermonTitle',
      oldValue: oldBulletin.sermonTitle,
      newValue: newBulletin.sermonTitle,
    });
  }

  if (oldBulletin.pastorName !== newBulletin.pastorName) {
    diffs.push({
      field: 'pastorName',
      oldValue: oldBulletin.pastorName,
      newValue: newBulletin.pastorName,
    });
  }

  if (oldBulletin.serviceDate !== newBulletin.serviceDate) {
    diffs.push({
      field: 'serviceDate',
      oldValue: oldBulletin.serviceDate,
      newValue: newBulletin.serviceDate,
    });
  }

  if (
    JSON.stringify(oldBulletin.serviceTimes) !==
    JSON.stringify(newBulletin.serviceTimes)
  ) {
    diffs.push({
      field: 'serviceTimes',
      oldValue: oldBulletin.serviceTimes.join(', '),
      newValue: newBulletin.serviceTimes.join(', '),
    });
  }

  if (
    JSON.stringify(oldBulletin.orderOfService) !==
    JSON.stringify(newBulletin.orderOfService)
  ) {
    diffs.push({
      field: 'orderOfService',
      oldValue: `${oldBulletin.orderOfService.length} items`,
      newValue: `${newBulletin.orderOfService.length} items`,
    });
  }

  return diffs;
}
