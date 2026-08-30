export interface Squad {
  id: string;
  name: string;
  color: string;
  primaryCoachId?: string;
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
  firstName: string;
  lastName: string;
  level: QualificationLevel;
  dateOfBirth: Date;
  // Computed property for backward compatibility
  get name(): string;
}

export interface Swimmer {
  id: string;
  firstName: string;
  lastName: string;
  squadId: string;
  asaNumber: number;
  dateOfBirth: Date;
  // Computed property for backward compatibility
  get name(): string;
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
}

export interface Session {
  id: string;
  squadId: string;
  additionalSquadIds?: string[];
  locationId: string;
  leadCoachId: string;
  secondCoachId?: string;
  helperId?: string;
  setWriterId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  focus: SessionFocus;
  content?: string;
  distanceBreakdown?: DistanceBreakdown;
  attendance?: AttendanceRecord[];
  detectedDrills?: string[]; // Array of drill IDs detected in the session content
  sessionNotes?: string; // Coach's personal notes for this specific session
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  creatorId: string;
  createdDate: Date;
}

export type StrokeType = 'Freestyle' | 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'Starts' | 'Turns';

export interface Drill {
  id: string;
  name: string;
  strokeType: StrokeType;
  description?: string;
  videoUrl?: string;
  creatorId: string;
  createdDate: Date;
}

export interface TimeBlock {
  date: Date; // Date this time block applies to
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface CoachAssignment {
  coachId: string;
  timeBlocks: TimeBlock[];
}

export interface Competition {
  id: string;
  name: string;
  locationId: string;
  startDate: Date;
  endDate: Date; // Can be same as startDate for single-day competitions
  color: string; // Color for diagonal stripe pattern
  coachAssignments: CoachAssignment[];
}

export interface FeedbackRatings {
  engagement: number;      // 1-10
  effortAndIntent: number; // 1-10
  enjoyment: number;       // 1-10
  focus: number;           // 1-10
  techniqueQuality: number; // 1-10
  sessionStructure: number; // 1-10
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  coachId: string; // Who provided the feedback
  isPrivate: boolean;
  ratings: FeedbackRatings;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
}

export type NoteType = 'text' | 'checklist';
export type NoteStatus = 'open' | 'closed';

export interface CoachNote {
  id: string;
  title: string;
  type: NoteType;
  content?: string; // For text notes
  items?: NoteItem[]; // For checklist notes
  squadIds: string[]; // Multiple squads
  status: NoteStatus;
  creatorId: string;
  createdDate: Date;
  updatedDate: Date;
}

// Schedule Management Types
export type CoachRole = 'lead' | 'assistant' | 'helper' | 'setWriter';

export interface RecurringSession {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "18:00"
  endTime: string; // "19:30"
  venueId: string;
  squadId: string;
  sessionType?: string; // e.g., "Skills", "Endurance"
  leadCoachId: string; // Mandatory
  assistantCoachId?: string; // Optional
  helperId?: string; // Optional
  setWriterId: string; // Mandatory
  notes?: string;
}

export interface Availability {
  id: string;
  coachId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  isFullDay: boolean;
  startTime?: string; // If partial day
  endTime?: string; // If partial day
  reason?: string;
  status: 'active' | 'cancelled';
}

export type CoverRequestStatus = 'pending' | 'covered' | 'cancelled';

export interface CoverRequest {
  id: string;
  sessionId: string;
  requestingCoachId: string;
  role: CoachRole;
  requestDate: string;
  status: CoverRequestStatus;
  coveringCoachId?: string;
  notes?: string;
}

// ── Race Results & Performance ──────────────────────────────────────────────
export type RaceStroke = 'Freestyle' | 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'Individual Medley';
export type RaceDistance = 50 | 100 | 200 | 400 | 800 | 1500;
export type CourseType = 'SC' | 'LC';
export type SwimmerGender = 'M' | 'F';
export type QualificationStatus = 'auto' | 'base' | 'none';

export interface RaceResult {
  id: string;
  swimmerId: string;
  stroke: RaceStroke;
  distance: RaceDistance;
  courseType: CourseType;
  timeSeconds: number;
  date: Date;
  competition: string;
  isNewPB: boolean;
}

export interface QualificationStandard {
  stroke: RaceStroke;
  distance: RaceDistance;
  gender: SwimmerGender;
  ageGroup: number; // age at 31 Dec of competition year
  countyBaseTime?: number;
  countyAutoTime?: number;
  regionalBaseTime?: number;
  regionalAutoTime?: number;
}

export interface FloatSession {
  id: string;
  coachId: string;
  locationId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  notes?: string;
}