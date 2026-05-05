import type { Session, Squad, Location, Coach } from '../lib/typeAdapters';
import type { Competition, CompetitionCoaching, FloatSession } from '@shared/schema';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Trophy, Waves } from 'lucide-react';

interface DayListViewProps {
  sessions: Session[];
  competitions: Competition[];
  competitionCoaching: CompetitionCoaching[];
  squads: Squad[];
  sessionSquadMap: Record<string, string[]>;
  locations: Location[];
  coaches: Coach[];
  floatSessions?: FloatSession[];
  currentDate: Date;
  onSessionClick: (session: Session) => void;
  onCompetitionClick: (competition: Competition) => void;
  showMySessionsOnly?: boolean;
  currentCoachId?: string | null;
}

export function DayListView({
  sessions,
  competitions,
  competitionCoaching,
  squads,
  sessionSquadMap,
  locations,
  coaches,
  floatSessions = [],
  currentDate,
  onSessionClick,
  onCompetitionClick,
  showMySessionsOnly = false,
  currentCoachId = null,
}: DayListViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const getFloatSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return floatSessions.filter(fs => fs.sessionDate === dateStr);
  };

  const getCompetitionsForDate = (date: Date) => {
    return competitions.filter((comp) => {
      const startDate = parse(comp.startDate, 'yyyy-MM-dd', new Date());
      const endDate = parse(comp.endDate, 'yyyy-MM-dd', new Date());
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const isInDateRange = compareDate >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) &&
                            compareDate <= new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // If My Sessions filter is on, only show competition on days where current coach is coaching
      if (showMySessionsOnly && currentCoachId && isInDateRange) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const hasCoachingOnDate = competitionCoaching.some(
          cc => cc.competitionId === comp.id && cc.coachId === currentCoachId && cc.coachingDate === dateStr
        );
        return hasCoachingOnDate;
      }
      
      return isInDateRange;
    });
  };

  const getCoachingCountForCompetition = (competitionId: string) => {
    return competitionCoaching.filter(cc => cc.competitionId === competitionId).length;
  };

  const getCompetitionTimeRange = (competitionId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const coachingForDay = competitionCoaching.filter(
      cc => cc.competitionId === competitionId && cc.coachingDate === dateStr
    );

    if (coachingForDay.length === 0) {
      return "05:30 - 10:00";
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

    return `${minutesToTime(earliestStartMinutes)} - ${minutesToTime(latestEndMinutes)}`;
  };

  const today = new Date();

  return (
    <div className="space-y-4" data-testid="view-day-list">
      {daysInMonth.map((day) => {
        const daySessions = getSessionsForDate(day);
        const dayCompetitions = getCompetitionsForDate(day);
        const dayFloats = getFloatSessionsForDate(day);
        const isToday = isSameDay(day, today);
        const hasItems = daySessions.length > 0 || dayCompetitions.length > 0 || dayFloats.length > 0;

        return (
          <div
            key={day.toISOString()}
            className={`border rounded-lg overflow-hidden ${
              isToday ? 'ring-2 ring-primary' : ''
            }`}
            data-testid={`day-list-item-${format(day, 'yyyy-MM-dd')}`}
          >
            <div className="bg-muted p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{format(day, 'd')}</span>
                <span className="text-muted-foreground">
                  {format(day, 'EEEE')}
                </span>
                {isToday && (
                  <span className="ml-auto text-sm text-primary" data-testid="badge-today">Today</span>
                )}
              </div>
            </div>

            {hasItems ? (
              <div className="p-3 space-y-2">
                {/* Render competitions first */}
                {dayCompetitions.map((comp) => {
                  const location = locations.find((l) => l.id === comp.locationId);
                  const coachCount = getCoachingCountForCompetition(comp.id);
                  const timeRange = getCompetitionTimeRange(comp.id, day);

                  return (
                    <div
                      key={comp.id}
                      className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden relative bg-white border-2"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          ${comp.color}40,
                          ${comp.color}40 10px,
                          transparent 10px,
                          transparent 20px
                        )`,
                        borderColor: comp.color,
                        color: comp.color
                      }}
                      onClick={() => onCompetitionClick(comp)}
                      data-testid={`competition-item-${comp.id}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            <div>
                              <div className="font-bold">{comp.competitionName}</div>
                              <div className="text-sm opacity-75">{timeRange}</div>
                              {location && (
                                <div className="text-sm opacity-75">{location.name}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm opacity-75 text-right whitespace-nowrap">
                            {coachCount} {coachCount === 1 ? 'coach' : 'coaches'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Render float sessions */}
                {dayFloats.map((fs) => {
                  const location = locations.find(l => l.id === fs.locationId);
                  return (
                    <div
                      key={fs.id}
                      className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700"
                      data-testid={`float-item-${fs.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Waves className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-teal-800 dark:text-teal-200">Float Session</div>
                            <div className="text-sm text-teal-600 dark:text-teal-400">{fs.startTime.slice(0,5)} - {fs.endTime.slice(0,5)}</div>
                            {location && <div className="text-sm text-teal-600 dark:text-teal-400">{location.name}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Render sessions */}
                {daySessions.map((session) => {
                  const squadIds = sessionSquadMap[session.id] || [session.squadId];
                  const sessionSquadsList = squadIds
                    .map(id => squads.find(s => s.id === id))
                    .filter(Boolean);
                  const primarySquad = sessionSquadsList[0];
                  const location = locations.find((l) => l.id === session.locationId);
                  const coach = coaches.find((c) => c.id === session.leadCoachId);

                  if (!primarySquad) return null;
                  const squadLabel = sessionSquadsList.map(s => s!.name).join(' / ');
                  const colors = sessionSquadsList.map(s => s!.color);
                  const bgStyle = colors.length > 1
                    ? { background: `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(', ')})` }
                    : { backgroundColor: primarySquad.color };

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={bgStyle}
                      onClick={() => onSessionClick(session)}
                      data-testid={`session-item-${session.id}`}
                    >
                      <div className="text-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div>{squadLabel}</div>
                            <div className="text-sm opacity-90">{session.focus}</div>
                          </div>
                          <div className="text-sm opacity-90 text-right whitespace-nowrap">
                            {session.startTime} - {session.endTime}
                          </div>
                        </div>
                        {location && (
                          <div className="text-xs opacity-75 mt-1">{location.name}</div>
                        )}
                        {coach && (
                          <div className="text-xs opacity-75">{coach.name}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-sm text-muted-foreground" data-testid="text-no-sessions">
                No sessions or competitions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
