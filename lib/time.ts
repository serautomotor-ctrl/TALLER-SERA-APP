export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function activeEntryElapsedMs(entry: { start: Date; pausedMs: number; paused: boolean; pauseStart: Date | null }) {
  const now = Date.now();
  const runningPause = entry.paused && entry.pauseStart ? now - entry.pauseStart.getTime() : 0;
  return now - entry.start.getTime() - entry.pausedMs - runningPause;
}

export function finishedEntryDurationMs(entry: { start: Date; end: Date | null; pausedMs: number }) {
  const end = entry.end ? entry.end.getTime() : Date.now();
  return end - entry.start.getTime() - entry.pausedMs;
}
