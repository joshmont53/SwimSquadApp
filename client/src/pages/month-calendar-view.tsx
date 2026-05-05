import type { Session, Squad } from '../lib/typeAdapters';
import type { Competition, CompetitionCoaching, FloatSession } from '@shared/schema';
import { ChevronLeft, ChevronRight, Trophy, Search, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parse } from 'date-fns';

interface MonthCalendarViewProps {
  sessions: Session[];
  competitions: Competition[];
  competitionCoaching: CompetitionCoaching[];
  squads: Squad[];
  sessionSquadMap: Record<string, string[]>;
  floatSessions?: FloatSession[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onCompetitionClick: (competition: Competition) => void;
  showMySessionsOnly?: boolean;
  currentCoachId?: string | null;
  onSearchClick?: () => void;
  isSearchActive?: boolean;
}

export function MonthCalendarView({
  sessions,
  competitions,
  competitionCoaching,
  squads,
  sessionSquadMap,
  floatSessions = [],
  currentDate,
  onDateChange,
  onDayClick,
  onCompetitionClick,
  showMySessionsOnly = false,
  currentCoachId = null,
  onSearchClick,
  isSearchActive = false,
}: MonthCalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const previousMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getFloatSessionsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const hasCoachingOnDate = competitionCoaching.some(
          cc => cc.competitionId === comp.id && cc.coachId === currentCoachId && cc.coachingDate === dateStr
        );
        return hasCoachingOnDate;
      }
      
      return isInDateRange;
    });
  };

  const days = [];
  const mondayBasedOffset = (startingDayOfWeek + 6) % 7;
  for (let i = 0; i < mondayBasedOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-full" data-testid="view-month-calendar">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 data-testid="text-month-year">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button onClick={previousMonth} variant="outline" size="icon" data-testid="button-previous-month" type="button">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={nextMonth} variant="outline" size="icon" data-testid="button-next-month" type="button">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onSearchClick && (
            <Button
              onClick={onSearchClick}
              variant={isSearchActive ? "default" : "outline"}
              size="icon"
              data-testid="button-search-desktop"
              type="button"
              className="hidden lg:flex"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="p-2 text-center text-muted-foreground">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const date = day ? new Date(year, month, day) : null;
          const daySessions = date ? getSessionsForDate(date) : [];
          const dayCompetitions = date ? getCompetitionsForDate(date) : [];
          const dayFloats = date ? getFloatSessionsForDate(date) : [];

          return (
            <div
              key={index}
              className={`min-h-24 p-2 border rounded-lg ${
                day
                  ? 'bg-background cursor-pointer hover-elevate active-elevate-2 transition-colors'
                  : 'bg-muted/30'
              } ${isToday(day) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => day && date && onDayClick(date)}
              data-testid={day ? `calendar-day-${day}` : undefined}
            >
              {day && (
                <>
                  <div className="mb-1">{day}</div>
                  <div className="space-y-1">
                    {/* Render sessions */}
                    {daySessions.map((session) => {
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
                      return (
                        <div
                          key={session.id}
                          className="text-xs px-2 py-1 rounded truncate text-white"
                          style={bgStyle}
                          title={`${squadLabel} - ${session.focus}`}
                          data-testid={`session-badge-${session.id}`}
                        >
                          {squadLabel} - {session.focus}
                        </div>
                      );
                    })}
                    {/* Render float sessions */}
                    {dayFloats.map((fs) => (
                      <div
                        key={fs.id}
                        className="text-xs px-2 py-1 rounded truncate bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 flex items-center gap-1"
                        title={`Float Session ${fs.startTime.slice(0,5)}–${fs.endTime.slice(0,5)}`}
                        data-testid={`float-badge-${fs.id}`}
                      >
                        <Waves className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">Float</span>
                      </div>
                    ))}
                    {/* Render competitions with diagonal stripes */}
                    {dayCompetitions.map((comp) => (
                      <div
                        key={comp.id}
                        className="text-xs px-2 py-1 rounded truncate overflow-hidden relative cursor-pointer bg-white border"
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
                        title={comp.competitionName}
                        data-testid={`competition-badge-${comp.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompetitionClick(comp);
                        }}
                      >
                        <span className="font-medium flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
