import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RecurringSession, Squad, Location, Coach, Session, SessionFocus, Availability, CoverRequest, FloatSession } from '../types';
import { Calendar, AlertTriangle, CheckCircle2, XCircle, Edit, Plus, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addDays, startOfWeek, format, addWeeks, parse } from 'date-fns';
import { Badge } from './ui/badge';

interface GenerateSessionsProps {
  recurringSessions: RecurringSession[];
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  sessions: Session[];
  onAddSessions: (sessions: Session[]) => void;
  onAddFloatSessions: (floatSessions: FloatSession[]) => void;
  availabilities: Availability[];
  onCreateCoverRequest: (request: CoverRequest) => void;
}

type GenerationType = 'next-week' | '4-weeks' | 'custom';
type DraftSession = Omit<Session, 'leadCoachId' | 'secondCoachId' | 'helperId' | 'setWriterId'> & {
  leadCoachId?: string;
  secondCoachId?: string | null; // null means explicitly set to "None"
  helperId?: string | null; // null means explicitly set to "None"
  setWriterId?: string;
  status: 'ok' | 'missing-lead' | 'missing-writer' | 'no-level2' | 'conflict' | 'needs-cover';
  warnings: string[];
  vacantRoles: {
    lead?: { reason: string };
    assistant?: { reason: string };
    helper?: { reason: string };
    writer?: { reason: string };
  };
};

