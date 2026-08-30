import type { Coach, Location, Session, Squad } from '../lib/typeAdapters';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';
import { Button } from '@/components/ui/button';

interface CalendarTableViewProps {
  sessions: Session[];
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  sessionSquadMap: Record<string, string[]>;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSessionDoubleClick: (session: Session) => void;
  onSearchClick?: () => void;
  isSearchActive?: boolean;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function coachName(coaches: Coach[], coachId: string | null | undefined): string {
  if (!coachId) return '—';
  const coach = coaches.find(candidate => candidate.id === coachId);
  return coach ? coach.name : 'Unknown';
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function CalendarTableView({
  sessions,
  squads,
  locations,
  coaches,
  sessionSquadMap,
  currentDate,
  onDateChange,
  onSessionDoubleClick,
  onSearchClick,
  isSearchActive = false,
}: CalendarTableViewProps) {
  const monthSessions = sessions
    .filter(session => isSameMonth(new Date(session.date), currentDate))
    .sort((a, b) => {
      const dateDifference = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateDifference || timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

  const groupedSessions = monthSessions.reduce<Array<{ date: Date; sessions: Session[] }>>(
    (groups, session) => {
      const sessionDate = new Date(session.date);
      const existingGroup = groups.find(group => dateKey(group.date) === dateKey(sessionDate));

      if (existingGroup) {
        existingGroup.sessions.push(session);
      } else {
        groups.push({ date: sessionDate, sessions: [session] });
      }

      return groups;
    },
    [],
  );

  const previousMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="flex flex-col h-full" data-testid="view-calendar-table">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 data-testid="text-table-month-year">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={previousMonth}
            variant="outline"
            size="icon"
            data-testid="button-table-previous-month"
            type="button"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={nextMonth}
            variant="outline"
            size="icon"
            data-testid="button-table-next-month"
            type="button"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onSearchClick && (
            <Button
              onClick={onSearchClick}
              variant={isSearchActive ? 'default' : 'outline'}
              size="icon"
              data-testid="button-search-desktop-table"
              type="button"
              className="hidden lg:flex"
              aria-label="Search sessions"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {groupedSessions.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center rounded-lg border border-dashed text-muted-foreground"
          data-testid="text-no-table-sessions"
        >
          No sessions this month
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1180px] text-sm border-collapse">
            <thead className="bg-muted/60">
              <tr className="border-b">
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Time</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Squad(s)</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Venue</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Lead</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Second</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Helper</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Set Writer</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Session Focus</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Total Distance</th>
              </tr>
            </thead>
            <tbody>
              {groupedSessions.flatMap(group => [
                <tr key={`date-${dateKey(group.date)}`} className="bg-muted/30 border-y">
                  <th
                    colSpan={9}
                    scope="colgroup"
                    className="px-3 py-2.5 text-left font-semibold"
                    data-testid={`table-date-${dateKey(group.date)}`}
                  >
                    {format(group.date, 'EEEE do')}
                  </th>
                </tr>,
                ...group.sessions.map(session => {
                  const squadIds = sessionSquadMap[session.id] || [session.squadId];
                  const sessionSquads = squadIds
                    .map(id => squads.find(squad => squad.id === id))
                    .filter((squad): squad is Squad => Boolean(squad));
                  const location = locations.find(candidate => candidate.id === session.locationId);
                  const totalDistance = session.distanceBreakdown?.total ?? 0;

                  return (
                    <tr
                      key={session.id}
                      className="border-b last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors"
                      onDoubleClick={() => onSessionDoubleClick(session)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') onSessionDoubleClick(session);
                      }}
                      tabIndex={0}
                      data-testid={`table-session-${session.id}`}
                      title="Double-click to open session"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {sessionSquads.length > 0 ? sessionSquads.map(squad => (
                            <span
                              key={squad.id}
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                              style={{
                                color: squad.color,
                                borderColor: squad.color,
                                backgroundColor: `${squad.color}18`,
                              }}
                            >
                              {squad.name}
                            </span>
                          )) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{location?.name || 'Unknown'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{coachName(coaches, session.leadCoachId)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{coachName(coaches, session.secondCoachId)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{coachName(coaches, session.helperId)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{coachName(coaches, session.setWriterId)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{session.focus}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {totalDistance.toLocaleString()}m
                      </td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}