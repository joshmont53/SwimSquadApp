import { randomUUID } from "crypto";
import type { Competition, SeasonPlanEntry } from "@shared/schema";

export type PlannerRecurringSession = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  squadIds: string[];
};

export type PlannerDateRange = {
  startDate: string;
  endDate: string;
};

export const ENGLAND_2026_27_HOLIDAYS = [
  { startDate: "2026-10-26", endDate: "2026-10-30", name: "October half term (England baseline)" },
  { startDate: "2026-12-21", endDate: "2027-01-01", name: "Christmas holidays (England baseline)" },
  { startDate: "2027-02-15", endDate: "2027-02-19", name: "February half term (England baseline)" },
  { startDate: "2027-03-26", endDate: "2027-04-09", name: "Easter holidays (England baseline)" },
  { startDate: "2027-05-31", endDate: "2027-06-04", name: "May half term (England baseline)" },
  { startDate: "2027-07-22", endDate: "2027-08-31", name: "Summer holidays (England baseline)" },
] as const;

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateFromKey(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

function addDays(value: string, days: number): string {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function isoWeekday(value: string): number {
  const day = dateFromKey(value).getUTCDay();
  return day === 0 ? 7 : day;
}

function daysBetween(startDate: string, endDate: string): number {
  return Math.round((dateFromKey(endDate).getTime() - dateFromKey(startDate).getTime()) / 86400000);
}

function holidayForDate(date: string) {
  return ENGLAND_2026_27_HOLIDAYS.find(holiday => date >= holiday.startDate && date <= holiday.endDate);
}

function competitionForDate(date: string, competitions: Competition[]) {
  return competitions.filter(competition =>
    competition.recordStatus === "active" &&
    competition.startDate <= date &&
    competition.endDate >= date,
  );
}

export function generateSeasonPlanEntries(
  range: PlannerDateRange,
  squadIds: string[],
  recurringSessions: PlannerRecurringSession[],
  competitions: Competition[],
): SeasonPlanEntry[] {
  if (range.startDate > range.endDate) throw new Error("Start date must be before end date");
  const selectedSquads = new Set(squadIds);
  const entries = new Map<string, SeasonPlanEntry>();
  const totalDays = daysBetween(range.startDate, range.endDate);

  for (let offset = 0; offset <= totalDays; offset += 1) {
    const date = addDays(range.startDate, offset);
    const trainingWeek = Math.floor(offset / 7) + 1;
    const holiday = holidayForDate(date);
    const dateCompetitions = competitionForDate(date, competitions);

    for (const recurring of recurringSessions) {
      if (isoWeekday(date) !== recurring.dayOfWeek) continue;
      const matchingSquads = recurring.squadIds.filter(id => selectedSquads.has(id));
      if (matchingSquads.length === 0) continue;

      // Identical date/time/location slots are joint sessions. Merge their
      // squads rather than producing duplicate planning rows.
      const key = `${date}|${recurring.startTime.slice(0, 5)}|${recurring.endTime.slice(0, 5)}|${recurring.locationId}`;
      const existing = entries.get(key);
      if (existing) {
        existing.squadIds = Array.from(new Set([...existing.squadIds, ...matchingSquads]));
        if (dateCompetitions.length > 0) {
          existing.competitionId = existing.competitionId || dateCompetitions[0].id;
          existing.competitionEvent = dateCompetitions.map(c => c.competitionName).join(", ");
        }
        if (holiday) {
          existing.isInHoliday = true;
          existing.holidayName = holiday.name;
        }
        continue;
      }

      entries.set(key, {
        id: randomUUID(),
        squadIds: matchingSquads,
        date,
        startTime: recurring.startTime.slice(0, 5),
        endTime: recurring.endTime.slice(0, 5),
        type: "session",
        trainingWeek,
        sourceRecurringSessionId: recurring.id,
        competitionId: dateCompetitions[0]?.id || null,
        competitionEvent: dateCompetitions.map(c => c.competitionName).join(", "),
        trainingPhase: "",
        intensity: "",
        mainFocus: "",
        secondaryFocus: "",
        testSet: false,
        notes: "",
        holidayName: holiday?.name || null,
        isInHoliday: Boolean(holiday),
        removed: false,
        locationId: recurring.locationId,
      });
    }

    // Keep school-holiday information visible even on days with no scheduled
    // training. These are planning markers only and never match a real session.
    if (holiday) {
      for (const squadId of Array.from(selectedSquads)) {
        const hasSession = Array.from(entries.values()).some(entry =>
          entry.date === date && entry.type === "session" && entry.squadIds.includes(squadId),
        );
        if (!hasSession) {
          entries.set(`holiday|${date}|${squadId}`, {
            id: randomUUID(),
            squadIds: [squadId],
            date,
            startTime: null,
            endTime: null,
            type: "holiday",
            trainingWeek,
            sourceRecurringSessionId: null,
            competitionId: null,
            competitionEvent: "",
            trainingPhase: "",
            intensity: "",
            mainFocus: "",
            secondaryFocus: "",
            testSet: false,
            notes: "",
            holidayName: holiday.name,
            isInHoliday: true,
            removed: false,
            locationId: null,
          });
        }
      }
    }
  }

  return Array.from(entries.values()).sort((a, b) =>
    a.date.localeCompare(b.date) ||
    (a.startTime || "").localeCompare(b.startTime || "") ||
    a.id.localeCompare(b.id),
  );
}

export function validateSeasonPlanEntries(
  entries: SeasonPlanEntry[],
  linkedSquadIds: string[],
  startDate: string,
  endDate: string,
): string | null {
  const allowedSquads = new Set(linkedSquadIds);
  const entryIds = new Set<string>();
  for (const entry of entries) {
    if (entryIds.has(entry.id)) return "Planner entry IDs must be unique";
    entryIds.add(entry.id);
    if (entry.date < startDate || entry.date > endDate) {
      return "Planner entries must stay within the plan date range";
    }
    if (entry.squadIds.some(squadId => !allowedSquads.has(squadId))) {
      return "Planner entries may only reference squads linked to this plan";
    }
  }
  return null;
}