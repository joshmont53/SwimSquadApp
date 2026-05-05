import type { Session, Squad, Location } from '../lib/typeAdapters';
import type { Competition, CompetitionCoaching } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trophy } from 'lucide-react';
import { format, parse } from 'date-fns';

interface DayCalendarViewProps {
  sessions: Session[];
  competitions: Competition[];
  competitionCoaching: CompetitionCoaching[];
  squads: Squad[];
  sessionSquadMap: Record<string, string[]>;
  locations: Location[];
  selectedDate: Date;
  onBack: () => void;
  onSessionClick: (session: Session) => void;
  onCompetitionClick: (competition: Competition) => void;
  showMySessionsOnly?: boolean;
  currentCoachId?: string | null;
}

export function DayCalendarView({
  sessions,
  competitions,
  competitionCoaching,
  squads,
  sessionSquadMap,
  locations,
  selectedDate,
  onBack,
  onSessionClick,
  onCompetitionClick,
  showMySessionsOnly = false,
  currentCoachId = null,
}: DayCalendarViewProps) {
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const daySessions = sessions.filter((session) => {
    const sessionDate = new Date(session.date);
    return (
      sessionDate.getDate() === selectedDate.getDate() &&
      sessionDate.getMonth() === selectedDate.getMonth() &&
      sessionDate.getFullYear() === selectedDate.getFullYear()
    );
  });


  const dayCompetitions = competitions.filter((comp) => {
    const startDate = parse(comp.startDate, 'yyyy-MM-dd', new Date());
    const endDate = parse(comp.endDate, 'yyyy-MM-dd', new Date());
    const compareDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const isInDateRange = compareDate >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) &&
                          compareDate <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // If My Sessions filter is on, only show competition on days where current coach is coaching
    if (showMySessionsOnly && currentCoachId && isInDateRange) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const hasCoachingOnDate = competitionCoaching.some(
        cc => cc.competitionId === comp.id && cc.coachId === currentCoachId && cc.coachingDate === dateStr
      );
      return hasCoachingOnDate;
    }
    
    return isInDateRange;
  });

  const timeSlots = [
    '05:30', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
    '19:00', '20:00', '21:00', '22:00'
  ];

  const timeToMinutes = (time: string): number => {
    const [hour, min] = time.split(':').map(Number);
    return hour * 60 + min;
  };

  const getSessionPosition = (session: Session) => {
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const [endHour, endMin] = session.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const dayStartMinutes = 5 * 60 + 30;

    const top = ((startMinutes - dayStartMinutes) / 60) * 80;
    const height = ((endMinutes - startMinutes) / 60) * 80;

    return { top, height };
  };

  const getSessionsForLocation = (locationId: string) => {
    return daySessions.filter((s) => s.locationId === locationId);
  };

  const getCompetitionTimeRange = (competitionId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const coachingForDay = competitionCoaching.filter(
      cc => cc.competitionId === competitionId && cc.coachingDate === dateStr
    );

    if (coachingForDay.length === 0) {
      return { startTime: "05:30", endTime: "10:00" };
    }

    const timeToMinutes = (time: string): number => {
      const [hour, min] = time.split(':').map(Number);
      return hour * 60 + (min || 0);
    };

    const minutesToTime = (minutes: number): string => {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    const times = coachingForDay.map(cc => ({
      startMinutes: timeToMinutes(cc.startTime),
      endMinutes: timeToMinutes(cc.endTime)
    }));

    const earliestStartMinutes = Math.min(...times.map(t => t.startMinutes));
    const latestEndMinutes = Math.max(...times.map(t => t.endMinutes));

    return {
      startTime: minutesToTime(earliestStartMinutes),
      endTime: minutesToTime(latestEndMinutes)
    };
  };

  const getCompetitionPosition = (competitionId: string) => {
    const { startTime, endTime } = getCompetitionTimeRange(competitionId);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const dayStartMinutes = 5 * 60 + 30; // 05:30
    const dayEndMinutes = 22 * 60; // 22:00

    // Clamp to timeline bounds
    const clampedStartMinutes = Math.max(dayStartMinutes, Math.min(dayEndMinutes, startMinutes));
    const clampedEndMinutes = Math.max(dayStartMinutes, Math.min(dayEndMinutes, endMinutes));

    const top = ((clampedStartMinutes - dayStartMinutes) / 60) * 80;
    const height = Math.max(20, ((clampedEndMinutes - clampedStartMinutes) / 60) * 80); // Minimum 20px height

    return { top, height, startTime, endTime };
  };

  const getCompetitionsForLocation = (locationId: string) => {
    return dayCompetitions.filter((c) => c.locationId === locationId);
  };

  const computeColumnLayout = (sessions: Session[]): Map<string, { column: number; totalColumns: number }> => {
    const sorted = [...sessions].sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.id.localeCompare(b.id);
    });

    const columnAssignments = new Map<string, number>();
    const columnEndTimes: number[] = [];

    for (const session of sorted) {
      const startMinutes = timeToMinutes(session.startTime);
      const endMinutes = timeToMinutes(session.endTime);

      let assignedColumn = -1;
      for (let col = 0; col < columnEndTimes.length; col++) {
        if (columnEndTimes[col] <= startMinutes) {
          assignedColumn = col;
          columnEndTimes[col] = endMinutes;
          break;
        }
      }

      if (assignedColumn === -1) {
        assignedColumn = columnEndTimes.length;
        columnEndTimes.push(endMinutes);
      }

      columnAssignments.set(session.id, assignedColumn);
    }

    const result = new Map<string, { column: number; totalColumns: number }>();

    for (const session of sessions) {
      const sessionStart = timeToMinutes(session.startTime);
      const sessionEnd = timeToMinutes(session.endTime);

      let maxColumn = columnAssignments.get(session.id)!;
      for (const other of sessions) {
        if (other.id === session.id) continue;
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        if (sessionStart < otherEnd && otherStart < sessionEnd) {
          maxColumn = Math.max(maxColumn, columnAssignments.get(other.id)!);
        }
      }

      result.set(session.id, {
        column: columnAssignments.get(session.id)!,
        totalColumns: maxColumn + 1,
      });
    }

    return result;
  };

  return (
    <div className="flex flex-col h-full" data-testid="view-day-calendar">
      <div className="flex items-center gap-4 mb-6 px-2">
        <Button onClick={onBack} variant="outline" size="icon" data-testid="button-back-to-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 data-testid="text-day-name">{dayName}</h2>
          <p className="text-muted-foreground" data-testid="text-day-date">{dateStr}</p>
        </div>
      </div>

      {daySessions.length === 0 && dayCompetitions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="text-no-sessions">
          No sessions or competitions scheduled for this day
        </div>
      ) : (daySessions.length > 0 || dayCompetitions.length > 0) && (
        <div className="flex-1 overflow-auto scroll-container">
          <div className="flex gap-4">
            <div className="w-16 flex-shrink-0">
              {timeSlots.map((time) => (
                <div key={time} className="h-20 border-b text-sm text-muted-foreground">
                  {time}
                </div>
              ))}
            </div>

            <div className="flex-1 flex gap-4">
              {locations.map((location) => {
                const locationSessions = getSessionsForLocation(location.id);
                const locationCompetitions = getCompetitionsForLocation(location.id);
                if (locationSessions.length === 0 && locationCompetitions.length === 0) return null;

                const columnLayout = computeColumnLayout(locationSessions);

                return (
                  <div key={location.id} className="flex-1 min-w-48">
                    <div className="mb-2 p-2 bg-muted rounded-lg sticky top-0 z-10">
                      {location.name}
                    </div>
                    <div className="relative">
                      {timeSlots.map((time) => (
                        <div key={time} className="h-20 border-b border-border/50" />
                      ))}

                      <div className="absolute inset-0">
                        {/* Render competitions */}
                        {locationCompetitions.map((comp) => {
                          const { top, height, startTime, endTime } = getCompetitionPosition(comp.id);

                          return (
                            <div
                              key={comp.id}
                              className="absolute p-2 rounded text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 bg-white"
                              style={{
                                backgroundImage: `repeating-linear-gradient(
                                  45deg,
                                  ${comp.color}40,
                                  ${comp.color}40 10px,
                                  transparent 10px,
                                  transparent 20px
                                )`,
                                borderColor: comp.color,
                                color: comp.color,
                                top: `${top}px`,
                                height: `${height}px`,
                                left: '0',
                                width: '100%',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompetitionClick(comp);
                              }}
                              data-testid={`competition-block-${comp.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 flex-shrink-0" />
                                <div className="font-bold truncate">{comp.competitionName}</div>
                              </div>
                              <div className="text-xs opacity-90">
                                {startTime} - {endTime}
                              </div>
                            </div>
                          );
                        })}

                        {/* Render sessions */}
                        {locationSessions.map((session) => {
                          const squadIds = sessionSquadMap[session.id] || [session.squadId];
                          const sessionSquads = squadIds
                            .map(id => squads.find(s => s.id === id))
                            .filter(Boolean);
                          const primarySquad = sessionSquads[0];
                          if (!primarySquad) return null;
                          const squadLabel = sessionSquads.map(s => s!.name).join(' / ');
                          const colors = sessionSquads.map(s => s!.color);
                          const bgStyle = colors.length > 1
                            ? { background: `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(', ')})` }
                            : { backgroundColor: primarySquad.color };

                          const { top, height } = getSessionPosition(session);

                          const { column, totalColumns } = columnLayout.get(session.id) ?? { column: 0, totalColumns: 1 };
                          const width = `${100 / totalColumns}%`;
                          const left = `${(column / totalColumns) * 100}%`;

                          return (
                            <div
                              key={session.id}
                              className="absolute p-2 rounded text-white text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              style={{
                                ...bgStyle,
                                top: `${top}px`,
                                height: `${height}px`,
                                left: left,
                                width: width,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSessionClick(session);
                              }}
                              data-testid={`session-block-${session.id}`}
                            >
                              <div>{squadLabel}</div>
                              <div className="text-xs opacity-90">
                                {session.startTime} - {session.endTime}
                              </div>
                              <div className="text-xs opacity-90">{session.focus}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
