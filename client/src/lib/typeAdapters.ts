import type {
  Squad as BackendSquad,
  Location as BackendLocation,
  Coach as BackendCoach,
  Swimmer as BackendSwimmer,
  SwimmingSession as BackendSession,
  Attendance as BackendAttendance,
} from '@shared/schema';

export interface Squad {
  id: string;
  name: string;
  color: string;
  primaryCoachId?: string | null;
}

export type PoolType = '25m' | '50m';

export interface Location {
  id: string;
  name: string;
  poolType: PoolType;
}

export type QualificationLevel = 'No Qualification' | 'Level 1' | 'Level 2' | 'Level 3';

export interface Coach {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  name: string;
  level: QualificationLevel;
  dateOfBirth: Date;
}

export interface Swimmer {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  squadId: string;
  asaNumber: number;
  dateOfBirth: Date;
  gender: 'male' | 'female';
}

export type SessionFocus =
  | 'Aerobic capacity'
  | 'Anaerobic capacity'
  | 'Speed'
  | 'Technique'
  | 'Recovery'
  | 'Starts & turns';

export type AttendanceStatus = 'Present' | '1st half only' | '2nd half only' | 'Absent';
export type AttendanceNote = '-' | 'Late' | 'Very Late';

export interface AttendanceRecord {
  swimmerId: string;
  status: AttendanceStatus;
  notes: AttendanceNote;
}

export interface StrokeBreakdown {
  swim: number;
  drill: number;
  kick: number;
  pull: number;
}

export interface DistanceBreakdown {
  total: number;
  frontCrawl: number;
  frontCrawlBreakdown: StrokeBreakdown;
  backstroke: number;
  backstrokeBreakdown: StrokeBreakdown;
  breaststroke: number;
  breaststrokeBreakdown: StrokeBreakdown;
  butterfly: number;
  butterflyBreakdown: StrokeBreakdown;
  individualMedley: number;
  individualMedleyBreakdown: StrokeBreakdown;
  no1: number;
  no1Breakdown: StrokeBreakdown;
}

export interface Session {
  id: string;
  squadId: string;
  squadIds?: string[];
  locationId: string;
  leadCoachId: string;
  secondCoachId?: string | null;
  helperId?: string | null;
  setWriterId: string;
  date: Date;
  startTime: string;
  endTime: string;
  focus: SessionFocus;
  content?: string | null;
  contentHtml?: string | null;
  sessionNotes?: string | null;
  distanceBreakdown?: DistanceBreakdown;
  attendance?: AttendanceRecord[];
}

export function adaptSquad(backend: BackendSquad): Squad {
  return {
    id: backend.id,
    name: backend.squadName,
    color: backend.color || '#3B82F6',
    primaryCoachId: backend.primaryCoachId,
  };
}

export function adaptSquadToBackend(frontend: Omit<Squad, 'id'>): Omit<BackendSquad, 'id' | 'createdAt'> {
  return {
    squadName: frontend.name,
    color: frontend.color,
    primaryCoachId: frontend.primaryCoachId || null,
  };
}

export function adaptLocation(backend: BackendLocation): Location {
  return {
    id: backend.id,
    name: backend.poolName,
    poolType: backend.poolType === 'SC' ? '25m' : '50m',
  };
}

export function adaptLocationToBackend(frontend: Omit<Location, 'id'>): Omit<BackendLocation, 'id' | 'createdAt'> {
  return {
    poolName: frontend.name,
    poolType: frontend.poolType === '25m' ? 'SC' : 'LC',
  };
}

export function adaptCoach(backend: BackendCoach): Coach {
  return {
    id: backend.id,
    userId: backend.userId,
    firstName: backend.firstName,
    lastName: backend.lastName,
    name: `${backend.firstName} ${backend.lastName}`,
    level: backend.level as QualificationLevel,
    dateOfBirth: new Date(backend.dob),
  };
}

export function adaptCoachToBackend(frontend: Omit<Coach, 'id' | 'name'>): Omit<BackendCoach, 'id' | 'createdAt' | 'userId'> {
  return {
    firstName: frontend.firstName,
    lastName: frontend.lastName,
    level: frontend.level,
    dob: frontend.dateOfBirth.toISOString().split('T')[0],
  };
}

