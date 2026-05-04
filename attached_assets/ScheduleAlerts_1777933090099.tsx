import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CoverRequest, Session, Coach, Squad, Location, Availability } from '../types';
import { AlertTriangle, CheckCircle2, Clock, CalendarOff } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

interface ScheduleAlertsProps {
  coverRequests: CoverRequest[];
  sessions: Session[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  availabilities: Availability[];
}

export function ScheduleAlerts({
  coverRequests,
  sessions,
  coaches,
  squads,
  locations,
  availabilities
}: ScheduleAlertsProps) {
  const pendingRequests = coverRequests.filter(r => r.status === 'pending');
  const coveredRequests = coverRequests.filter(r => r.status === 'covered');

  // Get upcoming absences (active and in the future)
  const upcomingAbsences = useMemo(() => {
    const today = startOfDay(new Date());
    return availabilities
      .filter(a => a.status === 'active')
      .filter(a => {
        const endDate = parseISO(a.endDate);
        return isAfter(endDate, today) || format(endDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      })
      .sort((a, b) => {
        const dateA = parseISO(a.startDate);
        const dateB = parseISO(b.startDate);
        return dateA.getTime() - dateB.getTime();
      });
  }, [availabilities]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-base md:text-lg font-semibold">Schedule Alerts</h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          Monitor cover requests and scheduling issues
        </p>
      </div>

      {/* Pending Cover Requests */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
            <span className="text-sm md:text-base">Pending Cover Requests</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 md:ml-2 inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 text-[10px] md:text-xs font-bold text-white bg-orange-500 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
              <p className="text-xs md:text-sm">No pending cover requests</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {pendingRequests.map(request => {
                const session = sessions.find(s => s.id === request.sessionId);
                const requestingCoach = coaches.find(c => c.id === request.requestingCoachId);
                const squad = session ? squads.find(s => s.id === session.squadId) : null;
                const location = session ? locations.find(l => l.id === session.locationId) : null;

                return (
                  <div key={request.id} className="p-3 md:p-4 border rounded-lg bg-orange-50/50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                          <span className="font-medium text-xs md:text-sm">
                            {requestingCoach?.firstName} {requestingCoach?.lastName}
                          </span>
                          <span className="text-[11px] md:text-xs text-muted-foreground">
                            cannot attend as {request.role}
                          </span>
                        </div>
                        {session && (
                          <div className="mt-2 text-xs md:text-sm text-muted-foreground space-y-0.5">
                            <p>{format(session.date, 'EEE, dd MMM yyyy')} • {session.startTime} - {session.endTime}</p>
                            <p>{squad?.name} at {location?.name}</p>
                          </div>
                        )}
                        {request.notes && (
                          <p className="mt-2 text-[11px] md:text-xs text-muted-foreground italic">"{request.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] md:text-xs text-orange-600 self-end md:self-start">
                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                        Unfilled
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Absences */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <CalendarOff className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            <span className="text-sm md:text-base">Upcoming Absences</span>
            {upcomingAbsences.length > 0 && (
              <span className="ml-1 md:ml-2 inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 text-[10px] md:text-xs font-bold text-white bg-blue-500 rounded-full">
                {upcomingAbsences.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAbsences.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
              <p className="text-xs md:text-sm">No upcoming absences recorded</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {upcomingAbsences.map(absence => {
                const coach = coaches.find(c => c.id === absence.coachId);
                const startDate = parseISO(absence.startDate);
                const endDate = parseISO(absence.endDate);
                const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

                return (
                  <div key={absence.id} className="p-3 md:p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                          <span className="font-medium text-xs md:text-sm">
                            {coach?.firstName} {coach?.lastName}
                          </span>
                          {!absence.isFullDay && (
                            <span className="text-[10px] md:text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded self-start">
                              Partial Day
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs md:text-sm text-muted-foreground">
                          {isSameDay ? (
                            <p>{format(startDate, 'EEE, dd MMM yyyy')}</p>
                          ) : (
                            <p>{format(startDate, 'EEE, dd MMM yyyy')} - {format(endDate, 'EEE, dd MMM yyyy')}</p>
                          )}
                          {!absence.isFullDay && absence.startTime && absence.endTime && (
                            <p className="text-[11px] md:text-xs mt-1">{absence.startTime} - {absence.endTime}</p>
                          )}
                        </div>
                        {absence.reason && (
                          <p className="mt-2 text-[11px] md:text-xs text-muted-foreground italic">"{absence.reason}"</p>
                        )}
                      </div>
                      <div className="text-[11px] md:text-xs text-blue-600 font-medium self-end md:self-start">
                        {absence.isFullDay ? 'Full Day' : 'Partial'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Covered */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            <span className="text-sm md:text-base">Recently Covered</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coveredRequests.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <p className="text-xs md:text-sm">No recently covered requests</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {coveredRequests.slice(0, 5).map(request => {
                const session = sessions.find(s => s.id === request.sessionId);
                const requestingCoach = coaches.find(c => c.id === request.requestingCoachId);
                const coveringCoach = request.coveringCoachId
                  ? coaches.find(c => c.id === request.coveringCoachId)
                  : null;
                const squad = session ? squads.find(s => s.id === session.squadId) : null;

                return (
                  <div key={request.id} className="p-3 md:p-4 border rounded-lg bg-green-50/50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs md:text-sm">
                          <span className="font-medium">
                            {coveringCoach?.firstName} {coveringCoach?.lastName}
                          </span>
                          <span className="text-muted-foreground"> covered for </span>
                          <span className="font-medium">
                            {requestingCoach?.firstName} {requestingCoach?.lastName}
                          </span>
                        </div>
                        {session && (
                          <div className="mt-2 text-xs md:text-sm text-muted-foreground">
                            <p>{format(session.date, 'EEE, dd MMM yyyy')} • {squad?.name}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] md:text-xs text-green-600 font-medium self-end md:self-start">
                        Covered
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
