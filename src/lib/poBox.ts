import { POBOX_EMAILJS, POBOX_RATE_LIMIT_HOURS } from './data';

// PO Box idea submission. The app has no backend, so delivery is client-side via
// EmailJS and the anti-spam guards are best-effort (a determined abuser can clear
// storage, go incognito, or switch networks). See TECHNICAL.md for the model and
// its limits. The pure helpers below are unit-tested; the network ones aren't.

const RATE_KEY = 'pobox_last_submit';
const HOUR_MS = 60 * 60 * 1000;

export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;

// A real person spends seconds reading/typing; bots tend to submit the instant
// the form mounts. Anything faster than this is rejected.
export const MIN_DWELL_MS = 3000;

// Trusted wall-clock sources, tried in order — we deliberately do NOT trust the
// device clock for the daily window (it is user-settable, which would let anyone
// reset the limit by changing their time). CSP connect-src allows these origins.
const TIME_ENDPOINTS: { url: string; read: (json: any) => number }[] = [
  { url: 'https://timeapi.io/api/Time/current/zone?timeZone=Etc/UTC', read: (j) => Date.parse(j.dateTime + 'Z') },
  { url: 'https://worldtimeapi.org/api/timezone/Etc/UTC', read: (j) => j.unixtime * 1000 },
];

const IP_ENDPOINT = 'https://api.ipify.org?format=json';
const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

export interface IdeaDraft {
  title: string;
  description: string;
  honeypot: string;
  dwellMs: number;
}

export type Validation = { ok: true } | { ok: false; reason: string };

export function validateIdea(draft: IdeaDraft): Validation {
  if (draft.honeypot.trim() !== '') {
    return { ok: false, reason: 'Spam check failed.' };
  }
  if (draft.dwellMs < MIN_DWELL_MS) {
    return { ok: false, reason: 'That was a little too quick — take a moment and try again.' };
  }

  const title = draft.title.trim();
  const description = draft.description.trim();
  if (!title) {
    return { ok: false, reason: 'Give your idea a title.' };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, reason: `Keep the title under ${TITLE_MAX} characters.` };
  }
  if (description.length < DESCRIPTION_MIN) {
    return { ok: false, reason: `Add a little more detail (at least ${DESCRIPTION_MIN} characters).` };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, reason: `Keep the description under ${DESCRIPTION_MAX} characters.` };
  }
  return { ok: true };
}

export interface RateRecord {
  atMs: number;
  ip: string | null;
}

export function readRateRecord(): RateRecord | null {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed?.atMs !== 'number' || !Number.isFinite(parsed.atMs)) {
      return null;
    }
    return { atMs: parsed.atMs, ip: typeof parsed.ip === 'string' ? parsed.ip : null };
  } catch {
    return null;
  }
}

export function writeRateRecord(record: RateRecord): void {
  localStorage.setItem(RATE_KEY, JSON.stringify(record));
}

export function msUntilNextAllowed(record: RateRecord | null, nowMs: number, windowHours = POBOX_RATE_LIMIT_HOURS): number {
  if (!record) {
    return 0;
  }
  const windowMs = windowHours * HOUR_MS;
  const elapsed = nowMs - record.atMs;
  // A "now" that predates the last submission means the clock moved backwards
  // (or the record is bogus) — fail closed and keep the full window.
  if (elapsed < 0) {
    return windowMs;
  }
  return Math.max(0, windowMs - elapsed);
}

export function withinRateLimit(record: RateRecord | null, nowMs: number, windowHours = POBOX_RATE_LIMIT_HOURS): boolean {
  return msUntilNextAllowed(record, nowMs, windowHours) > 0;
}

export async function fetchTrueTimeMs(): Promise<number> {
  for (const endpoint of TIME_ENDPOINTS) {
    try {
      const res = await fetch(endpoint.url, { cache: 'no-store' });
      if (!res.ok) {
        continue;
      }
      const ms = endpoint.read(await res.json());
      if (Number.isFinite(ms)) {
        return ms;
      }
    } catch {
      // Try the next source.
    }
  }
  throw new Error('time-unavailable');
}

export async function fetchPublicIp(): Promise<string | null> {
  try {
    const res = await fetch(IP_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return typeof data?.ip === 'string' ? data.ip : null;
  } catch {
    return null;
  }
}

async function sendViaEmailjs(params: Record<string, string>): Promise<boolean> {
  // The destination address is configured in the EmailJS template, not here —
  // the frontend only carries the public service/template/key IDs.
  const res = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: POBOX_EMAILJS.serviceId,
      template_id: POBOX_EMAILJS.templateId,
      user_id: POBOX_EMAILJS.publicKey,
      template_params: params,
    }),
  });
  return res.ok;
}

export type SubmitOutcome = { ok: true } | { ok: false; reason: string; retryMs?: number };

export async function submitIdea(draft: IdeaDraft): Promise<SubmitOutcome> {
  const valid = validateIdea(draft);
  if (!valid.ok) {
    return { ok: false, reason: valid.reason };
  }

  let nowMs: number;
  try {
    nowMs = await fetchTrueTimeMs();
  } catch {
    return { ok: false, reason: "Couldn't verify the time right now — please try again in a moment." };
  }

  const waitMs = msUntilNextAllowed(readRateRecord(), nowMs);
  if (waitMs > 0) {
    return { ok: false, reason: 'You can send one idea per day — thanks for the enthusiasm! Come back tomorrow.', retryMs: waitMs };
  }

  const ip = await fetchPublicIp();

  let sent: boolean;
  try {
    sent = await sendViaEmailjs({
      idea_title: draft.title.trim(),
      idea_description: draft.description.trim(),
      sender_ip: ip ?? 'unknown',
      submitted_at: new Date(nowMs).toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });
  } catch {
    sent = false;
  }

  if (!sent) {
    return { ok: false, reason: 'Something went wrong sending your idea. Please try again later.' };
  }

  // Only spend the daily allowance once the email actually went out.
  writeRateRecord({ atMs: nowMs, ip });
  return { ok: true };
}
