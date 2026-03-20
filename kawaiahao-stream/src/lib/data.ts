import { promises as fs } from 'fs';
import path from 'path';
import type { BulletinData } from './bulletin';

/**
 * Data file management for the Kawaiahao streaming automation system.
 * All data files are stored in the /data/ directory at the project root.
 */

const DATA_DIR = path.join(process.cwd(), 'data');

// --- Generic JSON helpers ---

/**
 * Reads and parses a JSON file from the /data/ directory.
 * Returns null if the file does not exist.
 */
export async function readJSON<T = unknown>(filename: string): Promise<T | null> {
  const filePath = path.join(DATA_DIR, filename);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${filename}: ${message}`);
  }
}

/**
 * Writes data as formatted JSON to a file in the /data/ directory.
 * Creates the /data/ directory if it doesn't exist.
 */
export async function writeJSON<T = unknown>(
  filename: string,
  data: T
): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write ${filename}: ${message}`);
  }
}

// --- Current Service ---

export interface CurrentService {
  broadcastId: string;
  streamKey: string;
  videoId: string;
  title: string;
  description: string;
  scheduledStartTime: string;
  status: 'scheduled' | 'testing' | 'live' | 'complete' | 'idle';
  sermonTitle: string;
  pastorName: string;
  createdAt: string;
  updatedAt: string;
}

const CURRENT_SERVICE_FILE = 'current-service.json';

/**
 * Gets the current service data. Returns null if no service is active.
 */
export async function getCurrentService(): Promise<CurrentService | null> {
  return readJSON<CurrentService>(CURRENT_SERVICE_FILE);
}

/**
 * Updates the current service data, merging with existing data.
 */
export async function updateCurrentService(
  data: Partial<CurrentService>
): Promise<CurrentService> {
  const existing = await getCurrentService();
  const updated: CurrentService = {
    broadcastId: '',
    streamKey: '',
    videoId: '',
    title: '',
    description: '',
    scheduledStartTime: '',
    status: 'idle',
    sermonTitle: '',
    pastorName: '',
    createdAt: new Date().toISOString(),
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await writeJSON(CURRENT_SERVICE_FILE, updated);
  return updated;
}

// --- Automation Log ---

export interface LogEntry {
  timestamp: string;
  step: string;
  status: 'success' | 'error' | 'info' | 'warning';
  details: string;
}

const AUTOMATION_LOG_FILE = 'automation-log.json';

/**
 * Gets the full automation log.
 */
export async function getAutomationLog(): Promise<LogEntry[]> {
  const log = await readJSON<LogEntry[]>(AUTOMATION_LOG_FILE);
  return log || [];
}

/**
 * Appends a new entry to the automation log.
 */
export async function appendLog(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
  const log = await getAutomationLog();
  log.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 500 entries to avoid unbounded growth
  const trimmed = log.slice(-500);
  await writeJSON(AUTOMATION_LOG_FILE, trimmed);
}

// --- Private Events ---

export interface PrivateEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  visibility: 'private' | 'unlisted';
  eventType: string;
  broadcastId?: string;
  videoId?: string;
  streamKey?: string;
  status: 'scheduled' | 'live' | 'complete';
  createdAt: string;
}

const PRIVATE_EVENTS_FILE = 'private-events.json';

/**
 * Gets all private events.
 */
export async function getPrivateEvents(): Promise<PrivateEvent[]> {
  const events = await readJSON<PrivateEvent[]>(PRIVATE_EVENTS_FILE);
  return events || [];
}

/**
 * Adds a new private event.
 */
export async function addPrivateEvent(
  event: Omit<PrivateEvent, 'id' | 'createdAt' | 'status'>
): Promise<PrivateEvent> {
  const events = await getPrivateEvents();
  const newEvent: PrivateEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  events.push(newEvent);
  await writeJSON(PRIVATE_EVENTS_FILE, events);
  return newEvent;
}

// --- Config ---

export interface AppConfig {
  channelId: string;
  defaultPrivacy: 'public' | 'private' | 'unlisted';
  bulletinSenders: string[];
  bulletinKeywords: string[];
  defaultServiceTime: string;
  streamMonitorIntervalMs: number;
  autoEndAfterMinutes: number;
  archivePlaylistId: string;
}

const CONFIG_FILE = 'config.json';

/**
 * Reads the application config. Returns sensible defaults if config.json doesn't exist.
 */
export async function getConfig(): Promise<AppConfig> {
  const config = await readJSON<AppConfig>(CONFIG_FILE);

  return {
    channelId: '',
    defaultPrivacy: 'public',
    bulletinSenders: [],
    bulletinKeywords: ['bulletin', 'order of worship', 'order of service', 'sunday service'],
    defaultServiceTime: '09:00',
    streamMonitorIntervalMs: 30000,
    autoEndAfterMinutes: 120,
    archivePlaylistId: '',
    ...config,
  };
}

// --- Current Bulletin ---

const CURRENT_BULLETIN_FILE = 'current-bulletin.json';

/**
 * Gets the current bulletin data.
 */
export async function getCurrentBulletin(): Promise<BulletinData | null> {
  return readJSON<BulletinData>(CURRENT_BULLETIN_FILE);
}

/**
 * Updates the current bulletin data.
 */
export async function updateCurrentBulletin(data: BulletinData): Promise<void> {
  await writeJSON(CURRENT_BULLETIN_FILE, data);
}
