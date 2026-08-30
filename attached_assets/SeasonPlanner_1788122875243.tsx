import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Plus, X, Edit2, Save, CalendarRange, MonitorOff } from 'lucide-react';
import { cn } from './ui/utils';
import { competitions as mockCompetitions } from '../lib/mockDataExtensions';
import { Squad, RecurringSession, Location } from '../types';
import { format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TrainingPhase =
  | 'General Prep' | 'Build' | 'Race Prep' | 'Race Week'
  | 'Recovery' | 'Maintenance' | 'Speed' | '';

const TRAINING_PHASES: TrainingPhase[] = [
  'General Prep', 'Build', 'Race Prep', 'Race Week', 'Recovery', 'Maintenance', 'Speed',
];

const INTENSITY_OPTIONS = [
  '1 - Recovery',
  '2 - Low',
  '3 - Moderate',
  '4 - High',
  '5 - Maximum',
];

export interface SeasonPlanRow {
  id: string;
  date: Date;
  type: 'session' | 'competition' | 'manual';
  sessionTime: string;
  trainingWeek: number;
  competitionEvent: string;
  trainingPhase: TrainingPhase;
  intensity: string;
  mainFocus: string;
  secondaryFocus: string;
  testSet: boolean;
  notes: string;
  isInHoliday: boolean;
  removed: boolean;
}

export interface SeasonPlan {
  id: string;
  name: string;
  squadIds: string[];
  startDate: Date;
  endDate: Date;
  rows: SeasonPlanRow[];
  createdAt: Date;
}

interface SeasonPlannerProps {
  squads: Squad[];
  recurringSessions: RecurringSession[];
  locations: Location[];
}

// ─── UK England School Holidays — 2025-26 and 2026-27 ───────────────────────

const SCHOOL_HOLIDAYS = [
  // 2025-26
  { start: new Date(2025, 9, 27),  end: new Date(2025, 10, 1)  }, // Autumn HT
  { start: new Date(2025, 11, 20), end: new Date(2026,  0, 4)  }, // Christmas
  { start: new Date(2026,  1, 16), end: new Date(2026,  1, 22) }, // Feb HT
  { start: new Date(2026,  2, 28), end: new Date(2026,  3, 12) }, // Easter
  { start: new Date(2026,  4, 25), end: new Date(2026,  5,  1) }, // May HT
  { start: new Date(2026,  6, 22), end: new Date(2026,  8,  1) }, // Summer
  // 2026-27
  { start: new Date(2026,  9, 26), end: new Date(2026,  9, 30) }, // Autumn HT
  { start: new Date(2026, 11, 19), end: new Date(2027,  0,  5) }, // Christmas
  { start: new Date(2027,  1, 15), end: new Date(2027,  1, 19) }, // Feb HT
  { start: new Date(2027,  2, 29), end: new Date(2027,  3, 13) }, // Easter
  { start: new Date(2027,  4, 24), end: new Date(2027,  4, 28) }, // May HT
  { start: new Date(2027,  6, 21), end: new Date(2027,  8,  5) }, // Summer
];

function isHoliday(date: Date): boolean {
  const t = date.getTime();
  return SCHOOL_HOLIDAYS.some(h => t >= h.start.getTime() && t <= h.end.getTime());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getTrainingWeek(date: Date, planStart: Date): number {
  return Math.floor((date.getTime() - planStart.getTime()) / (7 * 86400000)) + 1;
}

export function formatSessionTime(start: string, end: string): string {
  const fmt12 = (t: string): string => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m}${suffix}`;
  };
  return `${fmt12(start)}-${fmt12(end)}`;
}

function phaseColor(phase: TrainingPhase): string {
  switch (phase) {
    case 'General Prep': return 'text-blue-600';
    case 'Build':        return 'text-indigo-600';
    case 'Race Prep':    return 'text-orange-600';
    case 'Race Week':    return 'text-amber-700';
    case 'Recovery':     return 'text-green-600';
    case 'Maintenance':  return 'text-slate-500';
    case 'Speed':        return 'text-purple-600';
    default:             return 'text-muted-foreground';
  }
}

// Sentinel used internally so Radix Select never receives empty-string value
const NONE = '__none__';

function toSelectVal(v: string): string { return v || NONE; }
function fromSelectVal(v: string): string { return v === NONE ? '' : v; }

function generatePlan(
  name: string,
  squadIds: string[],
  start: Date,
  end: Date,
  recurringSessions: RecurringSession[],
): SeasonPlan {
  const rows: SeasonPlanRow[] = [];

  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    const seen = new Set<string>();
    const matches = recurringSessions.filter(rs => squadIds.includes(rs.squadId) && rs.dayOfWeek === dow);
    // Deduplicate by time slot so joint-squad plans don't double-add rows
    const deduped = matches.filter(rs => {
      const key = `${rs.startTime}-${rs.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (const rs of deduped) {
      rows.push({
        id: uuid(),
        date: new Date(d),
        type: 'session',
        sessionTime: formatSessionTime(rs.startTime, rs.endTime),
        trainingWeek: getTrainingWeek(d, start),
        competitionEvent: '',
        trainingPhase: '',
        intensity: '',
        mainFocus: '',
        secondaryFocus: '',
        testSet: false,
        notes: '',
        isInHoliday: isHoliday(d),
        removed: false,
      });
    }
    d.setDate(d.getDate() + 1);
  }

  for (const comp of mockCompetitions) {
    const cd = new Date(comp.startDate);
    while (cd <= comp.endDate) {
      if (cd >= start && cd <= end) {
        rows.push({
          id: uuid(),
          date: new Date(cd),
          type: 'competition',
          sessionTime: '',
          trainingWeek: getTrainingWeek(cd, start),
          competitionEvent: comp.name,
          trainingPhase: 'Race Week',
          intensity: '',
          mainFocus: `COMPETITION - ${comp.name}`,
          secondaryFocus: '-',
          testSet: false,
          notes: '',
          isInHoliday: isHoliday(cd),
          removed: false,
        });
      }
      cd.setDate(cd.getDate() + 1);
    }
  }

  rows.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === 'competition' && b.type !== 'competition') return 1;
    if (b.type === 'competition' && a.type !== 'competition') return -1;
    return 0;
  });

  return { id: uuid(), name, squadIds, startDate: start, endDate: end, rows, createdAt: new Date() };
}