export function GenerateSessions({
  recurringSessions,
  squads,
  locations,
  coaches,
  sessions,
  onAddSessions,
  onAddFloatSessions,
  availabilities,
  onCreateCoverRequest
}: GenerateSessionsProps) {
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [generationType, setGenerationType] = useState<GenerationType>('next-week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [draftSessions, setDraftSessions] = useState<DraftSession[]>([]);
  const [draftFloatSessions, setDraftFloatSessions] = useState<FloatSession[]>([]);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddFloatModal, setShowAddFloatModal] = useState(false);

  const handleGenerate = () => {
    let startDate: Date;
    let endDate: Date;

    const today = new Date();

    switch (generationType) {
      case 'next-week':
        startDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        endDate = addDays(startDate, 6);
        break;
      case '4-weeks':
        startDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        endDate = addDays(startDate, 27); // 4 weeks = 28 days - 1
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          alert('Please select both start and end dates');
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
    }

    // Generate draft sessions from recurring sessions
    const drafts: DraftSession[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Find all recurring sessions for this day
      const sessionsForDay = recurringSessions.filter(rs => rs.dayOfWeek === dayOfWeek);
      
      sessionsForDay.forEach(rs => {
        const squad = squads.find(s => s.id === rs.squadId);

        // Helper function to check if a coach is absent during this session
        const isCoachAbsent = (coachId: string | undefined): { absent: boolean; reason: string } => {
          if (!coachId) return { absent: false, reason: '' };

          const sessionDateStr = format(currentDate, 'yyyy-MM-dd');
          const coachAbsences = availabilities.filter(a =>
            a.coachId === coachId &&
            a.status === 'active' &&
            sessionDateStr >= a.startDate &&
            sessionDateStr <= a.endDate
          );

          for (const absence of coachAbsences) {
            // If it's a full day absence, they're unavailable
            if (absence.isFullDay) {
              return { absent: true, reason: absence.reason || 'Unavailable' };
            }

            // If it's a partial day, check if times overlap
            if (absence.startTime && absence.endTime) {
              const sessionStart = rs.startTime;
              const sessionEnd = rs.endTime;
              const absenceStart = absence.startTime;
              const absenceEnd = absence.endTime;

              // Check if time periods overlap
              if (sessionStart < absenceEnd && sessionEnd > absenceStart) {
                return { absent: true, reason: absence.reason || 'Unavailable' };
              }
            }
          }

          return { absent: false, reason: '' };
        };

        // Check availability and leave fields empty if coach is unavailable
        const leadAbsence = isCoachAbsent(rs.leadCoachId);
        const assistantAbsence = isCoachAbsent(rs.assistantCoachId);
        const helperAbsence = isCoachAbsent(rs.helperId);
        const writerAbsence = isCoachAbsent(rs.setWriterId);

        // Create draft session
        const draft: DraftSession = {
          id: `session-${Date.now()}-${Math.random()}`,
          squadId: rs.squadId,
          locationId: rs.venueId,
          leadCoachId: leadAbsence.absent ? undefined : rs.leadCoachId,
          secondCoachId: assistantAbsence.absent ? undefined : rs.assistantCoachId,
          helperId: helperAbsence.absent ? undefined : rs.helperId,
          setWriterId: writerAbsence.absent ? undefined : rs.setWriterId,
          date: new Date(currentDate),
          startTime: rs.startTime,
          endTime: rs.endTime,
          focus: 'Aerobic capacity' as SessionFocus,
          status: 'ok',
          warnings: [],
          vacantRoles: {}
        };

        // Track vacant roles with reasons
        if (leadAbsence.absent) {
          draft.vacantRoles.lead = { reason: leadAbsence.reason };
        }
        if (assistantAbsence.absent) {
          draft.vacantRoles.assistant = { reason: assistantAbsence.reason };
        }
        if (helperAbsence.absent) {
          draft.vacantRoles.helper = { reason: helperAbsence.reason };
        }
        if (writerAbsence.absent) {
          draft.vacantRoles.writer = { reason: writerAbsence.reason };
        }

        drafts.push(draft);
      });

      currentDate = addDays(currentDate, 1);
    }

    // Sort by date and time
    drafts.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    // Now check each session for issues
    drafts.forEach(draft => {
      const warnings: string[] = [];
      let status: DraftSession['status'] = 'ok';

      // Check mandatory roles
      if (!draft.leadCoachId) {
        const reason = draft.vacantRoles.lead?.reason;
        warnings.push(reason ? `Lead Coach vacant: ${reason}` : 'Lead Coach vacant');
        status = 'needs-cover';
      }
      if (!draft.setWriterId) {
        const reason = draft.vacantRoles.writer?.reason;
        warnings.push(reason ? `Set Writer vacant: ${reason}` : 'Set Writer vacant');
        status = 'needs-cover';
      }

      // Check optional roles that are vacant
      if (!draft.secondCoachId && draft.vacantRoles.assistant) {
        warnings.push(`Assistant Coach vacant: ${draft.vacantRoles.assistant.reason}`);
        if (status === 'ok') status = 'needs-cover';
      }
      if (!draft.helperId && draft.vacantRoles.helper) {
        warnings.push(`Helper vacant: ${draft.vacantRoles.helper.reason}`);
        if (status === 'ok') status = 'needs-cover';
      }

      draft.warnings = warnings;
      draft.status = status;
    });

    // Check Level 2 qualification at location level (must have continuous coverage)
    // Note: At initial generation, there are no float sessions yet
    drafts.forEach(draft => {
      const { hasGaps, gapDescription } = checkLevel2Coverage(draft, drafts, []);
      if (hasGaps) {
        draft.warnings.push(`No Level 2 coach at this location: ${gapDescription}`);
        draft.status = 'no-level2';
      }
    });


    setDraftSessions(drafts);
    setStep('review');
  };

  const handleConfirmCreate = () => {
    // Validate mandatory fields before creating
    const invalidSessions = draftSessions.filter(d => !d.leadCoachId || !d.setWriterId);
    if (invalidSessions.length > 0) {
      alert(`Cannot create sessions: ${invalidSessions.length} session(s) are missing mandatory fields (Lead Coach and Set Writer must be assigned).`);
      return;
    }

    // Convert draft sessions to proper Session type
    const sessionsToCreate: Session[] = draftSessions.map(draft => ({
      id: draft.id,
      squadId: draft.squadId,
      locationId: draft.locationId,
      leadCoachId: draft.leadCoachId!,
      secondCoachId: draft.secondCoachId === null ? undefined : draft.secondCoachId,
      helperId: draft.helperId === null ? undefined : draft.helperId,
      setWriterId: draft.setWriterId!,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      focus: draft.focus
    }));

    // Create all sessions
    onAddSessions(sessionsToCreate);

    // Create all float sessions
    if (draftFloatSessions.length > 0) {
      onAddFloatSessions(draftFloatSessions);
    }

    // Create cover requests ONLY for vacant roles
    let coverCount = 0;
    draftSessions.forEach(session => {
      // Lead Coach vacant
      if (!session.leadCoachId && session.vacantRoles.lead) {
        const coverRequest: CoverRequest = {
          id: `cover-${Date.now()}-${Math.random()}-lead`,
          requestingCoachId: 'system', // System-generated request
          sessionId: session.id,
          role: 'lead',
          requestDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'pending',
          notes: session.vacantRoles.lead.reason
        };
        onCreateCoverRequest(coverRequest);
        coverCount++;
      }

      // Assistant Coach vacant (not explicitly set to None)
      if (session.secondCoachId === undefined && session.vacantRoles.assistant) {
        const coverRequest: CoverRequest = {
          id: `cover-${Date.now()}-${Math.random()}-assistant`,
          requestingCoachId: 'system',
          sessionId: session.id,
          role: 'assistant',
          requestDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'pending',
          notes: session.vacantRoles.assistant.reason
        };
        onCreateCoverRequest(coverRequest);
        coverCount++;
      }

      // Helper vacant (not explicitly set to None)
      if (session.helperId === undefined && session.vacantRoles.helper) {
        const coverRequest: CoverRequest = {
          id: `cover-${Date.now()}-${Math.random()}-helper`,
          requestingCoachId: 'system',
          sessionId: session.id,
          role: 'helper',
          requestDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'pending',
          notes: session.vacantRoles.helper.reason
        };
        onCreateCoverRequest(coverRequest);
        coverCount++;
      }

      // Set Writer vacant
      if (!session.setWriterId && session.vacantRoles.writer) {
        const coverRequest: CoverRequest = {
          id: `cover-${Date.now()}-${Math.random()}-writer`,
          requestingCoachId: 'system',
          sessionId: session.id,
          role: 'setWriter',
          requestDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'pending',
          notes: session.vacantRoles.writer.reason
        };
        onCreateCoverRequest(coverRequest);
        coverCount++;
      }
    });

    setStep('select');
    setDraftSessions([]);
    setDraftFloatSessions([]);

    const floatCount = draftFloatSessions.length;
    let message = `Successfully created ${draftSessions.length} session(s)`;
    if (floatCount > 0) {
      message += ` and ${floatCount} float session(s)`;
    }
    message += '!';
    if (coverCount > 0) {
      message += `\n\n${coverCount} cover request(s) were created for vacant positions.`;
    }
    alert(message);
  };

  const handleDeleteDraft = (draftId: string) => {
    setDraftSessions(draftSessions.filter(d => d.id !== draftId));
  };

  const handleDeleteFloatDraft = (floatId: string) => {
    setDraftFloatSessions(draftFloatSessions.filter(f => f.id !== floatId));
  };

  const handleBack = () => {
    setStep('select');
    setDraftSessions([]);
    setDraftFloatSessions([]);
  };

  // Helper function to check Level 2 coverage for a session including float sessions
  const checkLevel2Coverage = (
    draft: DraftSession,
    allDrafts: DraftSession[],
    floatSessions: FloatSession[]
  ): { hasGaps: boolean; gapDescription: string } => {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const draftStartMin = timeToMinutes(draft.startTime);
    const draftEndMin = timeToMinutes(draft.endTime);

    // Build a coverage map of Level 2 presence for each minute
    const level2Coverage: boolean[] = new Array(draftEndMin - draftStartMin).fill(false);

    // Check regular sessions at this location
    const sessionsAtLocation = allDrafts.filter(other => {
      if (other.locationId !== draft.locationId) return false;
      if (other.date.getTime() !== draft.date.getTime()) return false;
      return true;
    });

    sessionsAtLocation.forEach(session => {
      const sessionStartMin = timeToMinutes(session.startTime);
      const sessionEndMin = timeToMinutes(session.endTime);

      const leadCoach = coaches.find(c => c.id === session.leadCoachId);
      const assistantCoach = session.secondCoachId && session.secondCoachId !== null
        ? coaches.find(c => c.id === session.secondCoachId)
        : null;
      const helper = session.helperId && session.helperId !== null
        ? coaches.find(c => c.id === session.helperId)
        : null;

      const hasLevel2 = (leadCoach?.level === 'Level 2') ||
                       (assistantCoach?.level === 'Level 2') ||
                       (helper?.level === 'Level 2');

      if (hasLevel2) {
        const overlapStart = Math.max(sessionStartMin, draftStartMin);
        const overlapEnd = Math.min(sessionEndMin, draftEndMin);

        if (overlapStart < overlapEnd) {
          for (let min = overlapStart; min < overlapEnd; min++) {
            const index = min - draftStartMin;
            if (index >= 0 && index < level2Coverage.length) {
              level2Coverage[index] = true;
            }
          }
        }
      }
    });

    // Check float sessions at this location
    const floatsAtLocation = floatSessions.filter(float => {
      if (float.locationId !== draft.locationId) return false;
      if (float.date.getTime() !== draft.date.getTime()) return false;
      return true;
    });

    floatsAtLocation.forEach(floatSession => {
      const floatStartMin = timeToMinutes(floatSession.startTime);
      const floatEndMin = timeToMinutes(floatSession.endTime);

      const floatCoach = coaches.find(c => c.id === floatSession.coachId);
      const hasLevel2 = floatCoach?.level === 'Level 2';

      if (hasLevel2) {
        const overlapStart = Math.max(floatStartMin, draftStartMin);
        const overlapEnd = Math.min(floatEndMin, draftEndMin);

        if (overlapStart < overlapEnd) {
          for (let min = overlapStart; min < overlapEnd; min++) {
            const index = min - draftStartMin;
            if (index >= 0 && index < level2Coverage.length) {
              level2Coverage[index] = true;
            }
          }
        }
      }
    });

    // Check for gaps in Level 2 coverage
    const gapRanges: Array<{ start: number; end: number }> = [];
    let gapStart: number | null = null;

    for (let i = 0; i < level2Coverage.length; i++) {
      if (!level2Coverage[i]) {
        if (gapStart === null) {
          gapStart = i;
        }
      } else {
        if (gapStart !== null) {
          gapRanges.push({ start: gapStart, end: i });
          gapStart = null;
        }
      }
    }

    if (gapStart !== null) {
      gapRanges.push({ start: gapStart, end: level2Coverage.length });
    }

    if (gapRanges.length > 0) {
      const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      const gapDescriptions = gapRanges.map(gap => {
        const startTime = minutesToTime(draftStartMin + gap.start);
        const endTime = minutesToTime(draftStartMin + gap.end);
        return `${startTime}-${endTime}`;
      });

      return { hasGaps: true, gapDescription: gapDescriptions.join(', ') };
    }

    return { hasGaps: false, gapDescription: '' };
  };

  const handleUpdateDraft = (draftId: string, field: string, value: any) => {
    setDraftSessions(prevDrafts => {
      const updatedDrafts = prevDrafts.map(draft => {
        if (draft.id !== draftId) return draft;

        const updated = { ...draft, [field]: value };

        // Clear vacant role tracking when a field is manually populated
        if (field === 'leadCoachId' && value) {
          delete updated.vacantRoles.lead;
        } else if (field === 'secondCoachId' && value !== undefined) {
          delete updated.vacantRoles.assistant;
        } else if (field === 'helperId' && value !== undefined) {
          delete updated.vacantRoles.helper;
        } else if (field === 'setWriterId' && value) {
          delete updated.vacantRoles.writer;
        }

        return updated;
      });

      // Re-validate all sessions (need to check Level 2 across sessions at same location)
      return updatedDrafts.map(draft => {
        const warnings: string[] = [];
        let status: DraftSession['status'] = 'ok';

        // Check mandatory roles
        if (!draft.leadCoachId) {
          const reason = draft.vacantRoles.lead?.reason;
          warnings.push(reason ? `Lead Coach vacant: ${reason}` : 'Lead Coach vacant');
          status = 'needs-cover';
        }
        if (!draft.setWriterId) {
          const reason = draft.vacantRoles.writer?.reason;
          warnings.push(reason ? `Set Writer vacant: ${reason}` : 'Set Writer vacant');
          status = 'needs-cover';
        }

        // Check optional roles that are vacant (not explicitly set to None)
        if (draft.secondCoachId === undefined && draft.vacantRoles.assistant) {
          warnings.push(`Assistant Coach vacant: ${draft.vacantRoles.assistant.reason}`);
          if (status === 'ok') status = 'needs-cover';
        }
        if (draft.helperId === undefined && draft.vacantRoles.helper) {
          warnings.push(`Helper vacant: ${draft.vacantRoles.helper.reason}`);
          if (status === 'ok') status = 'needs-cover';
        }

        // Check Level 2 requirement at location level (includes float sessions)
        const { hasGaps, gapDescription } = checkLevel2Coverage(draft, updatedDrafts, draftFloatSessions);
        if (hasGaps) {
          warnings.push(`No Level 2 coach at this location: ${gapDescription}`);
          if (status === 'ok' || status === 'needs-cover') status = 'no-level2';
        }

        return {
          ...draft,
          warnings,
          status
        };
      });
    });
  };

  const handleAddFloatSession = (floatSession: FloatSession) => {
    setDraftFloatSessions([...draftFloatSessions, floatSession]);
    setShowAddFloatModal(false);

    // Re-validate all sessions after adding float
    setDraftSessions(prev => prev.map(draft => {
      const warnings: string[] = [];
      let status: DraftSession['status'] = 'ok';

      if (!draft.leadCoachId) {
        const reason = draft.vacantRoles.lead?.reason;
        warnings.push(reason ? `Lead Coach vacant: ${reason}` : 'Lead Coach vacant');
        status = 'needs-cover';
      }
      if (!draft.setWriterId) {
        const reason = draft.vacantRoles.writer?.reason;
        warnings.push(reason ? `Set Writer vacant: ${reason}` : 'Set Writer vacant');
        status = 'needs-cover';
      }
      if (draft.secondCoachId === undefined && draft.vacantRoles.assistant) {
        warnings.push(`Assistant Coach vacant: ${draft.vacantRoles.assistant.reason}`);
        if (status === 'ok') status = 'needs-cover';
      }
      if (draft.helperId === undefined && draft.vacantRoles.helper) {
        warnings.push(`Helper vacant: ${draft.vacantRoles.helper.reason}`);
        if (status === 'ok') status = 'needs-cover';
      }

      const { hasGaps, gapDescription } = checkLevel2Coverage(draft, prev, [...draftFloatSessions, floatSession]);
      if (hasGaps) {
        warnings.push(`No Level 2 coach at this location: ${gapDescription}`);
        if (status === 'ok' || status === 'needs-cover') status = 'no-level2';
      }

      return { ...draft, warnings, status };
    }));
  };

  const handleAddRegularSession = (session: DraftSession) => {
    setDraftSessions([...draftSessions, session]);
    setShowAddSessionModal(false);
  };

  const issueCount = useMemo(() => {
    return draftSessions.filter(d => d.status !== 'ok').length;
  }, [draftSessions]);

  // Combined list for display (sorted by date and time)
  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'session' | 'float'; data: DraftSession | FloatSession }> = [
      ...draftSessions.map(s => ({ type: 'session' as const, data: s })),
      ...draftFloatSessions.map(f => ({ type: 'float' as const, data: f }))
    ];

    return items.sort((a, b) => {
      const dateA = a.data.date.getTime();
      const dateB = b.data.date.getTime();
      if (dateA !== dateB) return dateA - dateB;

      const timeA = a.data.startTime;
      const timeB = b.data.startTime;
      return timeA.localeCompare(timeB);
    });
  }, [draftSessions, draftFloatSessions]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {step === 'select' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: '#4B9A4A' }} />
                Generate Sessions from Template
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create real dated sessions from your standard weekly schedule
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generation Type */}
              <div className="space-y-3">
                <h3 className="font-medium">Select Time Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setGenerationType('next-week')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      generationType === 'next-week' 
                        ? 'border-[#4B9A4A] bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Next Week</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Generate sessions for the upcoming week (Monday-Sunday)
                    </div>
                  </button>

                  <button
                    onClick={() => setGenerationType('4-weeks')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      generationType === '4-weeks' 
                        ? 'border-[#4B9A4A] bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Next 4 Weeks</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Generate sessions for the next month
                    </div>
                  </button>

                  <button
                    onClick={() => setGenerationType('custom')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      generationType === 'custom' 
                        ? 'border-[#4B9A4A] bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Custom Range</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Choose your own start and end dates
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
              {generationType === 'custom' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 md:px-3 md:py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 md:px-3 md:py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {recurringSessions.length} recurring session(s) in your standard schedule
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  These will be used to generate sessions for the selected period
                </p>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerate}
                  size="lg"
                  style={{ backgroundColor: '#4B9A4A', color: 'white' }}
                  disabled={recurringSessions.length === 0}
                >
                  Generate Draft Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 'review' && (
        <>
          {/* Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold">Review Generated Sessions</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {draftSessions.length} session(s){draftFloatSessions.length > 0 && ` • ${draftFloatSessions.length} float session(s)`}
                {issueCount > 0 && ` • ${issueCount} require attention`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} size="sm" className="md:size-default">
                Back
              </Button>
              <Button
                onClick={handleConfirmCreate}
                style={{ backgroundColor: '#4B9A4A', color: 'white' }}
                disabled={draftSessions.length === 0 && draftFloatSessions.length === 0}
                size="sm"
                className="md:size-default text-xs md:text-sm"
              >
                <span className="hidden md:inline">Confirm & Create {draftSessions.length + draftFloatSessions.length} Item(s)</span>
                <span className="md:hidden">Create ({draftSessions.length + draftFloatSessions.length})</span>
              </Button>
            </div>
          </div>

          {/* Add Session/Float Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddSessionModal(true)}
              className="flex items-center gap-2 justify-center text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Session
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddFloatModal(true)}
              className="flex items-center gap-2 justify-center text-sm"
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
              Add Float Session
            </Button>
          </div>

          {/* Issues Warning */}
          {issueCount > 0 && (
            <div className="flex items-start gap-2 p-4 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  {issueCount} session(s) have issues that need attention
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Review the sessions below and make necessary adjustments before creating
                </p>
              </div>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {combinedItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground text-sm">
                  No sessions to review
                </CardContent>
              </Card>
            ) : (
              combinedItems.map(item => {
                if (item.type === 'float') {
                  const float = item.data as FloatSession;
                  const coach = coaches.find(c => c.id === float.coachId);
                  const location = locations.find(l => l.id === float.locationId);

                  return (
                    <Card key={float.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500 text-white text-xs">Float</Badge>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFloatDraft(float.id)}
                            className="text-red-500 hover:text-red-700 h-8 px-2"
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Date:</span> {format(float.date, 'EEE, dd MMM yyyy')}</p>
                          <p><span className="font-medium">Time:</span> {float.startTime} - {float.endTime}</p>
                          <p><span className="font-medium">Venue:</span> {location?.name || '-'}</p>
                          <p>
                            <span className="font-medium">Coach:</span> {coach ? `${coach.firstName} ${coach.lastName}` : '-'}
                            {coach?.level === 'Level 2' && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Regular session
                const draft = item.data as DraftSession;
                const squad = squads.find(s => s.id === draft.squadId);
                const location = locations.find(l => l.id === draft.locationId);
                const leadCoach = coaches.find(c => c.id === draft.leadCoachId);
                const assistant = draft.secondCoachId ? coaches.find(c => c.id === draft.secondCoachId) : null;
                const helper = draft.helperId ? coaches.find(c => c.id === draft.helperId) : null;
                const writer = coaches.find(c => c.id === draft.setWriterId);

                return (
                  <Card
                    key={draft.id}
                    className="border-l-4"
                    style={{ borderLeftColor: draft.status !== 'ok' ? '#f97316' : '#4B9A4A' }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#4B9A4A] text-white text-xs">Session</Badge>
                          {draft.status === 'ok' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-red-500 hover:text-red-700 h-8 px-2"
                        >
                          Remove
                        </Button>
                      </div>

                      {draft.warnings.length > 0 && (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs space-y-1">
                          {draft.warnings.map((w, i) => (
                            <p key={i}>• {w}</p>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Squad:</span>
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                          >
                            {squad?.name || '-'}
                          </span>
                        </div>
                        <p><span className="font-medium">Date:</span> {format(draft.date, 'EEE, dd MMM yyyy')}</p>
                        <p><span className="font-medium">Time:</span> {draft.startTime} - {draft.endTime}</p>
                        <p><span className="font-medium">Venue:</span> {location?.name || '-'}</p>
                        <p>
                          <span className="font-medium">Lead:</span>{' '}
                          {leadCoach ? (
                            <>
                              {leadCoach.firstName} {leadCoach.lastName}
                              {leadCoach.level === 'Level 2' && (
                                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-red-500">Vacant</span>
                          )}
                        </p>
                        {(assistant || draft.secondCoachId !== null) && (
                          <p>
                            <span className="font-medium">Assistant:</span>{' '}
                            {assistant ? (
                              <>
                                {assistant.firstName} {assistant.lastName}
                                {assistant.level === 'Level 2' && (
                                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                )}
                              </>
                            ) : draft.secondCoachId === null ? (
                              <span className="text-muted-foreground">None</span>
                            ) : (
                              <span className="text-orange-500">Vacant</span>
                            )}
                          </p>
                        )}
                        {(helper || draft.helperId !== null) && (
                          <p>
                            <span className="font-medium">Helper:</span>{' '}
                            {helper ? (
                              <>
                                {helper.firstName} {helper.lastName}
                                {helper.level === 'Level 2' && (
                                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                )}
                              </>
                            ) : draft.helperId === null ? (
                              <span className="text-muted-foreground">None</span>
                            ) : (
                              <span className="text-orange-500">Vacant</span>
                            )}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Writer:</span>{' '}
                          {writer ? `${writer.firstName} ${writer.lastName}` : <span className="text-red-500">Vacant</span>}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Type</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                      <th className="text-left p-3 text-sm font-medium">Day</th>
                      <th className="text-left p-3 text-sm font-medium">Time</th>
                      <th className="text-left p-3 text-sm font-medium">Squad</th>
                      <th className="text-left p-3 text-sm font-medium">Venue</th>
                      <th className="text-left p-3 text-sm font-medium">Coach/Lead</th>
                      <th className="text-left p-3 text-sm font-medium">Assistant</th>
                      <th className="text-left p-3 text-sm font-medium">Helper</th>
                      <th className="text-left p-3 text-sm font-medium">Writer</th>
                      <th className="text-left p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedItems.map(item => {
                      if (item.type === 'float') {
                        const float = item.data as FloatSession;
                        const coach = coaches.find(c => c.id === float.coachId);
                        const location = locations.find(l => l.id === float.locationId);

                        return (
                          <tr key={float.id} className="border-t bg-blue-50/30">
                            <td className="p-3">
                              <Badge className="bg-blue-500 text-white text-xs">Float</Badge>
                            </td>
                            <td className="p-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </td>
                            <td className="p-3 text-sm">{format(float.date, 'dd MMM yyyy')}</td>
                            <td className="p-3 text-sm">{dayNames[float.date.getDay()]}</td>
                            <td className="p-3 text-sm">{float.startTime} - {float.endTime}</td>
                            <td className="p-3 text-sm text-muted-foreground">-</td>
                            <td className="p-3 text-sm">{location?.name || '-'}</td>
                            <td className="p-3 text-sm">
                              {coach ? (
                                <div>
                                  {coach.firstName} {coach.lastName}
                                  {coach.level === 'Level 2' && (
                                    <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">-</td>
                            <td className="p-3 text-sm text-muted-foreground">-</td>
                            <td className="p-3 text-sm text-muted-foreground">-</td>
                            <td className="p-3 text-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFloatDraft(float.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      }

                      // Regular session
                      const draft = item.data as DraftSession;
                      const squad = squads.find(s => s.id === draft.squadId);
                      const location = locations.find(l => l.id === draft.locationId);
                      const leadCoach = coaches.find(c => c.id === draft.leadCoachId);
                      const assistant = draft.secondCoachId ? coaches.find(c => c.id === draft.secondCoachId) : null;
                      const helper = draft.helperId ? coaches.find(c => c.id === draft.helperId) : null;
                      const writer = coaches.find(c => c.id === draft.setWriterId);

                      return (
                        <tr
                          key={draft.id}
                          className={`border-t ${draft.status !== 'ok' ? 'bg-orange-50/30' : ''}`}
                        >
                          <td className="p-3">
                            <Badge className="bg-[#4B9A4A] text-white text-xs">Session</Badge>
                          </td>
                          <td className="p-3">
                            {draft.status === 'ok' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="relative group">
                                <AlertTriangle className="h-5 w-5 text-orange-500 cursor-pointer" />
                                <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-2 bg-black text-white text-xs rounded shadow-lg">
                                  {draft.warnings.map((w, i) => (
                                    <div key={i}>• {w}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <input
                              type="date"
                              value={format(draft.date, 'yyyy-MM-dd')}
                              onChange={(e) => handleUpdateDraft(draft.id, 'date', new Date(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="p-3 text-sm">{dayNames[draft.date.getDay()]}</td>
                          <td className="p-3 text-sm">
                            <div className="flex gap-1 items-center">
                              <input
                                type="time"
                                value={draft.startTime}
                                onChange={(e) => handleUpdateDraft(draft.id, 'startTime', e.target.value)}
                                className="w-20 px-1 py-1 border rounded text-xs"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={draft.endTime}
                                onChange={(e) => handleUpdateDraft(draft.id, 'endTime', e.target.value)}
                                className="w-20 px-1 py-1 border rounded text-xs"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.squadId}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'squadId', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue>
                                  <span
                                    className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                                  >
                                    {squad?.name || '-'}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {squads.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <span
                                      className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                                      style={{ backgroundColor: s.color }}
                                    >
                                      {s.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.locationId}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'locationId', value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue>{location?.name || '-'}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map(l => (
                                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.leadCoachId || 'vacant'}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'leadCoachId', value === 'vacant' ? undefined : value)}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue>
                                  {leadCoach ? (
                                    <div className="flex items-center gap-1">
                                      <span>{leadCoach.firstName} {leadCoach.lastName}</span>
                                      {leadCoach.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-red-500">Vacant</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vacant">
                                  <span className="text-red-500">Vacant</span>
                                </SelectItem>
                                {coaches.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-1">
                                      <span>{c.firstName} {c.lastName}</span>
                                      {c.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.secondCoachId === null ? 'none' : (draft.secondCoachId || 'vacant')}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'secondCoachId', value === 'vacant' ? undefined : value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue>
                                  {assistant ? (
                                    <div className="flex items-center gap-1">
                                      <span>{assistant.firstName} {assistant.lastName}</span>
                                      {assistant.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  ) : draft.secondCoachId === null ? (
                                    <span className="text-muted-foreground">None</span>
                                  ) : (
                                    <span className="text-orange-500">Vacant</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">None</span>
                                </SelectItem>
                                <SelectItem value="vacant">
                                  <span className="text-orange-500">Vacant</span>
                                </SelectItem>
                                {coaches.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-1">
                                      <span>{c.firstName} {c.lastName}</span>
                                      {c.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.helperId === null ? 'none' : (draft.helperId || 'vacant')}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'helperId', value === 'vacant' ? undefined : value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue>
                                  {helper ? (
                                    <div className="flex items-center gap-1">
                                      <span>{helper.firstName} {helper.lastName}</span>
                                      {helper.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  ) : draft.helperId === null ? (
                                    <span className="text-muted-foreground">None</span>
                                  ) : (
                                    <span className="text-orange-500">Vacant</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">None</span>
                                </SelectItem>
                                <SelectItem value="vacant">
                                  <span className="text-orange-500">Vacant</span>
                                </SelectItem>
                                {coaches.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-1">
                                      <span>{c.firstName} {c.lastName}</span>
                                      {c.level === 'Level 2' && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Select
                              value={draft.setWriterId || 'vacant'}
                              onValueChange={(value) => handleUpdateDraft(draft.id, 'setWriterId', value === 'vacant' ? undefined : value)}
                            >
                              <SelectTrigger className="w-44">
                                <SelectValue>
                                  {writer ? (
                                    `${writer.firstName} ${writer.lastName}`
                                  ) : (
                                    <span className="text-red-500">Vacant</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vacant">
                                  <span className="text-red-500">Vacant</span>
                                </SelectItem>
                                {coaches.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Add Float Session Modal */}
          {showAddFloatModal && (
            <AddFloatSessionModal
              coaches={coaches}
              locations={locations}
              onAdd={handleAddFloatSession}
              onCancel={() => setShowAddFloatModal(false)}
            />
          )}

          {/* Add Regular Session Modal */}
          {showAddSessionModal && (
            <AddRegularSessionModal
              coaches={coaches}
              squads={squads}
              locations={locations}
              onAdd={handleAddRegularSession}
              onCancel={() => setShowAddSessionModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

// Modal for adding float sessions
function AddFloatSessionModal({
  coaches,
  locations,
  onAdd,
  onCancel
}: {
  coaches: Coach[];
  locations: Location[];
  onAdd: (float: FloatSession) => void;
  onCancel: () => void;
}) {
  const [coachId, setCoachId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!coachId || !locationId || !date || !startTime || !endTime) {
      alert('Please fill in all required fields');
      return;
    }

    const floatSession: FloatSession = {
      id: `float-${Date.now()}-${Math.random()}`,
      coachId,
      locationId,
      date: new Date(date),
      startTime,
      endTime,
      notes: notes || undefined
    };

    onAdd(floatSession);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">Add Float Session</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Add a floating coach to provide L2 coverage or extra support
          </p>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Coach *</label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.level === 'Level 2' && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Location *</label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 md:px-3 md:py-2 border rounded-md text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Time *</label>
              <div className="flex gap-2 items-center">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-2 py-2 border rounded-md"
                />
                <span>-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-2 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-xs md:text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1.5 md:px-3 md:py-2 border rounded-md text-sm"
                rows={2}
                placeholder="E.g., L2 coverage for overlapping sessions"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={onCancel} size="sm" className="md:size-default text-xs md:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} style={{ backgroundColor: '#4B9A4A', color: 'white' }} size="sm" className="md:size-default text-xs md:text-sm">
              Add Float Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Modal for adding regular sessions
function AddRegularSessionModal({
  coaches,
  squads,
  locations,
  onAdd,
  onCancel
}: {
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  onAdd: (session: DraftSession) => void;
  onCancel: () => void;
}) {
  const [squadId, setSquadId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [leadCoachId, setLeadCoachId] = useState<string | undefined>(undefined);
  const [secondCoachId, setSecondCoachId] = useState<string | null | undefined>(undefined);
  const [helperId, setHelperId] = useState<string | null | undefined>(undefined);
  const [setWriterId, setSetWriterId] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    if (!squadId || !locationId || !date || !startTime || !endTime || !leadCoachId || !setWriterId) {
      alert('Please fill in all required fields (Squad, Location, Date, Time, Lead Coach, Set Writer)');
      return;
    }

    const session: DraftSession = {
      id: `session-${Date.now()}-${Math.random()}`,
      squadId,
      locationId,
      leadCoachId,
      secondCoachId,
      helperId,
      setWriterId,
      date: new Date(date),
      startTime,
      endTime,
      focus: 'Aerobic capacity' as SessionFocus,
      status: 'ok',
      warnings: [],
      vacantRoles: {}
    };

    onAdd(session);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-base md:text-lg">Add Ad-Hoc Session</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Add a one-off session that's not part of your standard schedule
          </p>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Squad *</label>
              <Select value={squadId} onValueChange={setSquadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: s.color }}>
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Location *</label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1.5 md:px-3 md:py-2 border rounded-md text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Time *</label>
              <div className="flex gap-2 items-center">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-2 py-2 border rounded-md"
                />
                <span>-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-2 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Lead Coach *</label>
              <Select value={leadCoachId || 'vacant'} onValueChange={(v) => setLeadCoachId(v === 'vacant' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant"><span className="text-red-500">Vacant</span></SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.level === 'Level 2' && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Assistant Coach</label>
              <Select value={secondCoachId === null ? 'none' : (secondCoachId || 'vacant')} onValueChange={(v) => setSecondCoachId(v === 'vacant' ? undefined : v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                  <SelectItem value="vacant"><span className="text-orange-500">Vacant</span></SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.level === 'Level 2' && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Helper</label>
              <Select value={helperId === null ? 'none' : (helperId || 'vacant')} onValueChange={(v) => setHelperId(v === 'vacant' ? undefined : v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select helper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                  <SelectItem value="vacant"><span className="text-orange-500">Vacant</span></SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.level === 'Level 2' && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">L2</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Set Writer *</label>
              <Select value={setWriterId || 'vacant'} onValueChange={(v) => setSetWriterId(v === 'vacant' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select set writer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant"><span className="text-red-500">Vacant</span></SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="outline" onClick={onCancel} size="sm" className="md:size-default text-xs md:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSubmit} style={{ backgroundColor: '#4B9A4A', color: 'white' }} size="sm" className="md:size-default text-xs md:text-sm">
              Add Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}