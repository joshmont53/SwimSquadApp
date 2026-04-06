import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  Droplet, 
  Clock,
  AlertCircle,
  Award,
  Activity,
  Waves,
  ChevronDown,
  Users,
  Plus,
  Trophy,
  MapPin
} from 'lucide-react';
import { format, isToday, isPast, isFuture, startOfWeek, endOfWeek, isWithinInterval, addMonths, isBefore, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import type { Coach, Session, Squad, Swimmer, Location } from '@/lib/typeAdapters';
import type { Competition, CompetitionCoaching, Attendance, SessionFeedback } from '@shared/schema';

interface HomePageProps {
  coach: Coach;
  sessions: Session[];
  squads: Squad[];
  swimmers: Swimmer[];
  locations: Location[];
  competitions: Competition[];
  competitionCoaching: CompetitionCoaching[];
  attendance: Attendance[];
  sessionFeedback: SessionFeedback[];
  sessionSquadMap: Record<string, string[]>;
  onNavigateToSession: (session: Session) => void;
  onNavigateToCalendar: () => void;
  onAddSession: () => void;
  onNavigateToSwimmerProfile: (swimmer: Swimmer) => void;
}

export function HomePage({ 
  coach, 
  sessions, 
  squads, 
  swimmers,
  locations,
  competitions,
  competitionCoaching,
  attendance,
  sessionFeedback,
  sessionSquadMap,
  onNavigateToSession,
  onNavigateToCalendar,
  onAddSession,
  onNavigateToSwimmerProfile
}: HomePageProps) {
  const [distanceSquadFilter, setDistanceSquadFilter] = useState<string>('');
  const [attendanceSquadFilter, setAttendanceSquadFilter] = useState<string | string[]>('primary');
  const [showAllSwimmers, setShowAllSwimmers] = useState(false);
  const [showAllIncompleteSessions, setShowAllIncompleteSessions] = useState(false);

  const primarySquads = useMemo(() => {
    return squads.filter(squad => squad.primaryCoachId === coach.id);
  }, [squads, coach.id]);
  
  const nonPrimarySquads = useMemo(() => {
    return squads.filter(squad => squad.primaryCoachId !== coach.id);
  }, [squads, coach.id]);
  
  const allCoachSquads = useMemo(() => {
    const coachSessions = sessions.filter(session => 
      session.leadCoachId === coach.id || 
      session.secondCoachId === coach.id || 
      session.helperId === coach.id
    );
    const squadIds = Array.from(new Set(coachSessions.map(s => s.squadId)));
    return squads.filter(s => squadIds.includes(s.id));
  }, [sessions, squads, coach.id]);
  
  useEffect(() => {
    if (distanceSquadFilter === '') {
      if (primarySquads.length > 0) {
        setDistanceSquadFilter(primarySquads[0].id);
      } else if (allCoachSquads.length > 0) {
        // Fallback to squads the coach has coached
        setDistanceSquadFilter(allCoachSquads[0].id);
      } else if (squads.length > 0) {
        setDistanceSquadFilter(squads[0].id);
      }
    }
  }, [primarySquads, allCoachSquads, squads, distanceSquadFilter]);
  
  const attendanceSquadIds = useMemo(() => {
    if (attendanceSquadFilter === 'primary') {
      // Fallback to all coached squads if no primary squads exist
      if (primarySquads.length === 0) {
        return allCoachSquads.length > 0 ? allCoachSquads.map(s => s.id) : squads.map(s => s.id);
      }
      return primarySquads.map(s => s.id);
    } else if (attendanceSquadFilter === 'all') {
      return squads.map(s => s.id);
    } else if (Array.isArray(attendanceSquadFilter)) {
      return attendanceSquadFilter;
    } else {
      return [attendanceSquadFilter];
    }
  }, [attendanceSquadFilter, primarySquads, allCoachSquads, squads]);

  const coachSessions = useMemo(() => {
    return sessions.filter(session => 
      session.leadCoachId === coach.id || 
      session.secondCoachId === coach.id || 
      session.helperId === coach.id
    );
  }, [sessions, coach.id]);

  const allIncompleteSessions = useMemo(() => {
    return coachSessions.filter(session => {
      const sessionDate = new Date(session.date);
      const isPastOrToday = isPast(sessionDate) || isToday(sessionDate);
      const isLead = session.leadCoachId === coach.id;
      const hasFeedback = sessionFeedback.some(f => f.sessionId === session.id);
      const sessionAttendance = attendance.filter(a => a.sessionId === session.id);
      const missingAttendance = isPastOrToday && sessionAttendance.length === 0;
      
      return isPastOrToday && isLead && (!hasFeedback || missingAttendance);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(session => {
      const hasFeedback = sessionFeedback.some(f => f.sessionId === session.id);
      const sessionAttendance = attendance.filter(a => a.sessionId === session.id);
      const missingAttendance = sessionAttendance.length === 0;
      
      return {
        session,
        missingFeedback: !hasFeedback,
        missingAttendance
      };
    });
  }, [coachSessions, coach.id, sessionFeedback, attendance]);

  const displayedIncompleteSessions = useMemo(() => {
    return allIncompleteSessions.slice(0, 3);
  }, [allIncompleteSessions]);

  const thisWeekUpcomingSessions = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return coachSessions
      .filter(session => {
        const sessionDate = new Date(session.date);
        return (isFuture(sessionDate) || isToday(sessionDate)) &&
               isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [coachSessions]);
  
  const thisWeekSessionsForDistance = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    return sessions.filter(session => 
      isWithinInterval(new Date(session.date), { start: weekStart, end: weekEnd }) &&
      session.squadId === distanceSquadFilter
    );
  }, [sessions, distanceSquadFilter]);

  const thisWeekSwimmerStats = useMemo(() => {
    const weekSessions = thisWeekSessionsForDistance;
    
    let totalDistance = 0;
    let freestyle = 0, backstroke = 0, breaststroke = 0, butterfly = 0, no1 = 0;
    let swim = 0, kick = 0, drill = 0, pull = 0;
    
    weekSessions.forEach(session => {
      const dist = session.distanceBreakdown;
      if (dist) {
        totalDistance += dist.total || 0;
        freestyle += dist.frontCrawl || 0;
        backstroke += dist.backstroke || 0;
        breaststroke += dist.breaststroke || 0;
        butterfly += dist.butterfly || 0;
        no1 += dist.no1 || 0;
        
        if (dist.frontCrawlBreakdown) {
          swim += dist.frontCrawlBreakdown.swim || 0;
          kick += dist.frontCrawlBreakdown.kick || 0;
          drill += dist.frontCrawlBreakdown.drill || 0;
          pull += dist.frontCrawlBreakdown.pull || 0;
        }
        if (dist.backstrokeBreakdown) {
          swim += dist.backstrokeBreakdown.swim || 0;
          kick += dist.backstrokeBreakdown.kick || 0;
          drill += dist.backstrokeBreakdown.drill || 0;
          pull += dist.backstrokeBreakdown.pull || 0;
        }
        if (dist.breaststrokeBreakdown) {
          swim += dist.breaststrokeBreakdown.swim || 0;
          kick += dist.breaststrokeBreakdown.kick || 0;
          drill += dist.breaststrokeBreakdown.drill || 0;
          pull += dist.breaststrokeBreakdown.pull || 0;
        }
        if (dist.butterflyBreakdown) {
          swim += dist.butterflyBreakdown.swim || 0;
          kick += dist.butterflyBreakdown.kick || 0;
          drill += dist.butterflyBreakdown.drill || 0;
          pull += dist.butterflyBreakdown.pull || 0;
        }
        if (dist.no1Breakdown) {
          swim += dist.no1Breakdown.swim || 0;
          kick += dist.no1Breakdown.kick || 0;
          drill += dist.no1Breakdown.drill || 0;
          pull += dist.no1Breakdown.pull || 0;
        }
      }
    });
    
    return {
      totalDistance,
      strokes: { freestyle, backstroke, breaststroke, butterfly, no1 },
      types: { swim, kick, drill, pull }
    };
  }, [thisWeekSessionsForDistance]);

  // Current month boundaries for attendance filtering
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
  const currentMonthName = format(new Date(), 'MMMM');

  const swimmerAttendance = useMemo(() => {
    const squadSwimmers = swimmers.filter(s => attendanceSquadIds.includes(s.squadId));
    
    // Get all sessions for the filtered squads in current month (past sessions only)
    const currentMonthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return attendanceSquadIds.includes(s.squadId) &&
             isPast(sessionDate) &&
             isWithinInterval(sessionDate, { start: currentMonthStart, end: currentMonthEnd });
    });
    
    return squadSwimmers.map(swimmer => {
      // Get attendance records for this swimmer in current month sessions
      const swimmerAttendanceRecords = attendance.filter(a => 
        a.swimmerId === swimmer.id && 
        currentMonthSessions.some(s => s.id === a.sessionId)
      );
      
      const total = swimmerAttendanceRecords.length;
      
      const attended = swimmerAttendanceRecords.filter(a => 
        a.status === 'Present' || a.status === '1st half only' || a.status === '2nd half only'
      ).length;
      
      const percentage = total > 0 ? Math.round((attended / total) * 100) : null;
      
      const lateCount = swimmerAttendanceRecords.filter(a => a.notes === 'Late').length;
      const veryLateCount = swimmerAttendanceRecords.filter(a => a.notes === 'Very Late').length;
      
      return {
        swimmer,
        percentage,
        attended,
        total,
        lateCount,
        veryLateCount
      };
    })
    .filter(s => s.total > 0) // Exclude swimmers with no sessions (denominator = 0)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  }, [attendanceSquadIds, swimmers, sessions, attendance, currentMonthStart, currentMonthEnd]);

  // Calculate last month's average for comparison
  const lastMonthAverage = useMemo(() => {
    const squadSwimmers = swimmers.filter(s => attendanceSquadIds.includes(s.squadId));
    
    const lastMonthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return attendanceSquadIds.includes(s.squadId) &&
             isWithinInterval(sessionDate, { start: lastMonthStart, end: lastMonthEnd });
    });
    
    const swimmerStats = squadSwimmers.map(swimmer => {
      const swimmerAttendanceRecords = attendance.filter(a => 
        a.swimmerId === swimmer.id && 
        lastMonthSessions.some(s => s.id === a.sessionId)
      );
      
      const total = swimmerAttendanceRecords.length;
      const attended = swimmerAttendanceRecords.filter(a => 
        a.status === 'Present' || a.status === '1st half only' || a.status === '2nd half only'
      ).length;
      
      return { total, attended };
    }).filter(s => s.total > 0);
    
    if (swimmerStats.length === 0) return null;
    
    const totalAttended = swimmerStats.reduce((acc, s) => acc + s.attended, 0);
    const totalSessions = swimmerStats.reduce((acc, s) => acc + s.total, 0);
    
    return totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : null;
  }, [attendanceSquadIds, swimmers, sessions, attendance, lastMonthStart, lastMonthEnd]);
  
  const top3Swimmers = swimmerAttendance.slice(0, 3);
  const bottom3Swimmers = swimmerAttendance.slice(-3).reverse();
  const avgAttendance = swimmerAttendance.length > 0 
    ? Math.round(swimmerAttendance.reduce((acc, s) => acc + (s.percentage ?? 0), 0) / swimmerAttendance.length)
    : 0;
  
  // Calculate trend compared to last month
  const attendanceTrend = lastMonthAverage !== null ? avgAttendance - lastMonthAverage : null;

  const upcomingCompetitions = useMemo(() => {
    const now = new Date();
    const nextMonth = addMonths(now, 1);
    
    return competitions.filter(comp => {
      const compStart = new Date(comp.startDate);
      return isBefore(now, compStart) && isBefore(compStart, nextMonth) &&
             competitionCoaching.some(cc => cc.competitionId === comp.id && cc.coachId === coach.id);
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);
  }, [competitions, competitionCoaching, coach.id]);

  const totalStats = useMemo(() => {
    // Sessions this month only
    const thisMonthSessions = coachSessions.filter(s => {
      const sessionDate = new Date(s.date);
      return isPast(sessionDate) && 
             isWithinInterval(sessionDate, { start: currentMonthStart, end: currentMonthEnd });
    });
    
    const sessionsThisMonth = thisMonthSessions.length;
    
    const allSquadIds = new Set<string>();
    thisMonthSessions.forEach(s => {
      const ids = sessionSquadMap[s.id] || [s.squadId];
      ids.forEach(id => allSquadIds.add(id));
    });
    const squadsCoached = allSquadIds.size;
    
    return {
      sessionsThisMonth,
      squadsCoached,
      thisWeekSessions: thisWeekUpcomingSessions.length,
      incompleteTasks: allIncompleteSessions.length
    };
  }, [coachSessions, thisWeekUpcomingSessions, allIncompleteSessions, currentMonthStart, currentMonthEnd, sessionSquadMap]);

  return (
    <>
      <div className="space-y-3" data-testid="home-page">
        <div className="pt-2">
          <h1 className="text-2xl font-bold" data-testid="text-welcome">Welcome back, {coach.firstName}!</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here's your coaching overview for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {allIncompleteSessions.length > 0 && (
          <Card 
            className={`border-orange-200 bg-orange-50/50 ${allIncompleteSessions.length > 3 ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={allIncompleteSessions.length > 3 ? () => setShowAllIncompleteSessions(true) : undefined}
            data-testid="card-action-required"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">Action Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                {allIncompleteSessions.length} session{allIncompleteSessions.length !== 1 ? 's' : ''} need attention
              </p>
              <div className="space-y-1.5">
                {displayedIncompleteSessions.map(({ session }) => {
                  const squadIds = sessionSquadMap[session.id] || [session.squadId];
                  const sessionSquadsList = squadIds
                    .map(id => squads.find(s => s.id === id))
                    .filter(Boolean);
                  const squadLabel = sessionSquadsList.length > 0
                    ? sessionSquadsList.map(s => s!.name).join(' / ')
                    : squads.find(s => s.id === session.squadId)?.name || 'Unknown';
                  
                  return (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToSession(session);
                      }}
                      data-testid={`action-session-${session.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CalendarDays className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{squadLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(session.date), 'MMM d')} • {session.startTime}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2 text-xs h-7">Complete</Button>
                    </div>
                  );
                })}
                {allIncompleteSessions.length > 3 && (
                  <div className="flex justify-center pt-1">
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 cursor-pointer">
                      +{allIncompleteSessions.length - 3} more
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card data-testid="card-upcoming-sessions" className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: 'var(--club-primary)' }} />
                  Upcoming This Week
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0"
                  onClick={onAddSession}
                  title="Add session"
                  data-testid="button-add-session-home"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {thisWeekUpcomingSessions.length > 0 ? (
                <div className="space-y-2">
                  {thisWeekUpcomingSessions.map(session => {
                    const squadIds = sessionSquadMap[session.id] || [session.squadId];
                    const sessionSquadsList = squadIds
                      .map(id => squads.find(s => s.id === id))
                      .filter(Boolean);
                    const squadLabel = sessionSquadsList.length > 0
                      ? sessionSquadsList.map(s => s!.name).join(' / ')
                      : squads.find(s => s.id === session.squadId)?.name || 'Unknown';
                    const colors = sessionSquadsList.map(s => s!.color);
                    const sessionDate = new Date(session.date);
                    const isSessionToday = isToday(sessionDate);
                    
                    return (
                      <div 
                        key={session.id}
                        className="p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => onNavigateToSession(session)}
                        data-testid={`upcoming-session-${session.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {colors.length > 0 && (
                              <div className="flex flex-shrink-0">
                                {colors.map((color, i) => (
                                  <div
                                    key={i}
                                    className="w-2.5 h-2.5 rounded-full border border-white"
                                    style={{ backgroundColor: color, marginLeft: i > 0 ? '-4px' : '0' }}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{squadLabel}</div>
                              <div className="text-xs text-muted-foreground">
                                {isSessionToday ? 'Today' : format(sessionDate, 'EEE, MMM d')} • {session.startTime}
                              </div>
                            </div>
                          </div>
                          {isSessionToday && (
                            <Badge 
                              style={{ backgroundColor: 'var(--club-primary-faint)', color: 'var(--club-primary)' }}
                              className="text-xs ml-2"
                            >
                              Today
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming sessions this week</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={onNavigateToCalendar}
                data-testid="button-view-calendar"
              >
                View Calendar
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="text-white border-0 cursor-pointer hover:shadow-lg transition-shadow lg:col-span-1"
            style={{ background: 'linear-gradient(to bottom right, var(--club-card-1-start), var(--club-card-1-end))' }}
            onClick={() => setShowAllSwimmers(true)}
            data-testid="card-attendance-rate"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/80 text-sm">Attendance Rate ({currentMonthName})</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-avg-attendance">{avgAttendance}%</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-white/80 text-xs">Squad Average</p>
                    {attendanceTrend !== null && (
                      <span className={`text-xs flex items-center gap-0.5 ${attendanceTrend >= 0 ? 'text-white/60' : 'text-red-200'}`}>
                        {attendanceTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {attendanceTrend >= 0 ? '+' : ''}{attendanceTrend}% vs last month
                      </span>
                    )}
                  </div>
                </div>
                {attendanceTrend === null || attendanceTrend >= 0 ? (
                  <TrendingUp className="h-10 w-10 text-white/60" />
                ) : (
                  <TrendingDown className="h-10 w-10 text-red-200" />
                )}
              </div>
              
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <Select 
                  value={typeof attendanceSquadFilter === 'string' ? attendanceSquadFilter : 'multiple'}
                  onValueChange={(value) => setAttendanceSquadFilter(value)}
                >
                  <SelectTrigger className="h-7 text-xs bg-white/20 border-white/30 text-white" data-testid="select-attendance-squad">
                    <SelectValue>
                      {attendanceSquadFilter === 'primary' 
                        ? 'Primary Squads'
                        : attendanceSquadFilter === 'all'
                        ? 'All Squads'
                        : typeof attendanceSquadFilter === 'string'
                        ? squads.find(s => s.id === attendanceSquadFilter)?.name
                        : `${(attendanceSquadFilter as string[]).length} Squads`
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {primarySquads.length > 0 && (
                      <SelectItem value="primary">Primary Squads</SelectItem>
                    )}
                    {primarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name} (Primary)
                      </SelectItem>
                    ))}
                    <SelectItem value="all">All Squads</SelectItem>
                    {nonPrimarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {swimmerAttendance.length > 0 && (
                <div className="pt-3 border-t border-green-400/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-white/80 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Top 3</span>
                      </div>
                      {top3Swimmers.map(({ swimmer, percentage }) => (
                        <div 
                          key={swimmer.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded bg-white/10"
                        >
                          <span className="truncate text-white">{swimmer.firstName} {swimmer.lastName[0]}.</span>
                          <span className="text-xs font-semibold text-white/80 ml-1">{percentage}%</span>
                        </div>
                      ))}
                    </div>
                    
                    {bottom3Swimmers.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-white/80 mb-1">
                          <TrendingDown className="h-3 w-3" />
                          <span>Bottom 3</span>
                        </div>
                        {bottom3Swimmers.map(({ swimmer, percentage }) => (
                          <div 
                            key={swimmer.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-white/10"
                          >
                            <span className="truncate text-white">{swimmer.firstName} {swimmer.lastName[0]}.</span>
                            <span className="text-xs font-semibold text-orange-200 ml-1">{percentage}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-center text-white/80 pt-3 flex items-center justify-center gap-1">
                    <span>Click to view all {swimmerAttendance.length} swimmers</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="text-white border-0 lg:col-span-1" style={{ background: 'linear-gradient(to bottom right, var(--club-card-2-start), var(--club-card-2-end))' }} data-testid="card-total-distance">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white/80 text-sm">Total Distance</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-total-distance">
                    {(thisWeekSwimmerStats.totalDistance / 1000).toFixed(1)}km
                  </p>
                  <p className="text-white/80 text-xs mt-1">This Week</p>
                </div>
                <Waves className="h-10 w-10 text-white/60" />
              </div>
              
              <div className="mb-3">
                <Select value={distanceSquadFilter} onValueChange={setDistanceSquadFilter}>
                  <SelectTrigger className="h-7 text-xs bg-white/20 border-white/30 text-white" data-testid="select-distance-squad">
                    <SelectValue>
                      {squads.find(s => s.id === distanceSquadFilter)?.name || 'Select Squad'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {primarySquads.length > 0 && primarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name} (Primary)
                      </SelectItem>
                    ))}
                    {nonPrimarySquads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-emerald-400/30">
                <div>
                  <p className="text-white/60">Avg per session</p>
                  <p className="font-semibold">
                    {thisWeekSessionsForDistance.length > 0 
                      ? (thisWeekSwimmerStats.totalDistance / thisWeekSessionsForDistance.length / 1000).toFixed(1)
                      : 0}km
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Sessions</p>
                  <p className="font-semibold">{thisWeekSessionsForDistance.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="text-white border-0" style={{ background: 'linear-gradient(to bottom right, var(--club-card-3-start), var(--club-card-3-end))' }} data-testid="card-training-breakdown">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5 flex-shrink-0" />
                This Week's Training Breakdown
              </span>
              <span className="text-sm font-normal text-white/80">
                ({squads.find(s => s.id === distanceSquadFilter)?.name})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  By Stroke
                </h4>
                <div className="space-y-2">
                  {Object.entries(thisWeekSwimmerStats.strokes).map(([stroke, distance]) => (
                    <div key={stroke}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{stroke === 'no1' ? 'No1' : stroke}</span>
                        <span className="font-medium">{(distance / 1000).toFixed(1)}km</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-white/80"
                          style={{ 
                            width: `${thisWeekSwimmerStats.totalDistance > 0 ? (distance / thisWeekSwimmerStats.totalDistance) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  By Type
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(thisWeekSwimmerStats.types).map(([type, distance]) => (
                    <div key={type} className="p-3 bg-white/10 rounded-lg">
                      <p className="text-xs text-white/80 capitalize">{type}</p>
                      <p className="text-lg font-bold mt-1">{(distance / 1000).toFixed(1)}km</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {upcomingCompetitions.length > 0 && (
          <Card className="text-white border-0" style={{ background: 'linear-gradient(to bottom right, var(--club-card-4-start), var(--club-card-4-end))' }} data-testid="card-upcoming-competitions">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Upcoming Competitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingCompetitions.map(comp => {
                  const location = locations.find(l => l.id === comp.locationId);
                  const compStart = new Date(comp.startDate);
                  const compEnd = new Date(comp.endDate);
                  const isSameDay = format(compStart, 'yyyy-MM-dd') === format(compEnd, 'yyyy-MM-dd');
                  
                  return (
                    <div 
                      key={comp.id}
                      className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      data-testid={`competition-${comp.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 bg-white/40" 
                            />
                            <span className="truncate">{comp.competitionName}</span>
                          </div>
                          <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {isSameDay 
                              ? format(compStart, 'EEE, MMM d, yyyy')
                              : `${format(compStart, 'MMM d')} - ${format(compEnd, 'MMM d, yyyy')}`
                            }
                          </div>
                          <div className="text-xs text-white/90 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location?.name || 'TBD'}
                          </div>
                        </div>
                        <Badge 
                          className="text-xs whitespace-nowrap bg-white/20 text-white border-white/30"
                        >
                          {Math.ceil((compStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-coaching-profile">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: 'var(--club-primary)' }} />
              Your Coaching Profile ({currentMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-sessions-led">
                  {totalStats.sessionsThisMonth}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sessions Led</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-squads-count">
                  {totalStats.squadsCoached}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Squads Coached</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAllSwimmers} onOpenChange={setShowAllSwimmers}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
              All Swimmers Attendance
            </DialogTitle>
            <DialogDescription>
              View attendance details for all swimmers in your filtered squads.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <div className="grid grid-cols-1 gap-2">
              {swimmerAttendance.map(({ swimmer, percentage, attended, total, lateCount, veryLateCount }) => {
                const squad = squads.find(s => s.id === swimmer.squadId);
                
                return (
                  <div 
                    key={swimmer.id}
                    className="flex items-start justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-4"
                    onClick={() => {
                      onNavigateToSwimmerProfile(swimmer);
                      setShowAllSwimmers(false);
                    }}
                    data-testid={`swimmer-attendance-${swimmer.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <span>{swimmer.firstName} {swimmer.lastName}</span>
                        {veryLateCount > 0 && (
                          <Badge 
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 shrink-0"
                            style={{
                              backgroundColor: '#ef444410',
                              color: '#ef4444',
                              borderColor: '#ef444440'
                            }}
                          >
                            <Clock className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                        {lateCount > 0 && veryLateCount === 0 && (
                          <Badge 
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4 shrink-0"
                            style={{
                              backgroundColor: '#f59e0b10',
                              color: '#f59e0b',
                              borderColor: '#f59e0b40'
                            }}
                          >
                            <Clock className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {squad?.name}
                      </div>
                      {(lateCount > 0 || veryLateCount > 0) && (
                        <div className="text-xs mt-1">
                          <span className="text-orange-500">
                            {lateCount > 0 && `${lateCount} late`}
                            {lateCount > 0 && veryLateCount > 0 && ', '}
                            {veryLateCount > 0 && `${veryLateCount} very late`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${percentage ?? 0}%`,
                              backgroundColor: (percentage ?? 0) >= 80 ? 'var(--club-primary)' : (percentage ?? 0) >= 60 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">{percentage ?? 0}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{attended}/{total} sessions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllIncompleteSessions} onOpenChange={setShowAllIncompleteSessions}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              All Sessions Requiring Action
            </DialogTitle>
            <DialogDescription>
              {allIncompleteSessions.length} session{allIncompleteSessions.length !== 1 ? 's' : ''} need your attention. Click on a session to complete it.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 pb-6">
            <div className="grid grid-cols-1 gap-2">
              {allIncompleteSessions.map(({ session, missingFeedback, missingAttendance }) => {
                const squad = squads.find(s => s.id === session.squadId);
                
                return (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-300 cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigateToSession(session);
                      setShowAllIncompleteSessions(false);
                    }}
                    data-testid={`modal-action-session-${session.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CalendarDays className="h-4 w-4 text-orange-600 flex-shrink-0 self-start mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{squad?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.date), 'EEE, MMM d')} • {session.startTime}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {missingAttendance && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] border-orange-300 text-orange-600"
                            >
                              No attendance
                            </Badge>
                          )}
                          {missingFeedback && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] border-orange-300 text-orange-600"
                            >
                              No feedback
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7 ml-2 flex-shrink-0">Complete</Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