// ─── Pre-populated Skills Advanced Term 1 2026-27 ────────────────────────────

function createInitialSkillsAdvancedPlan(): SeasonPlan {
  const start = new Date(2026, 8, 1);
  const end   = new Date(2026, 11, 20);

  const sess = (
    month: number, day: number,
    phase: TrainingPhase, intensity: string,
    mainFocus: string, secondaryFocus: string,
    testSet: boolean, notes: string,
  ): SeasonPlanRow => {
    const date = new Date(2026, month, day);
    const dow = date.getDay();
    return {
      id: `mock-sa-${month}-${day}`,
      date,
      type: 'session',
      sessionTime: dow === 6 ? '8:00AM-10:00AM' : '6:00PM-8:00PM',
      trainingWeek: getTrainingWeek(date, start),
      competitionEvent: '',
      trainingPhase: phase,
      intensity,
      mainFocus,
      secondaryFocus,
      testSet,
      notes,
      isInHoliday: isHoliday(date),
      removed: false,
    };
  };

  const comp = (month: number, day: number, name: string): SeasonPlanRow => {
    const date = new Date(2026, month, day);
    return {
      id: `mock-comp-${month}-${day}`,
      date,
      type: 'competition',
      sessionTime: '',
      trainingWeek: getTrainingWeek(date, start),
      competitionEvent: name,
      trainingPhase: 'Race Week',
      intensity: '',
      mainFocus: `COMPETITION - ${name}`,
      secondaryFocus: '-',
      testSet: false,
      notes: 'Racing today',
      isInHoliday: isHoliday(date),
      removed: false,
    };
  };

  // Sep=8, Oct=9, Nov=10, Dec=11 (JS 0-indexed months)
  const rows: SeasonPlanRow[] = [
    // ── WK 1 (Sep 1-7) General Prep ─────────────────────────────────────────
    sess(8, 3, 'General Prep', '3 - Moderate', 'Return to training — stroke recap', 'Aerobic swim-down, kick drills', false, 'First session back — re-establish technique, not load'),
    sess(8, 4, 'General Prep', '3 - Moderate', 'Fundamentals: Kick', 'FC & BK Technique', false, ''),
    sess(8, 5, 'General Prep', '2 - Low',      'Fundamentals: Streamline', 'Underwaters & breakouts', false, 'Short AM session — keep volume moderate'),
    sess(8, 7, 'General Prep', '3 - Moderate', 'IM technique — all four strokes', 'Turns — all strokes', false, ''),
    // ── WK 2 (Sep 8-14) General Prep → Race Prep ────────────────────────────
    sess(8, 10, 'General Prep', '3 - Moderate', 'Fundamentals: Core', 'Race skills', false, ''),
    sess(8, 11, 'General Prep', '3 - Moderate', 'BK Technique & Stroke Counting', 'Power to Speed', false, ''),
    sess(8, 12, 'General Prep', '3 - Moderate', 'Breaststroke & Butterfly technique', 'Pull/paddle work', false, ''),
    sess(8, 14, 'Race Prep',   '3 - Moderate', 'Race-pace freestyle & backstroke', 'Relay changeovers', false, 'Hart Club Champs next Sunday — keep it sharp, not tired'),
    // ── WK 3 (Sep 15-21) Race Prep / Race Week / Recovery ───────────────────
    sess(8, 17, 'Race Prep',  '3 - Moderate', 'Race-pace breaststroke & butterfly', 'Starts & turns', false, 'Champs this Sunday — no test set, race-pace only'),
    sess(8, 18, 'Race Prep',  '2 - Low',      'Easy aerobic + race-pace 50s', 'Mental prep, race plan review', false, 'Two days before competition — short and sharp'),
    sess(8, 19, 'Race Prep',  '2 - Low',      'Starts, dives & easy aerobic', 'Relay changeovers', false, 'Day before competition — very light session'),
    comp(8, 20, 'Hart Club Champs 2026'),
    sess(8, 21, 'Recovery',   '2 - Low',      'Easy technique swim — all strokes', 'Stretching, stroke correction video review', false, 'Recovery from Champs — low intensity, fix technique faults seen in racing'),
    // ── WK 4 (Sep 22-28) Recovery → Build ───────────────────────────────────
    sess(8, 24, 'Recovery', '2 - Low',      'Aerobic base rebuild — IM', 'Kick set', false, ''),
    sess(8, 25, 'Build',    '3 - Moderate', 'Aerobic threshold set — freestyle', 'Pull set', false, ''),
    sess(8, 26, 'Build',    '3 - Moderate', 'Distance freestyle — aerobic conditioning', 'Core strength', false, ''),
    sess(8, 28, 'Build',    '4 - High',     'IM + race-pace 50s', 'Starts & turns', false, ''),
    // ── WK 5 (Sep 29 – Oct 5) Build ─────────────────────────────────────────
    sess(9, 1,  'Build', '4 - High', 'Aerobic threshold — IM order', 'Kick set', false, ''),
    sess(9, 2,  'Build', '4 - High', 'Backstroke & butterfly technique', 'Drill focus', false, ''),
    sess(9, 3,  'Build', '4 - High', 'Distance freestyle — long aerobic set', 'Pull set', true, 'Monthly baseline test set (400/800 free) — log times for progress tracking'),
    sess(9, 5,  'Build', '4 - High', 'Aerobic threshold set — mixed strokes', 'Pull/paddle', false, ''),
    // ── WK 6 (Oct 6-12) Build ───────────────────────────────────────────────
    sess(9, 8,  'Build', '4 - High', 'Aerobic endurance — freestyle', 'Negative-split pacing practice', false, ''),
    sess(9, 9,  'Build', '4 - High', 'Breaststroke & butterfly technique', 'Drill work', false, ''),
    sess(9, 10, 'Build', '4 - High', 'Aerobic threshold — IM based', 'Kick set', false, ''),
    sess(9, 12, 'Build', '4 - High', 'Aerobic endurance — all strokes', 'Turns', false, ''),
    // ── WK 7 (Oct 13-19) Build → Race Prep (Autumn Meet) ───────────────────
    sess(9, 15, 'Build',    '4 - High',     'Race-pace distance freestyle & backstroke', 'Pacing strategy', false, 'Autumn Meet in 9 days — shift emphasis to race prep'),
    sess(9, 16, 'Race Prep','3 - Moderate', 'Race-pace all strokes, short reps', 'Starts & turns, relays', false, ''),
    sess(9, 17, 'Race Prep','3 - Moderate', 'Easy aerobic + race-pace 100s', 'Starts, relaxed kick', false, ''),
    sess(9, 19, 'Race Prep','3 - Moderate', 'Relay changeovers & race-pace 50s', 'Mental prep', false, 'Hart Autumn Meet this weekend — no test set'),
    // ── WK 8 (Oct 20-26) Race Week / half term starts ───────────────────────
    sess(9, 22, 'Race Prep', '2 - Low',      'Easy aerobic + starts/dives', 'Mental prep, race plan review', false, 'Autumn Meet this Saturday — light session, keep it fresh'),
    sess(9, 23, 'Race Prep', '2 - Low',      'Starts, dives & easy aerobic', 'Race plan review', false, 'Day before competition — very light'),
    comp(9, 24, 'Hart Autumn Meet 2026'),
    comp(9, 25, 'Hart Autumn Meet 2026'),
    sess(9, 26, 'Recovery',  '1 - Recovery', 'Easy technique swim', 'Stroke correction', false, 'HALF TERM — recovery from Autumn Meet weekend'),
    // ── WK 9 (Oct 27 – Nov 2) Recovery / Half Term ──────────────────────────
    sess(9, 29, 'Recovery', '1 - Recovery', 'Fun technique session — stroke of choice', 'Games/relays', false, 'HALF TERM — lighter, enjoyable sessions'),
    sess(9, 30, 'Recovery', '2 - Low',      'Easy aerobic swim + dryland', 'Core & flexibility', false, 'HALF TERM'),
    sess(9, 31, 'Recovery', '2 - Low',      'Technique focus — weakest stroke', 'Drill work', false, 'Last half-term session'),
    sess(10, 2, 'Build',    '3 - Moderate', 'Aerobic base rebuild — IM', 'Kick set', false, 'Back to full training after half term'),
    // ── WK 10 (Nov 3-9) Build ───────────────────────────────────────────────
    sess(10, 5,  'Build', '4 - High', 'Aerobic threshold — freestyle & backstroke', 'Kick set', false, ''),
    sess(10, 6,  'Build', '4 - High', 'Backstroke & butterfly technique', 'Drill focus', false, ''),
    sess(10, 7,  'Build', '4 - High', 'Distance freestyle — aerobic conditioning', 'Pull set', false, ''),
    sess(10, 9,  'Build', '4 - High', 'IM threshold — aerobic', 'Turns', false, ''),
    // ── WK 11 (Nov 10-16) Build ─────────────────────────────────────────────
    sess(10, 12, 'Build', '4 - High', 'Aerobic threshold set — mixed strokes', 'Pull/paddle', false, ''),
    sess(10, 13, 'Build', '4 - High', 'Breaststroke & butterfly technique', 'Relay changeovers & starts', false, ''),
    sess(10, 14, 'Build', '4 - High', 'Race-pace 50s/100s', 'Starts & turns, relays', false, ''),
    sess(10, 16, 'Build', '4 - High', 'IM + race-pace 50s', 'Starts & turns', false, ''),
    // ── WK 12 (Nov 17-23) Speed ─────────────────────────────────────────────
    sess(10, 19, 'Speed', '4 - High',     'Sprinting: Power under control', 'Race skills', false, ''),
    sess(10, 20, 'Speed', '5 - Maximum',  'Speed — hard session', 'Starts: all strokes', false, ''),
    sess(10, 21, 'Speed', '4 - High',     'Aerobic threshold — IM based', 'Kick', true, 'Monthly test set — 200 IM time trial'),
    sess(10, 23, 'Speed', '5 - Maximum',  'Speed — hard session', 'Relay & race prep', false, ''),
    // ── WK 13 (Nov 24-30) Speed → Maintenance ───────────────────────────────
    sess(10, 26, 'Speed',       '4 - High',     'Stroke rate & breakouts', 'Starts and turns', false, ''),
    sess(10, 27, 'Speed',       '4 - High',     'IM threshold', 'Turns: BR & Fly', false, ''),
    sess(10, 28, 'Speed',       '4 - High',     'Aerobic — hard session', 'Streamline & underwaters', false, ''),
    sess(10, 30, 'Maintenance', '3 - Moderate', 'Aerobic conditioning — distance freestyle', 'Pull/paddle', false, ''),
    // ── WK 14 (Dec 1-7) Maintenance ─────────────────────────────────────────
    sess(11, 3,  'Maintenance', '3 - Moderate', "Technique review — each swimmer's weakest stroke", 'Drill work', false, ''),
    sess(11, 4,  'Maintenance', '3 - Moderate', 'Aerobic threshold — freestyle', 'Kick set', false, ''),
    sess(11, 5,  'Maintenance', '3 - Moderate', 'Distance freestyle — aerobic conditioning', 'Pull/paddle', true, 'Early test set — last timed session before Christmas'),
    sess(11, 7,  'Maintenance', '3 - Moderate', 'Relay changeovers & race-pace 50s', 'Starts & turns', false, ''),
    // ── WK 15 (Dec 8-14) Maintenance ────────────────────────────────────────
    sess(11, 10, 'Maintenance', '3 - Moderate', 'IM technique — all strokes', 'Turns', false, ''),
    sess(11, 11, 'Maintenance', '3 - Moderate', 'Aerobic threshold — mixed strokes', 'Drill work', false, ''),
    sess(11, 12, 'Maintenance', '2 - Low',      'Fun relays & games session', 'Stroke of choice', false, ''),
    sess(11, 14, 'Maintenance', '3 - Moderate', 'Easy technique swim + dryland', 'Core & flexibility', false, ''),
    // ── WK 16 (Dec 15-20) Maintenance — end of term ─────────────────────────
    sess(11, 17, 'Maintenance', '3 - Moderate', 'Technique review — all four strokes', 'Video analysis', false, 'Last full week — lighter, reflective sessions'),
    sess(11, 18, 'Maintenance', '2 - Low',      'Fun relays & games session', 'Stroke of choice', false, 'Christmas fun session'),
    sess(11, 19, 'Maintenance', '2 - Low',      "Easy technique swim + end-of-term time trial", "Personal best attempt, own stroke choice", false, 'Last session of term — restart January'),
  ];

  rows.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === 'competition' && b.type !== 'competition') return 1;
    if (b.type === 'competition' && a.type !== 'competition') return -1;
    return 0;
  });

  return {
    id: 'mock-sa-term1-2627',
    name: 'Skills Advanced — Term 1 2026-27',
    squadIds: ['1'],
    startDate: start,
    endDate: end,
    rows,
    createdAt: new Date(2026, 8, 1),
  };
}

