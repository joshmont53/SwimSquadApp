import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { TrendingUp, Calendar, Clock, Waves, BarChart3, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Swimmer, Session, Squad } from '@/lib/typeAdapters';
import type { Attendance } from '@shared/schema';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfYear, subMonths } from 'date-fns';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TimePeriod = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'all_time';

const periodLabels: Record<TimePeriod, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  year_to_date: 'Year to Date',
  all_time: 'All Time',
};

const TIME_PERIOD_OPTIONS: TimePeriod[] = [
  'this_week',
  'this_month',
  'last_month',
  'last_3_months',
  'year_to_date',
  'all_time',
];

interface SwimmerProfilePageProps {
  swimmer: Swimmer;
  sessions: Session[];
  squads: Squad[];
  attendance: Attendance[];
  onBack: () => void;
}

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case 'last_3_months':
      return { start: subMonths(now, 3), end: now };
    case 'year_to_date':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'all_time':
    default:
      return { start: new Date(2020, 0, 1), end: now };
  }
}

const isPresent = (status: string | null | undefined) =>
  status === 'Present' || status === 'First Half Only' || status === 'Second Half Only';

export function SwimmerProfilePage({ swimmer, sessions, squads, attendance, onBack }: SwimmerProfilePageProps) {
  const squad = squads.find(s => s.id === swimmer.squadId);

  const [punctualityPeriod, setPunctualityPeriod] = useState<TimePeriod>('all_time');
  const [dayOfWeekPeriod, setDayOfWeekPeriod] = useState<TimePeriod>('all_time');

  // Get swimmer's attendance records
  const swimmerAttendance = useMemo(() => {
    return attendance.filter(a => a.swimmerId === swimmer.id);
  }, [attendance, swimmer.id]);

  // Helper: get session date from attendance record
  const getSessionDate = (a: Attendance): Date | null => {
    const session = sessions.find(s => s.id === a.sessionId);
    return session ? new Date(session.date) : null;
  };

  // ─── Quick Stats (all-time / this-week / this-month) ─────────────────────
  const attendanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalSessions = swimmerAttendance.length;
    const attended = swimmerAttendance.filter(a => isPresent(a.status)).length;

    const weekAttendance = swimmerAttendance.filter(a => {
      const d = getSessionDate(a);
      return d && isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const weekTotal = weekAttendance.length;
    const weekAttended = weekAttendance.filter(a => isPresent(a.status)).length;

    const monthAttendance = swimmerAttendance.filter(a => {
      const d = getSessionDate(a);
      return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const monthTotal = monthAttendance.length;
    const monthAttended = monthAttendance.filter(a => isPresent(a.status)).length;

    return {
      overall: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
      thisWeek: weekTotal > 0 ? Math.round((weekAttended / weekTotal) * 100) : 0,
      thisMonth: monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 0,
      weekSessions: weekTotal,
      weekAttended,
      monthSessions: monthTotal,
      monthAttended,
      attended,
    };
  }, [swimmer, sessions, swimmerAttendance]);

  // ─── Punctuality Stats (filtered by period) ───────────────────────────────
  const punctualityStats = useMemo(() => {
    const { start, end } = getDateRange(punctualityPeriod);
    const now = new Date();

    const filtered = swimmerAttendance.filter(a => {
      const d = getSessionDate(a);
      return d && isWithinInterval(d, { start, end }) && d <= now && isPresent(a.status);
    });

    const attended = filtered.length;
    const lateCount = filtered.filter(a => a.notes?.toLowerCase() === 'late').length;
    const veryLateCount = filtered.filter(a => a.notes?.toLowerCase() === 'very late').length;
    const onTimeCount = attended - lateCount - veryLateCount;
    const onTimePercentage = attended > 0 ? Math.round((onTimeCount / attended) * 100) : 100;

    return { attended, onTimeCount, lateCount, veryLateCount, onTimePercentage };
  }, [swimmer, sessions, swimmerAttendance, punctualityPeriod]);

  // ─── Attendance by Day of Week (filtered by period, hide 0-session days) ──
  const attendanceByDay = useMemo(() => {
    const { start, end } = getDateRange(dayOfWeekPeriod);
    const now = new Date();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const dayStats = days.map((day, index) => {
      const dayIndex = index === 6 ? 0 : index + 1; // Mon=1 … Sun=0

      const dayAttendance = swimmerAttendance.filter(a => {
        const session = sessions.find(s => s.id === a.sessionId);
        if (!session) return false;
        const d = new Date(session.date);
        return isWithinInterval(d, { start, end }) && d <= now && getDay(d) === dayIndex;
      });

      const total = dayAttendance.length;
      const attended = dayAttendance.filter(a => isPresent(a.status)).length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

      return { day, percentage, total, attended };
    });

    // Hide days with no sessions in the selected period
    return dayStats.filter(s => s.total > 0);
  }, [swimmer, sessions, swimmerAttendance, dayOfWeekPeriod]);

  // ─── Attendance Trend — last 6 months (swimmer line + squad avg bars) ─────
  const attendanceByMonth = useMemo(() => {
    const now = new Date();

    // All squad swimmers that appear in any attendance record
    const squadSwimmerIds = Array.from(
      new Set(
        attendance
          .filter(a => {
            const session = sessions.find(s => s.id === a.sessionId);
            return session && session.squadId === swimmer.squadId;
          })
          .map(a => a.swimmerId)
      )
    );

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthSessions = sessions.filter(s =>
        s.squadId === swimmer.squadId &&
        isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
        new Date(s.date) <= now
      );

      // Swimmer's own attendance %
      const swimmerMonthAttendance = attendance.filter(a => {
        const session = sessions.find(s => s.id === a.sessionId);
        return (
          a.swimmerId === swimmer.id &&
          session &&
          session.squadId === swimmer.squadId &&
          isWithinInterval(new Date(session.date), { start: monthStart, end: monthEnd }) &&
          new Date(session.date) <= now
        );
      });
      const swimmerAttended = swimmerMonthAttendance.filter(a => isPresent(a.status)).length;
      const swimmerTotal = swimmerMonthAttendance.length;
      const swimmerPercentage = swimmerTotal > 0 ? Math.round((swimmerAttended / swimmerTotal) * 100) : 0;

      // Squad average: per-swimmer averages, then average of those
      const swimmerAverages: number[] = [];
      for (const swId of squadSwimmerIds) {
        const swRecords = attendance.filter(a => {
          const session = sessions.find(s => s.id === a.sessionId);
          return (
            a.swimmerId === swId &&
            session &&
            session.squadId === swimmer.squadId &&
            isWithinInterval(new Date(session.date), { start: monthStart, end: monthEnd }) &&
            new Date(session.date) <= now
          );
        });
        if (swRecords.length > 0) {
          const swAttended = swRecords.filter(a => isPresent(a.status)).length;
          swimmerAverages.push(Math.round((swAttended / swRecords.length) * 100));
        }
      }
      const squadAverage =
        swimmerAverages.length > 0
          ? Math.round(swimmerAverages.reduce((a, b) => a + b, 0) / swimmerAverages.length)
          : 0;

      months.push({
        name: format(date, 'MMM'),
        swimmerPercentage: swimmerTotal > 0 ? swimmerPercentage : null,
        squadAverage: monthSessions.length > 0 ? squadAverage : null,
        total: swimmerTotal,
      });
    }

    return months;
  }, [swimmer, sessions, attendance]);

  // ─── Distance stats ───────────────────────────────────────────────────────
  const distanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);

    const attendedSessionIds = swimmerAttendance
      .filter(a => isPresent(a.status))
      .map(a => a.sessionId);

    const attendedSessions = sessions.filter(s => attendedSessionIds.includes(s.id));

    const calculateDistance = (sessionList: Session[]) =>
      sessionList.reduce((sum, s) => sum + (s.distanceBreakdown?.total || 0), 0) / 1000;

    return {
      thisWeek: calculateDistance(attendedSessions.filter(s => isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }))),
      thisMonth: calculateDistance(attendedSessions.filter(s => isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }))),
      thisYear: calculateDistance(attendedSessions.filter(s => isWithinInterval(new Date(s.date), { start: yearStart, end: now }))),
    };
  }, [swimmer, sessions, swimmerAttendance]);

  const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();

  // Custom tooltip for the composed chart
  const MonthlyChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const squadVal = payload.find((p: any) => p.dataKey === 'squadAverage');
    const swimmerVal = payload.find((p: any) => p.dataKey === 'swimmerPercentage');
    return (
      <div className="bg-card border rounded-md p-3 shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {squadVal && squadVal.value !== null && (
          <p style={{ color: 'var(--club-primary)' }}>Squad Avg: {squadVal.value}%</p>
        )}
        {swimmerVal && swimmerVal.value !== null && (
          <p className="text-foreground">
            {swimmer.firstName}: {swimmerVal.value}%
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
          data-testid="button-back-profile"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback
            className="text-white font-bold"
            style={{ backgroundColor: 'var(--club-primary)' }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" data-testid="text-swimmer-name">
            {swimmer.firstName} {swimmer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {squad?.name} • {format(new Date(swimmer.dateOfBirth), 'dd/MM/yyyy')}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">This Week</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-week-attendance">
                  {attendanceStats.thisWeek}%
                </p>
                <p className="text-blue-100 text-xs">
                  {attendanceStats.weekAttended}/{attendanceStats.weekSessions} sessions
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">This Month</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-month-attendance">
                  {attendanceStats.thisMonth}%
                </p>
                <p className="text-green-100 text-xs">
                  {attendanceStats.monthAttended}/{attendanceStats.monthSessions} sessions
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Overall</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-overall-attendance">
                  {attendanceStats.overall}%
                </p>
                <p className="text-purple-100 text-xs">Attendance Rate</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Punctuality Stats */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
              Punctuality
            </CardTitle>
            <Select
              value={punctualityPeriod}
              onValueChange={(v) => setPunctualityPeriod(v as TimePeriod)}
            >
              <SelectTrigger className="w-40" data-testid="select-punctuality-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{periodLabels[opt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
              <p className="text-3xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-ontime-percentage">
                {punctualityStats.onTimePercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">On Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {punctualityStats.onTimeCount} of {punctualityStats.attended} sessions
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Late</p>
                    <p className="text-2xl font-bold text-amber-600" data-testid="text-late-count">
                      {punctualityStats.lateCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {punctualityStats.attended > 0
                        ? Math.round((punctualityStats.lateCount / punctualityStats.attended) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Very Late</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-verylate-count">
                      {punctualityStats.veryLateCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {punctualityStats.attended > 0
                        ? Math.round((punctualityStats.veryLateCount / punctualityStats.attended) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
            Distance Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-week-distance">
                {distanceStats.thisWeek.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Week</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-month-distance">
                {distanceStats.thisMonth.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Month</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: 'var(--club-primary)' }} data-testid="text-year-distance">
                {distanceStats.thisYear.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance by Day of Week */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
              Attendance by Day of Week
            </CardTitle>
            <Select
              value={dayOfWeekPeriod}
              onValueChange={(v) => setDayOfWeekPeriod(v as TimePeriod)}
            >
              <SelectTrigger className="w-40" data-testid="select-day-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{periodLabels[opt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions recorded in this period.
            </p>
          ) : (
            <div className="space-y-3">
              {attendanceByDay.map(({ day, percentage, total, attended }) => (
                <div key={day}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{day}</span>
                    <span className="text-muted-foreground">
                      {percentage}% ({attended}/{total})
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: 'var(--club-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Trend — Last 6 Months */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
            Attendance Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={attendanceByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<MonthlyChartTooltip />} />
              <Legend
                formatter={(value) =>
                  value === 'squadAverage'
                    ? 'Squad Average'
                    : `${swimmer.firstName}'s Attendance`
                }
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="squadAverage"
                name="squadAverage"
                fill="var(--club-primary)"
                fillOpacity={0.35}
                radius={[3, 3, 0, 0]}
              />
              <Line
                dataKey="swimmerPercentage"
                name="swimmerPercentage"
                type="monotone"
                stroke="var(--club-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--club-primary)', r: 4 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
