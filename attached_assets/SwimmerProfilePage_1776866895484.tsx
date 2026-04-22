import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, Calendar, Clock, Waves, BarChart3, ChevronLeft } from 'lucide-react';
import { Swimmer, Session, Squad } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfYear, subMonths } from 'date-fns';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface SwimmerProfilePageProps {
  swimmer: Swimmer;
  sessions: Session[];
  squads: Squad[];
  onBack: () => void;
}

type TimePeriod = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'all_time';

export function SwimmerProfilePage({ swimmer, sessions, squads, onBack }: SwimmerProfilePageProps) {
  const squad = squads.find(s => s.id === swimmer.squadId);
  const [dayOfWeekPeriod, setDayOfWeekPeriod] = useState<TimePeriod>('all_time');
  const [punctualityPeriod, setPunctualityPeriod] = useState<TimePeriod>('all_time');
  
  // Helper function to get date range based on period
  const getDateRange = (period: TimePeriod): { start: Date; end: Date } => {
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case 'this_week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        return { start, end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: subMonths(now, 3), end: now };
      case 'year_to_date':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      case 'all_time':
        return { start: new Date(2020, 0, 1), end: now }; // Arbitrary old date
    }
  };
  
  // Filter sessions by time period
  const getFilteredSessions = (period: TimePeriod) => {
    const { start, end } = getDateRange(period);
    const now = new Date();
    
    return sessions.filter(s => 
      s.squadId === swimmer.squadId && 
      isWithinInterval(new Date(s.date), { start, end }) &&
      new Date(s.date) <= now &&
      s.attendance // Only include sessions with attendance data
    );
  };
  
  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get all past sessions for this swimmer's squad with attendance data
    const squadSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId && 
      new Date(s.date) < now && 
      s.attendance
    );
    
    const getSwimmerAttendance = (sessionList: Session[]) => {
      let attended = 0;
      let total = sessionList.length;
      
      sessionList.forEach(session => {
        const swimmerRecord = session.attendance?.find(a => a.swimmerId === swimmer.id);
        if (swimmerRecord && (
          swimmerRecord.status === 'Present' || 
          swimmerRecord.status === '1st half only' || 
          swimmerRecord.status === '2nd half only'
        )) {
          attended++;
        }
      });
      
      return { attended, total };
    };
    
    const overall = getSwimmerAttendance(squadSessions);
    
    const weekSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd })
    );
    const week = getSwimmerAttendance(weekSessions);
    
    const monthSessions = squadSessions.filter(s => 
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd })
    );
    const month = getSwimmerAttendance(monthSessions);
    
    return {
      overall: overall.total > 0 ? Math.round((overall.attended / overall.total) * 100) : 0,
      thisWeek: week.total > 0 ? Math.round((week.attended / week.total) * 100) : 0,
      thisMonth: month.total > 0 ? Math.round((month.attended / month.total) * 100) : 0,
      weekSessions: week.total,
      weekAttended: week.attended,
      monthSessions: month.total,
      monthAttended: month.attended,
    };
  }, [swimmer, sessions]);
  
  // Punctuality stats with period filter
  const punctualityStats = useMemo(() => {
    const filteredSessions = getFilteredSessions(punctualityPeriod);
    
    let onTimeCount = 0;
    let lateCount = 0;
    let veryLateCount = 0;
    let attended = 0;
    
    filteredSessions.forEach(session => {
      const swimmerRecord = session.attendance?.find(a => a.swimmerId === swimmer.id);
      if (swimmerRecord && (
        swimmerRecord.status === 'Present' || 
        swimmerRecord.status === '1st half only' || 
        swimmerRecord.status === '2nd half only'
      )) {
        attended++;
        if (swimmerRecord.notes === 'Late') {
          lateCount++;
        } else if (swimmerRecord.notes === 'Very Late') {
          veryLateCount++;
        } else {
          onTimeCount++;
        }
      }
    });
    
    const onTimePercentage = attended > 0 ? Math.round((onTimeCount / attended) * 100) : 100;
    
    return {
      attended,
      onTimeCount,
      lateCount,
      veryLateCount,
      onTimePercentage
    };
  }, [swimmer, sessions, punctualityPeriod]);
  
  // Attendance by day of week with period filter
  const attendanceByDay = useMemo(() => {
    const filteredSessions = getFilteredSessions(dayOfWeekPeriod);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const dayStats = days.map((day, index) => {
      const dayIndex = index === 6 ? 0 : index + 1; // Adjust for getDay (0 = Sunday)
      const daySessions = filteredSessions.filter(s => 
        getDay(new Date(s.date)) === dayIndex
      );
      
      let attended = 0;
      daySessions.forEach(session => {
        const swimmerRecord = session.attendance?.find(a => a.swimmerId === swimmer.id);
        if (swimmerRecord && (
          swimmerRecord.status === 'Present' || 
          swimmerRecord.status === '1st half only' || 
          swimmerRecord.status === '2nd half only'
        )) {
          attended++;
        }
      });
      
      const percentage = daySessions.length > 0 ? Math.round((attended / daySessions.length) * 100) : 0;
      
      return { day, percentage, total: daySessions.length, attended };
    });
    
    // Filter out days with 0 total sessions
    return dayStats.filter(stat => stat.total > 0);
  }, [swimmer, sessions, dayOfWeekPeriod]);
  
  // Attendance by month (last 6 months) with squad average
  const attendanceByMonth = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Get all swimmers in the squad
    const squadSwimmers = sessions
      .filter(s => s.squadId === swimmer.squadId && s.attendance)
      .reduce((acc, session) => {
        session.attendance?.forEach(a => {
          if (!acc.includes(a.swimmerId)) {
            acc.push(a.swimmerId);
          }
        });
        return acc;
      }, [] as string[]);
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthSessions = sessions.filter(s => 
        s.squadId === swimmer.squadId &&
        isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
        new Date(s.date) <= now &&
        s.attendance
      );
      
      // Calculate swimmer's attendance
      let swimmerAttended = 0;
      monthSessions.forEach(session => {
        const swimmerRecord = session.attendance?.find(a => a.swimmerId === swimmer.id);
        if (swimmerRecord && (
          swimmerRecord.status === 'Present' || 
          swimmerRecord.status === '1st half only' || 
          swimmerRecord.status === '2nd half only'
        )) {
          swimmerAttended++;
        }
      });
      
      const swimmerPercentage = monthSessions.length > 0 ? Math.round((swimmerAttended / monthSessions.length) * 100) : 0;
      
      // Calculate squad average
      let squadTotalAttendance = 0;
      let squadTotalPossible = 0;
      
      monthSessions.forEach(session => {
        const sessionAttendees = session.attendance?.filter(a => 
          a.status === 'Present' || 
          a.status === '1st half only' || 
          a.status === '2nd half only'
        ).length || 0;
        
        squadTotalAttendance += sessionAttendees;
        squadTotalPossible += session.attendance?.length || 0;
      });
      
      const squadAverage = squadTotalPossible > 0 ? Math.round((squadTotalAttendance / squadTotalPossible) * 100) : 0;
      
      months.push({
        name: format(date, 'MMM'),
        swimmerPercentage,
        squadAverage,
        total: monthSessions.length
      });
    }
    
    console.log('Attendance by month data:', months);
    
    return months;
  }, [swimmer, sessions]);
  
  // Distance stats
  const distanceStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    
    const weekSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }) &&
      new Date(s.date) < now
    );
    
    const monthSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
      new Date(s.date) < now
    );
    
    const yearSessions = sessions.filter(s => 
      s.squadId === swimmer.squadId &&
      isWithinInterval(new Date(s.date), { start: yearStart, end: now })
    );
    
    const calculateDistance = (sessionList: Session[]) => {
      return sessionList.reduce((total, session) => {
        return total + (session.distanceBreakdown?.total || 0);
      }, 0);
    };
    
    return {
      thisWeek: calculateDistance(weekSessions) / 1000, // Convert to km
      thisMonth: calculateDistance(monthSessions) / 1000,
      thisYear: calculateDistance(yearSessions) / 1000
    };
  }, [swimmer, sessions]);
  
  const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();
  
  const periodLabels: Record<TimePeriod, string> = {
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    last_3_months: 'Last 3 Months',
    year_to_date: 'Year to Date',
    all_time: 'All Time'
  };
  
  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ backgroundColor: '#4B9A4A' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{swimmer.firstName} {swimmer.lastName}</h1>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.thisWeek}%</p>
                <p className="text-blue-100 text-xs">{attendanceStats.weekAttended}/{attendanceStats.weekSessions} sessions</p>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.thisMonth}%</p>
                <p className="text-green-100 text-xs">{attendanceStats.monthAttended}/{attendanceStats.monthSessions} sessions</p>
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
                <p className="text-2xl font-bold mt-1">{attendanceStats.overall}%</p>
                <p className="text-purple-100 text-xs">Attendance Rate</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Punctuality Stats with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: '#4B9A4A' }} />
              Punctuality
            </CardTitle>
            <Select value={punctualityPeriod} onValueChange={(v) => setPunctualityPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
              <p className="text-3xl font-bold" style={{ color: '#4B9A4A' }}>
                {punctualityStats.onTimePercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">On Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">{punctualityStats.onTimeCount} of {punctualityStats.attended} sessions</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Late</p>
                    <p className="text-2xl font-bold text-amber-600">{punctualityStats.lateCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {punctualityStats.attended > 0 ? Math.round((punctualityStats.lateCount / punctualityStats.attended) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Very Late</p>
                    <p className="text-2xl font-bold text-red-600">{punctualityStats.veryLateCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {punctualityStats.attended > 0 ? Math.round((punctualityStats.veryLateCount / punctualityStats.attended) * 100) : 0}%
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
            <Waves className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Distance Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                {distanceStats.thisWeek.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Week</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                {distanceStats.thisMonth.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Month</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold" style={{ color: '#4B9A4A' }}>
                {distanceStats.thisYear.toFixed(1)}km
              </p>
              <p className="text-sm text-muted-foreground mt-1">This Year</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance by Day of Week with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" style={{ color: '#4B9A4A' }} />
              Attendance by Day of Week
            </CardTitle>
            <Select value={dayOfWeekPeriod} onValueChange={(v) => setDayOfWeekPeriod(v as TimePeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceByDay.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sessions in this period
            </p>
          ) : (
            <div className="space-y-3">
              {attendanceByDay.map(({ day, percentage, total, attended }) => (
                <div key={day}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{day}</span>
                    <span className="text-muted-foreground">
                      {percentage}% ({attended}/{total} sessions)
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: '#4B9A4A'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Attendance Trend with Squad Average */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            Attendance Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={attendanceByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'squadAverage') return [`${value}%`, 'Squad Average'];
                  if (name === 'swimmerPercentage') return [`${value}%`, 'Swimmer'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  if (value === 'squadAverage') return 'Squad Average';
                  if (value === 'swimmerPercentage') return 'Swimmer';
                  return value;
                }}
              />
              <Bar 
                key="bar-squad-average"
                dataKey="squadAverage" 
                fill="#93C5FD" 
                name="squadAverage" 
              />
              <Line 
                key="line-swimmer-percentage"
                type="monotone" 
                dataKey="swimmerPercentage" 
                stroke="#4B9A4A" 
                strokeWidth={3}
                dot={{ fill: '#4B9A4A', r: 6 }}
                activeDot={{ r: 8 }}
                name="swimmerPercentage"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}