export const INITIAL_PLAN = createInitialSkillsAdvancedPlan();

function createPerformanceElitePlan(): SeasonPlan {
  const start = new Date(2026, 8, 1);
  const end   = new Date(2026, 11, 20);

  const sess = (
    month: number, day: number,
    phase: TrainingPhase, intensity: string,
    mainFocus: string, secondaryFocus: string,
    testSet: boolean, notes: string,
  ): SeasonPlanRow => {
    const date = new Date(2026, month, day);
    const dow = date.getDay();
    return {
      id: `mock-pe-${month}-${day}`,
      date,
      type: 'session',
      sessionTime: dow === 6 ? '8:00AM-10:00AM' : '6:00PM-8:00PM',
      trainingWeek: getTrainingWeek(date, start),
      competitionEvent: '',
      trainingPhase: phase,
      intensity,
      mainFocus,
      secondaryFocus,
      testSet,
      notes,
      isInHoliday: isHoliday(date),
      removed: false,
    };
  };

  const comp = (month: number, day: number, name: string): SeasonPlanRow => {
    const date = new Date(2026, month, day);
    return {
      id: `mock-pe-comp-${month}-${day}`,
      date,
      type: 'competition',
      sessionTime: '',
      trainingWeek: getTrainingWeek(date, start),
      competitionEvent: name,
      trainingPhase: 'Race Week',
      intensity: '',
      mainFocus: `COMPETITION - ${name}`,
      secondaryFocus: '-',
      testSet: false,
      notes: 'Racing today',
      isInHoliday: isHoliday(date),
      removed: false,
    };
  };

  const rows: SeasonPlanRow[] = [
    sess(8, 3,  'General Prep', '3 - Moderate', 'Return to training — stroke recap', 'Aerobic swim-down, kick drills', false, 'First session back — re-establish technique, not load'),
    sess(8, 4,  'General Prep', '3 - Moderate', 'Fundamentals: Kick', 'FC & BK Technique', false, ''),
    sess(8, 5,  'General Prep', '2 - Low',      'Fundamentals: Streamline', 'Underwaters & breakouts', false, 'Short AM session — keep volume moderate'),
    sess(8, 7,  'General Prep', '3 - Moderate', 'IM technique — all four strokes', 'Turns — all strokes', false, ''),
    sess(8, 10, 'General Prep', '3 - Moderate', 'Fundamentals: Core', 'Race skills', false, ''),
    sess(8, 11, 'General Prep', '3 - Moderate', 'BK Technique & Stroke Counting', 'Power to Speed', false, ''),
    sess(8, 12, 'General Prep', '3 - Moderate', 'Breaststroke & Butterfly technique', 'Pull/paddle work', false, ''),
    sess(8, 14, 'Race Prep',    '3 - Moderate', 'Race-pace freestyle & backstroke', 'Relay changeovers', false, 'Hart Club Champs next Sunday — keep it sharp, not tired'),
    sess(8, 17, 'Race Prep',    '3 - Moderate', 'Race-pace breaststroke & butterfly', 'Starts & turns', false, 'Champs this Sunday — no test set, race-pace only'),
    sess(8, 18, 'Race Prep',    '2 - Low',      'Easy aerobic + race-pace 50s', 'Mental prep, race plan review', false, 'Two days before competition — short and sharp'),
    sess(8, 19, 'Race Prep',    '2 - Low',      'Starts, dives & easy aerobic', 'Relay changeovers', false, 'Day before competition — very light session'),
    comp(8, 20, 'Hart Club Champs 2026'),
    sess(8, 21, 'Recovery',     '2 - Low',      'Easy technique swim — all strokes', 'Stretching, stroke correction video review', false, 'Recovery from Champs — low intensity, fix technique faults seen in racing'),
    sess(8, 24, 'Recovery',     '2 - Low',      'Aerobic base rebuild — IM', 'Kick set', false, ''),
    sess(8, 25, 'Build',        '3 - Moderate', 'Aerobic threshold set — freestyle', 'Pull set', false, ''),
    sess(8, 26, 'Build',        '3 - Moderate', 'Distance freestyle — aerobic conditioning', 'Core strength', false, ''),
    sess(8, 28, 'Build',        '4 - High',     'IM + race-pace 50s', 'Starts & turns', false, ''),
    sess(9, 1,  'Build', '4 - High', 'Aerobic threshold — IM order', 'Kick set', false, ''),
    sess(9, 2,  'Build', '4 - High', 'Backstroke & butterfly technique', 'Drill focus', false, ''),
    sess(9, 3,  'Build', '4 - High', 'Distance freestyle — long aerobic set', 'Pull set', true, 'Monthly baseline test set (400/800 free) — log times for progress tracking'),
    sess(9, 5,  'Build', '4 - High', 'Aerobic threshold set — mixed strokes', 'Pull/paddle', false, ''),
    sess(9, 8,  'Build', '4 - High', 'Aerobic endurance — freestyle', 'Negative-split pacing practice', false, ''),
    sess(9, 9,  'Build', '4 - High', 'Breaststroke & butterfly technique', 'Drill work', false, ''),
    sess(9, 10, 'Build', '4 - High', 'Aerobic threshold — IM based', 'Kick set', false, ''),
    sess(9, 12, 'Build', '4 - High', 'Aerobic endurance — all strokes', 'Turns', false, ''),
    sess(9, 15, 'Build',     '4 - High',     'Race-pace distance freestyle & backstroke', 'Pacing strategy', false, 'Autumn Meet in 9 days — shift emphasis to race prep'),
    sess(9, 16, 'Race Prep', '3 - Moderate', 'Race-pace all strokes, short reps', 'Starts & turns, relays', false, ''),
    sess(9, 17, 'Race Prep', '3 - Moderate', 'Easy aerobic + race-pace 100s', 'Starts, relaxed kick', false, ''),
    sess(9, 19, 'Race Prep', '3 - Moderate', 'Relay changeovers & race-pace 50s', 'Mental prep', false, 'Hart Autumn Meet this weekend — no test set'),
    sess(9, 22, 'Race Prep', '2 - Low',      'Easy aerobic + starts/dives', 'Mental prep, race plan review', false, 'Autumn Meet this Saturday — light session, keep it fresh'),
    sess(9, 23, 'Race Prep', '2 - Low',      'Starts, dives & easy aerobic', 'Race plan review', false, 'Day before competition — very light'),
    comp(9, 24, 'Hart Autumn Meet 2026'),
    comp(9, 25, 'Hart Autumn Meet 2026'),
    sess(9, 26, 'Recovery',  '1 - Recovery', 'Easy technique swim', 'Stroke correction', false, 'HALF TERM — recovery from Autumn Meet weekend'),
    sess(9, 29, 'Recovery',  '1 - Recovery', 'Fun technique session — stroke of choice', 'Games/relays', false, 'HALF TERM — lighter, enjoyable sessions'),
    sess(9, 30, 'Recovery',  '2 - Low',      'Easy aerobic swim + dryland', 'Core & flexibility', false, 'HALF TERM'),
    sess(9, 31, 'Recovery',  '2 - Low',      'Technique focus — weakest stroke', 'Drill work', false, 'Last half-term session'),
    sess(10, 2, 'Build',     '3 - Moderate', 'Aerobic base rebuild — IM', 'Kick set', false, 'Back to full training after half term'),
    sess(10, 5,  'Build', '4 - High', 'Aerobic threshold — freestyle & backstroke', 'Kick set', false, ''),
    sess(10, 6,  'Build', '4 - High', 'Backstroke & butterfly technique', 'Drill focus', false, ''),
    sess(10, 7,  'Build', '4 - High', 'Distance freestyle — aerobic conditioning', 'Pull set', false, ''),
    sess(10, 9,  'Build', '4 - High', 'IM threshold — aerobic', 'Turns', false, ''),
    sess(10, 12, 'Build', '4 - High', 'Aerobic threshold set — mixed strokes', 'Pull/paddle', false, ''),
    sess(10, 13, 'Build', '4 - High', 'Breaststroke & butterfly technique', 'Relay changeovers & starts', false, ''),
    sess(10, 14, 'Build', '4 - High', 'Race-pace 50s/100s', 'Starts & turns, relays', false, ''),
    sess(10, 16, 'Build', '4 - High', 'IM + race-pace 50s', 'Starts & turns', false, ''),
    sess(10, 19, 'Speed', '4 - High',    'Sprinting: Power under control', 'Race skills', false, ''),
    sess(10, 20, 'Speed', '5 - Maximum', 'Speed — hard session', 'Starts: all strokes', false, ''),
    sess(10, 21, 'Speed', '4 - High',    'Aerobic threshold — IM based', 'Kick', true, 'Monthly test set — 200 IM time trial'),
    sess(10, 23, 'Speed', '5 - Maximum', 'Speed — hard session', 'Relay & race prep', false, ''),
    sess(10, 26, 'Speed',       '4 - High',     'Stroke rate & breakouts', 'Starts and turns', false, ''),
    sess(10, 27, 'Speed',       '4 - High',     'IM threshold', 'Turns: BR & Fly', false, ''),
    sess(10, 28, 'Speed',       '4 - High',     'Aerobic — hard session', 'Streamline & underwaters', false, ''),
    sess(10, 30, 'Maintenance', '3 - Moderate', 'Aerobic conditioning — distance freestyle', 'Pull/paddle', false, ''),
    sess(11, 3,  'Maintenance', '3 - Moderate', "Technique review — each swimmer's weakest stroke", 'Drill work', false, ''),
    sess(11, 4,  'Maintenance', '3 - Moderate', 'Aerobic threshold — freestyle', 'Kick set', false, ''),
    sess(11, 5,  'Maintenance', '3 - Moderate', 'Distance freestyle — aerobic conditioning', 'Pull/paddle', true, 'Early test set — last timed session before Christmas'),
    sess(11, 7,  'Maintenance', '3 - Moderate', 'Relay changeovers & race-pace 50s', 'Starts & turns', false, ''),
    sess(11, 10, 'Maintenance', '3 - Moderate', 'IM technique — all strokes', 'Turns', false, ''),
    sess(11, 11, 'Maintenance', '3 - Moderate', 'Aerobic threshold — mixed strokes', 'Drill work', false, ''),
    sess(11, 12, 'Maintenance', '2 - Low',      'Fun relays & games session', 'Stroke of choice', false, ''),
    sess(11, 14, 'Maintenance', '3 - Moderate', 'Easy technique swim + dryland', 'Core & flexibility', false, ''),
    sess(11, 17, 'Maintenance', '3 - Moderate', 'Technique review — all four strokes', 'Video analysis', false, 'Last full week — lighter, reflective sessions'),
    sess(11, 18, 'Maintenance', '2 - Low',      'Fun relays & games session', 'Stroke of choice', false, 'Christmas fun session'),
    sess(11, 19, 'Maintenance', '2 - Low',      "Easy technique swim + end-of-term time trial", "Personal best attempt, own stroke choice", false, 'Last session of term — restart January'),
  ];

  rows.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === 'competition' && b.type !== 'competition') return 1;
    if (b.type === 'competition' && a.type !== 'competition') return -1;
    return 0;
  });

  return {
    id: 'mock-pe-term1-2627',
    name: 'Performance & Elite — Term 1 2026-27',
    squadIds: ['3', '4'],
    startDate: start,
    endDate: end,
    rows,
    createdAt: new Date(2026, 8, 1),
  };
}

