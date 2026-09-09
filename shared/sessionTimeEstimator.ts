import { parseSessionText } from './sessionParser';

export interface SessionTimeEstimate {
  totalSeconds: number;
  recognizedLineCount: number;
  unrecognizedLineCount: number;
  paceSecondsPer50m: number;
}

const MIN_PACE_SECONDS = 15;
const MAX_PACE_SECONDS = 300;

export function formatEstimatedSwimmingTime(totalSeconds: number): string {
  const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) return `~${roundedMinutes} mins`;
  if (minutes === 0) return `~${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `~${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} mins`;
}

function parseClockValue(value: string, unit?: string): number | null {
  const normalizedUnit = unit?.toLowerCase();
  if (value.includes(':') || /^\d+\.\d{2}$/.test(value)) {
    const [minutes, seconds] = value.split(/[:.]/).map(Number);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (normalizedUnit?.startsWith('sec') || normalizedUnit === 's') return amount;
  if (!normalizedUnit) return amount > 10 ? amount : amount * 60;
  return amount * 60;
}

function normalizeSessionLine(line: string): string {
  const normalized = line
    .replace(/^\s*(?:[-*]\s+|\d+[:.)]\s+)/, '')
    .trim();

  const repeatedDistance = normalized.replace(
    /^(\d+)\s*(?:x|×)\s*(\d{2,4})(?!\d)\s*/i,
    '$1 x $2m ',
  );
  const leadingDistance = repeatedDistance.match(/^(\d{2,4})(?!\d)\s*/);
  const withUnit = leadingDistance && Number(leadingDistance[1]) >= 25
    ? repeatedDistance.replace(/^(\d{2,4})(?!\d)\s*/, '$1m ')
    : repeatedDistance;

  return withUnit.replace(/^(\d+)\s+(\d+(?:\.\d+)?\s*m\b)/i, '$1 x $2');
}

function extractRepetitions(line: string): { count: number; includedInParsedDistance: boolean } {
  const leading = line.match(/^\s*(\d+)\s*(?:x|×)\s*\d+(?:\.\d+)?\s*m\b/i)
    || line.match(/^\s*(\d+)\s+\d+(?:\.\d+)?\s*m\b/i);
  if (leading) return { count: Number(leading[1]), includedInParsedDistance: true };

  const trailing = line.match(/\brepeat(?:ed)?\s*(\d+)\s*(?:times?)?\b/i)
    || line.match(/\b(?:repeat|repeated)\b.*?\b(\d+)\s*times?\b/i)
    || line.match(/\bx\s*(\d+)\s*times?\b/i);
  return trailing
    ? { count: Number(trailing[1]), includedInParsedDistance: false }
    : { count: 1, includedInParsedDistance: true };
}

function extractTurnaroundSeconds(line: string): number | null {
  const match = line.match(/@\s*(?!\+)(\d+(?::\d{1,2})?)\s*(seconds?|secs?|s|minutes?|mins?)?\b/i)
    || line.match(/\bTR\s*(\d+(?:[:.]\d{1,2})?)\s*(seconds?|secs?|s|minutes?|mins?)?\b/i)
    || line.match(/\boff\s+(?:of\s+)?(\d+(?::\d{1,2})?)\s*(seconds?|secs?|s|minutes?|mins?)?\b/i)
    || line.match(/[-–—]\s*(\d+(?::\d{1,2})?)\s*(minutes?|mins?|seconds?|secs?|s)\s*(?:repeat|turnaround)?\b/i)
    || line.match(/\b(\d+(?::\d{1,2})?)\s*(minutes?|mins?|seconds?|secs?|s)\s+(?:turnaround|repeat)\b/i);
  return match ? parseClockValue(match[1], match[2]) : null;
}

function extractRestSeconds(line: string): number | null {
  const match = line.match(/@\s*\+\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)?\b/i)
    || line.match(/\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)?\s*(?:of\s+)?rest\b/i)
    || line.match(/\brest\s*(?:for\s*)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)?\b/i);
  if (!match) return null;
  const unit = match[2];
  return parseClockValue(match[1], unit || 'seconds');
}

function isIgnorableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^(warm[\s-]?up|pre[\s-]?set|main set|skill|skills|kick|pull|drill|sprint|swim[\s-]?down|cool[\s-]?down|notes?)\s*:?\s*$/i.test(trimmed)) {
    return true;
  }
  return !/\d/.test(trimmed);
}

export function htmlToSessionText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '');
}

export function estimateSessionTime(
  sessionText: string,
  paceSecondsPer50m = 60,
): SessionTimeEstimate {
  const safePace = Math.min(MAX_PACE_SECONDS, Math.max(MIN_PACE_SECONDS, paceSecondsPer50m || 60));
  const lines = sessionText.split('\n');
  let totalSeconds = 0;
  let recognizedLineCount = 0;
  let unrecognizedLineCount = 0;
  let previousRecognizedLineSeconds = 0;
  let previousRepetitionSeconds = 0;
  let defaultRestSeconds: number | null = null;
  let groupMultiplier = 1;

  for (const rawLine of lines) {
    if (/^\s*\d+:\s+/.test(rawLine)) continue;

    const line = normalizeSessionLine(rawLine);
    const sectionRest = line.match(/\ball\s+with\s+(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)?\s+rest\b/i);
    if (sectionRest) {
      defaultRestSeconds = parseClockValue(sectionRest[1], sectionRest[2] || 'seconds');
      continue;
    }

    const standaloneMultiplier = line.match(/^(\d+)\s*x\s*$/i);
    if (standaloneMultiplier) {
      groupMultiplier = Math.max(1, Number(standaloneMultiplier[1]));
      continue;
    }

    if (isIgnorableLine(line)) {
      if (line && !/^(warm[\s-]?up)/i.test(line)) {
        defaultRestSeconds = null;
        if (/^(one block|main|mini set|warm down|cool down|if time)/i.test(line)) groupMultiplier = 1;
      }
      continue;
    }

    const splitTurnaround = line.match(/^(\d+)\s+(?:fast\s+)?TR\s*(\d+(?:[:.]\d{1,2})?)\s*$/i);
    if (splitTurnaround && previousRepetitionSeconds > 0) {
      const count = Math.max(1, Number(splitTurnaround[1]));
      const turnaround = parseClockValue(splitTurnaround[2]);
      if (turnaround !== null) {
        totalSeconds += count * (turnaround - previousRepetitionSeconds);
        recognizedLineCount++;
        continue;
      }
    }

    const standaloneRepeat = line.match(/^repeat(?:\s+(?:the\s+)?(?:previous\s+)?(?:set|line))?\s*(\d+)\s*times?\s*$/i);
    if (standaloneRepeat) {
      if (previousRecognizedLineSeconds > 0) {
        const totalExecutions = Math.max(1, Number(standaloneRepeat[1]));
        totalSeconds += previousRecognizedLineSeconds * Math.max(0, totalExecutions - 1);
        recognizedLineCount++;
      } else {
        unrecognizedLineCount++;
      }
      continue;
    }

    if (!/\d+(?:\.\d+)?\s*m\b/i.test(line)) {
      unrecognizedLineCount++;
      continue;
    }

    const clauses = line.split(/\s*,\s*/).filter(Boolean);
    let combinedLineSeconds = 0;
    let combinedRepetitions = 0;

    for (const clause of clauses) {
      const normalizedClause = normalizeSessionLine(clause);
      if (!/\d+(?:\.\d+)?\s*m\b/i.test(normalizedClause)) continue;

      const parsedLine = parseSessionText(normalizedClause).parsedLines[0];
      const parsedDistance = parsedLine?.contributions?.reduce((sum, contribution) => sum + contribution.distance, 0) || 0;
      if (!parsedLine?.parsed || parsedDistance <= 0) continue;

      const repetitionInfo = extractRepetitions(normalizedClause);
      const repetitions = Math.max(1, repetitionInfo.count);
      const totalDistance = repetitionInfo.includedInParsedDistance
        ? parsedDistance
        : parsedDistance * repetitions;
      const turnaroundSeconds = extractTurnaroundSeconds(normalizedClause);
      const restSeconds = extractRestSeconds(normalizedClause) ?? defaultRestSeconds;

      if (turnaroundSeconds !== null) {
        combinedLineSeconds += repetitions * turnaroundSeconds;
      } else {
        combinedLineSeconds += (totalDistance / 50) * safePace;
        if (restSeconds !== null) combinedLineSeconds += repetitions * restSeconds;
      }
      combinedRepetitions += repetitions;
    }

    if (combinedLineSeconds <= 0) {
      unrecognizedLineCount++;
      continue;
    }

    const lineSeconds = combinedLineSeconds * groupMultiplier;
    totalSeconds += lineSeconds;
    previousRecognizedLineSeconds = lineSeconds;
    previousRepetitionSeconds = combinedRepetitions > 0
      ? combinedLineSeconds / combinedRepetitions
      : 0;
    recognizedLineCount++;
  }

  return {
    totalSeconds: Math.max(0, Math.round(totalSeconds)),
    recognizedLineCount,
    unrecognizedLineCount,
    paceSecondsPer50m: safePace,
  };
}