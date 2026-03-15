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