export const PERFORMANCE_ELITE_PLAN = createPerformanceElitePlan();

// ─── Create Plan Modal ────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface CreatePlanModalProps {
  squads: Squad[];
  recurringSessions: RecurringSession[];
  locations: Location[];
  initialSquadIds: string[];
  onCreate: (plan: SeasonPlan) => void;
  onClose: () => void;
}

function CreatePlanModal({ squads, recurringSessions, locations, initialSquadIds, onCreate, onClose }: CreatePlanModalProps) {
  const [name, setName] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(initialSquadIds);
  const [addingSquad, setAddingSquad] = useState<string>(NONE);

  const removeSquad = (id: string) => setSelectedSquadIds(prev => prev.filter(s => s !== id));
  const addSquad = (id: string) => {
    if (!id || id === NONE) return;
    setSelectedSquadIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setAddingSquad(NONE);
  };

  const availableToAdd = squads.filter(s => !selectedSquadIds.includes(s.id));
  const squadSessions = recurringSessions.filter(rs => selectedSquadIds.includes(rs.squadId));
  const canCreate = name.trim() !== '' && startStr !== '' && endStr !== '' &&
    new Date(endStr) >= new Date(startStr) && selectedSquadIds.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    onCreate(generatePlan(name.trim(), selectedSquadIds, start, end, recurringSessions));
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Create Season Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input id="plan-name" placeholder="e.g. Term 1 2026-27" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Squad multi-select */}
          <div className="space-y-1.5">
            <Label>Squads</Label>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] border rounded-lg px-2 py-1.5 bg-background">
              {selectedSquadIds.map(id => {
                const sq = squads.find(s => s.id === id);
                if (!sq) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1 text-xs font-medium bg-accent px-2 py-0.5 rounded-full">
                    {sq.name}
                    <button onClick={() => removeSquad(id)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {availableToAdd.length > 0 && (
                <Select value={addingSquad} onValueChange={addSquad}>
                  <SelectTrigger className="h-6 w-32 border-dashed text-xs">
                    <SelectValue placeholder="+ Add squad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>+ Add squad</SelectItem>
                    {availableToAdd.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedSquadIds.length === 0 && (
              <p className="text-xs text-destructive">At least one squad is required.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startStr} onChange={e => setStartStr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endStr} onChange={e => setEndStr(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Standard Schedule</Label>
            {selectedSquadIds.length === 0 ? (
              <p className="text-sm text-muted-foreground italic border rounded-lg p-3">
                Select at least one squad to see their schedule.
              </p>
            ) : squadSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic border rounded-lg p-3">
                No standard schedule configured for the selected squad(s) — add sessions in Schedule Manager first.
              </p>
            ) : (
              <div className="border rounded-lg divide-y text-sm">
                {squadSessions.map(rs => {
                  const loc = locations.find(l => l.id === rs.venueId);
                  const sq = squads.find(s => s.id === rs.squadId);
                  return (
                    <div key={rs.id} className="flex items-center gap-4 px-3 py-2">
                      <span className="font-medium w-24 shrink-0">{DAY_NAMES[rs.dayOfWeek]}</span>
                      <span className="text-muted-foreground">{formatSessionTime(rs.startTime, rs.endTime)}</span>
                      {sq && selectedSquadIds.length > 1 && <span className="text-xs text-muted-foreground">{sq.name}</span>}
                      {loc && <span className="text-xs text-muted-foreground ml-auto">{loc.name}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {startStr && endStr && new Date(endStr) >= new Date(startStr) && (
            <p className="text-xs text-muted-foreground">
              Competitions within this date range will be automatically included and highlighted.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{ backgroundColor: canCreate ? '#4B9A4A' : undefined }}
            className={canCreate ? 'text-white hover:opacity-90' : ''}
          >
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan Table ───────────────────────────────────────────────────────────────

interface PlanTableProps {
  plan: SeasonPlan;
  isEditing: boolean;
  onUpdateRows: (rows: SeasonPlanRow[]) => void;
}

function PlanTable({ plan, isEditing, onUpdateRows }: PlanTableProps) {
  const visibleRows = plan.rows.filter(r => !r.removed);

  const updateRow = (id: string, patch: Partial<SeasonPlanRow>) => {
    onUpdateRows(plan.rows.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const deleteRow = (id: string) => {
    onUpdateRows(plan.rows.map(r => r.id === id ? { ...r, removed: true } : r));
  };

  const addRow = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newRow: SeasonPlanRow = {
      id: uuid(),
      date: today,
      type: 'manual',
      sessionTime: '',
      trainingWeek: getTrainingWeek(today, plan.startDate),
      competitionEvent: '',
      trainingPhase: '',
      intensity: '',
      mainFocus: '',
      secondaryFocus: '',
      testSet: false,
      notes: '',
      isInHoliday: isHoliday(today),
      removed: false,
    };
    onUpdateRows([...plan.rows, newRow]);
  };

  let lastMonth = -1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[1200px]">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide sticky top-0 z-10">
            <th className="text-left px-3 py-2.5 font-medium w-16">Month</th>
            <th className="text-left px-3 py-2.5 font-medium w-16">Date</th>
            <th className="text-left px-3 py-2.5 font-medium w-10">Day</th>
            <th className="text-left px-3 py-2.5 font-medium w-28">Session Time</th>
            <th className="text-left px-3 py-2.5 font-medium w-10">Wk</th>
            <th className="text-left px-3 py-2.5 font-medium">Competition / Event</th>
            <th className="text-left px-3 py-2.5 font-medium w-28">Training Phase</th>
            <th className="text-left px-3 py-2.5 font-medium w-28">Intensity</th>
            <th className="text-left px-3 py-2.5 font-medium">Main Focus</th>
            <th className="text-left px-3 py-2.5 font-medium">Secondary Focus / Set Type</th>
            <th className="text-center px-3 py-2.5 font-medium w-16">Test Set?</th>
            <th className="text-left px-3 py-2.5 font-medium">Notes / Adjustments</th>
            {isEditing && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map(row => {
            const month = row.date.getMonth();
            const showMonthHeader = month !== lastMonth;
            if (showMonthHeader) lastMonth = month;

            const rowCls = cn(
              'border-b transition-colors',
              row.type === 'competition'
                ? 'bg-amber-50 border-l-4 border-l-amber-400'
                : row.isInHoliday
                ? 'bg-slate-100'
                : 'hover:bg-muted/20',
            );

            return (
              <React.Fragment key={row.id}>
                {showMonthHeader && (
                  <tr>
                    <td
                      colSpan={isEditing ? 13 : 12}
                      className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 border-b border-t"
                    >
                      {format(row.date, 'MMMM yyyy')}
                    </td>
                  </tr>
                )}
                <tr className={rowCls}>
                  {/* Month — blank after divider */}
                  <td className="px-3 py-2" />

                  {/* Date */}
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-xs">
                    {row.type === 'manual' && isEditing ? (
                      <Input
                        type="date"
                        className="h-7 text-xs w-32 px-1"
                        value={format(row.date, 'yyyy-MM-dd')}
                        onChange={e => {
                          const d = new Date(e.target.value + 'T00:00:00');
                          if (!isNaN(d.getTime())) {
                            updateRow(row.id, {
                              date: d,
                              trainingWeek: getTrainingWeek(d, plan.startDate),
                              isInHoliday: isHoliday(d),
                            });
                          }
                        }}
                      />
                    ) : (
                      format(row.date, 'd MMM')
                    )}
                  </td>

                  {/* Day */}
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {format(row.date, 'EEE')}
                  </td>

                  {/* Session Time */}
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {row.sessionTime || (row.type === 'competition' ? 'Competition' : '—')}
                  </td>

                  {/* Training Week */}
                  <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {row.trainingWeek > 0 ? `Wk ${row.trainingWeek}` : '—'}
                  </td>

                  {/* Competition / Event */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        className="h-7 text-xs px-1 min-w-[140px]"
                        value={row.competitionEvent}
                        onChange={e => updateRow(row.id, { competitionEvent: e.target.value })}
                        placeholder="—"
                      />
                    ) : (
                      <span className={cn(
                        'text-xs',
                        row.type === 'competition' ? 'text-amber-700 font-medium' : 'text-muted-foreground',
                      )}>
                        {row.competitionEvent || '—'}
                      </span>
                    )}
                  </td>

                  {/* Training Phase */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Select
                        value={toSelectVal(row.trainingPhase)}
                        onValueChange={v => updateRow(row.id, { trainingPhase: fromSelectVal(v) as TrainingPhase })}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {TRAINING_PHASES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn('text-xs', phaseColor(row.trainingPhase))}>
                        {row.trainingPhase || '—'}
                      </span>
                    )}
                  </td>

                  {/* Intensity */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Select
                        value={toSelectVal(row.intensity)}
                        onValueChange={v => updateRow(row.id, { intensity: fromSelectVal(v) })}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {INTENSITY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.intensity || '—'}</span>
                    )}
                  </td>

                  {/* Main Focus */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        className="h-7 text-xs px-1 min-w-[140px]"
                        value={row.mainFocus}
                        onChange={e => updateRow(row.id, { mainFocus: e.target.value })}
                        placeholder="—"
                      />
                    ) : (
                      <span className={cn(
                        'text-xs',
                        row.type === 'competition' ? 'font-medium text-amber-800' : '',
                        !row.mainFocus ? 'text-muted-foreground' : '',
                      )}>
                        {row.mainFocus || '—'}
                      </span>
                    )}
                  </td>

                  {/* Secondary Focus */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        className="h-7 text-xs px-1 min-w-[140px]"
                        value={row.secondaryFocus}
                        onChange={e => updateRow(row.id, { secondaryFocus: e.target.value })}
                        placeholder="—"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.secondaryFocus || '—'}</span>
                    )}
                  </td>

                  {/* Test Set Y/N */}
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, { testSet: !row.testSet })}
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded border transition-colors',
                          row.testSet
                            ? 'bg-green-100 border-green-300 text-green-700'
                            : 'bg-muted border-border text-muted-foreground hover:bg-muted/80',
                        )}
                      >
                        {row.testSet ? 'Y' : 'N'}
                      </button>
                    ) : row.testSet ? (
                      <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">Y</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">N</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        className="h-7 text-xs px-1 min-w-[160px]"
                        value={row.notes}
                        onChange={e => updateRow(row.id, { notes: e.target.value })}
                        placeholder="—"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.notes || '—'}</span>
                    )}
                  </td>

                  {/* Delete */}
                  {isEditing && (
                    <td className="px-1 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRow(row.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              </React.Fragment>
            );
          })}

          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={isEditing ? 13 : 12} className="px-3 py-8 text-center text-muted-foreground text-sm">
                No rows in this plan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isEditing && (
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeasonPlanner({ squads, recurringSessions, locations }: SeasonPlannerProps) {
  const [selectedSquadId, setSelectedSquadId] = useState<string>('1');
  const [plans, setPlans] = useState<SeasonPlan[]>([INITIAL_PLAN, PERFORMANCE_ELITE_PLAN]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(INITIAL_PLAN.id);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRows, setDraftRows] = useState<SeasonPlanRow[]>([]);
  const [draftName, setDraftName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const squadPlans = useMemo(
    () => plans.filter(p => p.squadIds.includes(selectedSquadId)),
    [plans, selectedSquadId],
  );

  const selectedPlan = useMemo(
    () => plans.find(p => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const activePlan: SeasonPlan | null = isEditing && selectedPlan
    ? { ...selectedPlan, name: draftName, rows: draftRows }
    : selectedPlan;

  const visibleRowCount = activePlan ? activePlan.rows.filter(r => !r.removed).length : 0;

  const handleCreatePlan = (plan: SeasonPlan) => {
    setPlans(prev => [...prev, plan]);
    setSelectedPlanId(plan.id);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (!selectedPlan) return;
    setDraftName(selectedPlan.name);
    setDraftRows(selectedPlan.rows.map(r => ({ ...r })));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedPlanId) return;
    setPlans(prev =>
      prev.map(p => p.id === selectedPlanId ? { ...p, name: draftName, rows: draftRows } : p),
    );
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraftRows([]);
    setDraftName('');
  };

  return (
    <>
      {/* Mobile notice */}
      <div className="lg:hidden flex flex-col items-center justify-center h-full p-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <MonitorOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">Desktop Only</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Season Planner is designed for larger screens. Please use a desktop or laptop to access this feature.
          </p>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-col h-full">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <CalendarRange className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            <h1 className="text-xl font-semibold">Season Planner</h1>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Squad:</Label>
            <Select
              value={toSelectVal(selectedSquadId)}
              onValueChange={v => {
                const id = fromSelectVal(v);
                setSelectedSquadId(id);
                setSelectedPlanId(null);
                setIsEditing(false);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select squad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Select squad</SelectItem>
                {squads.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-64 shrink-0 border-r flex flex-col bg-card">
            <div className="p-3 border-b">
              <Button
                className="w-full gap-2 text-white hover:opacity-90"
                style={{ backgroundColor: '#4B9A4A' }}
                disabled={!selectedSquadId}
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Create Plan
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!selectedSquadId && (
                <p className="text-xs text-muted-foreground text-center mt-6 px-3">
                  Select a squad to view or create plans.
                </p>
              )}
              {selectedSquadId && squadPlans.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-6 px-3">
                  No plans yet. Click "Create Plan" to get started.
                </p>
              )}
              {squadPlans.map(plan => {
                const active = plan.id === selectedPlanId;
                const count = plan.rows.filter(r => !r.removed).length;
                const planSquads = plan.squadIds.map(id => squads.find(s => s.id === id)).filter(Boolean) as Squad[];
                return (
                  <button
                    key={plan.id}
                    onClick={() => { setSelectedPlanId(plan.id); setIsEditing(false); }}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2.5 relative transition-all text-sm',
                      active ? 'bg-accent/50' : 'hover:bg-muted/50',
                    )}
                  >
                    {active && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <p className="font-medium truncate">{plan.name}</p>
                    {planSquads.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {planSquads.map(sq => (
                          <span key={sq.id} className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full">{sq.name}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(plan.startDate, 'd MMM yy')} – {format(plan.endDate, 'd MMM yy')}
                    </p>
                    <p className="text-xs text-muted-foreground">{count} rows</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {!selectedSquadId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <CalendarRange className="h-12 w-12 opacity-20" />
                <p className="text-sm">Select a squad to get started</p>
              </div>
            ) : !activePlan ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <CalendarRange className="h-12 w-12 opacity-20" />
                <p className="text-sm">Create or select a plan</p>
              </div>
            ) : (
              <>
                {/* Plan header */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isEditing ? (
                      <Input
                        className="h-8 font-semibold text-base w-56"
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                      />
                    ) : (
                      <h2 className="font-semibold text-base truncate">{activePlan.name}</h2>
                    )}
                    <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                      {format(activePlan.startDate, 'd MMM yyyy')} – {format(activePlan.endDate, 'd MMM yyyy')}
                    </span>
                    <Badge variant="secondary" className="shrink-0">{visibleRowCount} rows</Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
                        Competition
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-sm bg-slate-200 border border-slate-300" />
                        School holiday
                      </span>
                    </div>
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1.5">
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          style={{ backgroundColor: '#4B9A4A' }}
                          className="gap-1.5 text-white hover:opacity-90"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1.5">
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <PlanTable
                    plan={activePlan}
                    isEditing={isEditing}
                    onUpdateRows={rows => { if (isEditing) setDraftRows(rows); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePlanModal
          squads={squads}
          recurringSessions={recurringSessions}
          locations={locations}
          initialSquadIds={selectedSquadId ? [selectedSquadId] : []}
          onCreate={handleCreatePlan}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