export function adaptSwimmer(backend: BackendSwimmer): Swimmer {
  return {
    id: backend.id,
    firstName: backend.firstName,
    lastName: backend.lastName,
    name: `${backend.firstName} ${backend.lastName}`,
    squadId: backend.squadId,
    asaNumber: backend.asaNumber,
    dateOfBirth: new Date(backend.dob),
    gender: (backend.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
  };
}

export function adaptSwimmerToBackend(frontend: Omit<Swimmer, 'id' | 'name'>): Omit<BackendSwimmer, 'id' | 'createdAt'> {
  return {
    firstName: frontend.firstName,
    lastName: frontend.lastName,
    squadId: frontend.squadId,
    asaNumber: frontend.asaNumber,
    dob: frontend.dateOfBirth.toISOString().split('T')[0],
    gender: frontend.gender,
  };
}

function adaptAttendanceStatus(backend: string): AttendanceStatus {
  switch (backend) {
    case 'Present':
      return 'Present';
    case 'First Half Only':
    case '1st half only':  // Handle both formats
      return '1st half only';
    case 'Second Half Only':
    case '2nd half only':  // Handle both formats
      return '2nd half only';
    case 'Absent':
      return 'Absent';
    default:
      console.warn(`Unknown attendance status: ${backend}, defaulting to Absent`);
      return 'Absent';
  }
}

function adaptAttendanceStatusToBackend(frontend: AttendanceStatus): string {
  switch (frontend) {
    case 'Present':
      return 'Present';
    case '1st half only':
      return 'First Half Only';
    case '2nd half only':
      return 'Second Half Only';
    case 'Absent':
      return 'Absent';
  }
}

function adaptAttendanceNote(backend: string | null): AttendanceNote {
  if (!backend) return '-';
  if (backend === 'Late') return 'Late';
  if (backend === 'Very Late') return 'Very Late';
  return '-';
}

function adaptAttendanceNoteToBackend(frontend: AttendanceNote): string | null {
  if (frontend === '-') return null;
  return frontend;
}

export function adaptAttendance(backend: BackendAttendance): AttendanceRecord {
  return {
    swimmerId: backend.swimmerId,
    status: adaptAttendanceStatus(backend.status),
    notes: adaptAttendanceNote(backend.notes),
  };
}

export function adaptAttendanceToBackend(
  frontend: AttendanceRecord,
  sessionId: string
): Omit<BackendAttendance, 'id' | 'createdAt'> {
  return {
    sessionId,
    swimmerId: frontend.swimmerId,
    status: adaptAttendanceStatusToBackend(frontend.status),
    notes: adaptAttendanceNoteToBackend(frontend.notes),
  };
}

export function adaptSession(backend: BackendSession & { attendance?: BackendAttendance[] }): Session {
  const distanceBreakdown: DistanceBreakdown = {
    total: backend.totalDistance,
    frontCrawl:
      backend.totalFrontCrawlSwim +
      backend.totalFrontCrawlDrill +
      backend.totalFrontCrawlKick +
      backend.totalFrontCrawlPull,
    frontCrawlBreakdown: {
      swim: backend.totalFrontCrawlSwim,
      drill: backend.totalFrontCrawlDrill,
      kick: backend.totalFrontCrawlKick,
      pull: backend.totalFrontCrawlPull,
    },
    backstroke:
      backend.totalBackstrokeSwim +
      backend.totalBackstrokeDrill +
      backend.totalBackstrokeKick +
      backend.totalBackstrokePull,
    backstrokeBreakdown: {
      swim: backend.totalBackstrokeSwim,
      drill: backend.totalBackstrokeDrill,
      kick: backend.totalBackstrokeKick,
      pull: backend.totalBackstrokePull,
    },
    breaststroke:
      backend.totalBreaststrokeSwim +
      backend.totalBreaststrokeDrill +
      backend.totalBreaststrokeKick +
      backend.totalBreaststrokePull,
    breaststrokeBreakdown: {
      swim: backend.totalBreaststrokeSwim,
      drill: backend.totalBreaststrokeDrill,
      kick: backend.totalBreaststrokeKick,
      pull: backend.totalBreaststrokePull,
    },
    butterfly:
      backend.totalButterflySwim +
      backend.totalButterflyDrill +
      backend.totalButterflyKick +
      backend.totalButterflyPull,
    butterflyBreakdown: {
      swim: backend.totalButterflySwim,
      drill: backend.totalButterflyDrill,
      kick: backend.totalButterflyKick,
      pull: backend.totalButterflyPull,
    },
    individualMedley:
      backend.totalIMSwim +
      backend.totalIMDrill +
      backend.totalIMKick +
      backend.totalIMPull,
    individualMedleyBreakdown: {
      swim: backend.totalIMSwim,
      drill: backend.totalIMDrill,
      kick: backend.totalIMKick,
      pull: backend.totalIMPull,
    },
    no1:
      backend.totalNo1Swim +
      backend.totalNo1Drill +
      backend.totalNo1Kick +
      backend.totalNo1Pull,
    no1Breakdown: {
      swim: backend.totalNo1Swim,
      drill: backend.totalNo1Drill,
      kick: backend.totalNo1Kick,
      pull: backend.totalNo1Pull,
    },
  };

  return {
    id: backend.id,
    squadId: backend.squadId,
    locationId: backend.poolId,
    leadCoachId: backend.leadCoachId,
    secondCoachId: backend.secondCoachId,
    helperId: backend.helperId,
    setWriterId: backend.setWriterId,
    date: new Date(backend.sessionDate),
    startTime: backend.startTime,
    endTime: backend.endTime,
    focus: backend.focus as SessionFocus,
    content: backend.sessionContent,
    contentHtml: backend.sessionContentHtml,
    sessionNotes: backend.sessionNotes,
    distanceBreakdown,
    attendance: backend.attendance?.map(adaptAttendance),
  };
}

export function adaptSessionToBackend(
  frontend: Omit<Session, 'id' | 'distanceBreakdown' | 'attendance'>
): Omit<BackendSession, 'id' | 'createdAt' | 'updatedAt'> & { squadIds?: string[] } {
  const startParts = frontend.startTime.split(':');
  const endParts = frontend.endTime.split(':');
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
  const durationHours = (endMinutes - startMinutes) / 60;

  return {
    sessionDate: frontend.date.toISOString().split('T')[0],
    startTime: frontend.startTime,
    endTime: frontend.endTime,
    duration: durationHours.toFixed(2),
    poolId: frontend.locationId,
    squadId: frontend.squadId,
    squadIds: frontend.squadIds,
    leadCoachId: frontend.leadCoachId,
    secondCoachId: frontend.secondCoachId || null,
    helperId: frontend.helperId || null,
    setWriterId: frontend.setWriterId,
    focus: frontend.focus,
    sessionContent: frontend.content || null,
    sessionContentHtml: frontend.contentHtml || null,
    totalDistance: 0,
    totalFrontCrawlSwim: 0,
    totalFrontCrawlDrill: 0,
    totalFrontCrawlKick: 0,
    totalFrontCrawlPull: 0,
    totalBackstrokeSwim: 0,
    totalBackstrokeDrill: 0,
    totalBackstrokeKick: 0,
    totalBackstrokePull: 0,
    totalBreaststrokeSwim: 0,
    totalBreaststrokeDrill: 0,
    totalBreaststrokeKick: 0,
    totalBreaststrokePull: 0,
    totalButterflySwim: 0,
    totalButterflyDrill: 0,
    totalButterflyKick: 0,
    totalButterflyPull: 0,
    totalIMSwim: 0,
    totalIMDrill: 0,
    totalIMKick: 0,
    totalIMPull: 0,
    totalNo1Swim: 0,
    totalNo1Drill: 0,
    totalNo1Kick: 0,
    totalNo1Pull: 0,
  };
}

export function updateSessionDistances(
  baseSession: Omit<BackendSession, 'id' | 'createdAt' | 'updatedAt'>,
  distanceBreakdown: DistanceBreakdown
): Omit<BackendSession, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...baseSession,
    totalDistance: distanceBreakdown.total,
    totalFrontCrawlSwim: distanceBreakdown.frontCrawlBreakdown.swim,
    totalFrontCrawlDrill: distanceBreakdown.frontCrawlBreakdown.drill,
    totalFrontCrawlKick: distanceBreakdown.frontCrawlBreakdown.kick,
    totalFrontCrawlPull: distanceBreakdown.frontCrawlBreakdown.pull,
    totalBackstrokeSwim: distanceBreakdown.backstrokeBreakdown.swim,
    totalBackstrokeDrill: distanceBreakdown.backstrokeBreakdown.drill,
    totalBackstrokeKick: distanceBreakdown.backstrokeBreakdown.kick,
    totalBackstrokePull: distanceBreakdown.backstrokeBreakdown.pull,
    totalBreaststrokeSwim: distanceBreakdown.breaststrokeBreakdown.swim,
    totalBreaststrokeDrill: distanceBreakdown.breaststrokeBreakdown.drill,
    totalBreaststrokeKick: distanceBreakdown.breaststrokeBreakdown.kick,
    totalBreaststrokePull: distanceBreakdown.breaststrokeBreakdown.pull,
    totalButterflySwim: distanceBreakdown.butterflyBreakdown.swim,
    totalButterflyDrill: distanceBreakdown.butterflyBreakdown.drill,
    totalButterflyKick: distanceBreakdown.butterflyBreakdown.kick,
    totalButterflyPull: distanceBreakdown.butterflyBreakdown.pull,
    totalIMSwim: distanceBreakdown.individualMedleyBreakdown.swim,
    totalIMDrill: distanceBreakdown.individualMedleyBreakdown.drill,
    totalIMKick: distanceBreakdown.individualMedleyBreakdown.kick,
    totalIMPull: distanceBreakdown.individualMedleyBreakdown.pull,
    totalNo1Swim: distanceBreakdown.no1Breakdown.swim,
    totalNo1Drill: distanceBreakdown.no1Breakdown.drill,
    totalNo1Kick: distanceBreakdown.no1Breakdown.kick,
    totalNo1Pull: distanceBreakdown.no1Breakdown.pull,
  };
}
