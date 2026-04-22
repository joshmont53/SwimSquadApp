import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Session, Squad, Swimmer } from '../types';
import { BarChart, PieChart, Pie, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { BarChart3, PieChart as PieChartIcon, Clock, MessageSquare, ArrowLeft, Send, TrendingUp } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, getDay, parse, isValid, format } from 'date-fns';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';

interface AttendanceAnalysisProps {
  sessions: Session[];
  squads: Squad[];
  swimmers: Swimmer[];
  coaches: any[];
  onBack: () => void;
}

type TimePeriod = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'all_time';
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all';

export function AttendanceAnalysis({ sessions, squads, swimmers, onBack }: AttendanceAnalysisProps) {
  // Chart 1: Average Attendance by Squad
  const [chart1TimePeriod, setChart1TimePeriod] = useState<TimePeriod>('last_month');
  const [chart1SelectedSquads, setChart1SelectedSquads] = useState<string[]>(squads.map(s => s.id));

  // Chart 2: Attendance for Squad on Specific Day
  const [chart2TimePeriod, setChart2TimePeriod] = useState<TimePeriod>('last_month');
  const [chart2SelectedSquad, setChart2SelectedSquad] = useState<string>('all');
  const [chart2DayOfWeek, setChart2DayOfWeek] = useState<DayOfWeek>('all');

  // Chart 3: Punctuality Analysis
  const [chart3TimePeriod, setChart3TimePeriod] = useState<TimePeriod>('last_month');
  const [chart3SelectedSquad, setChart3SelectedSquad] = useState<string>('all');
  const [chart3DrillDownSquadId, setChart3DrillDownSquadId] = useState<string | null>(null);

  // Chart 4: Attendance Trends Over Time
  const [chart4MonthsBack, setChart4MonthsBack] = useState<number>(6);
  const [chart4SelectedSquads, setChart4SelectedSquads] = useState<string[]>(squads.length > 0 ? [squads[0].id] : []);

  // AI Chat Assistant
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const periodLabels: Record<TimePeriod, string> = {
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    last_3_months: 'Last 3 Months',
    year_to_date: 'Year to Date',
    all_time: 'All Time'
  };

  const dayLabels: Record<DayOfWeek, string> = {
    all: 'All Days',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  // Helper function to get date range
  const getDateRange = (period: TimePeriod): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (period) {
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
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
        return { start: new Date(2020, 0, 1), end: now };
    }
  };

  // Helper function to filter sessions by day of week
  const filterByDayOfWeek = (sessionDate: Date, dayFilter: DayOfWeek): boolean => {
    if (dayFilter === 'all') return true;
    
    const dayMap: Record<Exclude<DayOfWeek, 'all'>, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    
    return getDay(sessionDate) === dayMap[dayFilter];
  };

  // Chart 1 Data: Average Attendance by Squad
  const attendanceBySquadData = useMemo(() => {
    const { start, end } = getDateRange(chart1TimePeriod);
    const now = new Date();
    
    const selectedSquadIds = chart1SelectedSquads;
    
    return selectedSquadIds.map(squadId => {
      const squad = squads.find(s => s.id === squadId);
      const squadSessions = sessions.filter(s => 
        s.squadId === squadId &&
        isWithinInterval(new Date(s.date), { start, end }) &&
        new Date(s.date) <= now &&
        s.attendance
      );

      let totalAttended = 0;
      let totalPossible = 0;

      squadSessions.forEach(session => {
        const attended = session.attendance?.filter(a => 
          a.status === 'Present' || 
          a.status === '1st half only' || 
          a.status === '2nd half only'
        ).length || 0;
        
        totalAttended += attended;
        totalPossible += session.attendance?.length || 0;
      });

      const percentage = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;

      return {
        id: squadId,
        name: squad?.name || 'Unknown',
        percentage,
        sessions: squadSessions.length
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, squads, chart1TimePeriod, chart1SelectedSquads]);

  // Chart 2 Data: Attendance for Squad on Specific Day
  const attendanceByDayData = useMemo(() => {
    const { start, end } = getDateRange(chart2TimePeriod);
    const now = new Date();
    
    const selectedSquadIds = chart2SelectedSquad === 'all' ? squads.map(s => s.id) : [chart2SelectedSquad];
    
    const filteredSessions = sessions.filter(s => 
      selectedSquadIds.includes(s.squadId) &&
      isWithinInterval(new Date(s.date), { start, end }) &&
      new Date(s.date) <= now &&
      filterByDayOfWeek(new Date(s.date), chart2DayOfWeek) &&
      s.attendance
    );

    let totalPresent = 0;
    let totalAbsent = 0;

    filteredSessions.forEach(session => {
      session.attendance?.forEach(record => {
        if (record.status === 'Present' || record.status === '1st half only' || record.status === '2nd half only') {
          totalPresent++;
        } else {
          totalAbsent++;
        }
      });
    });

    const total = totalPresent + totalAbsent;
    
    return [
      { name: 'Present', value: totalPresent, percentage: total > 0 ? ((totalPresent / total) * 100).toFixed(1) : 0 },
      { name: 'Absent', value: totalAbsent, percentage: total > 0 ? ((totalAbsent / total) * 100).toFixed(1) : 0 }
    ];
  }, [sessions, squads, chart2TimePeriod, chart2SelectedSquad, chart2DayOfWeek]);

  // Chart 3 Data: Punctuality by Squad or Swimmers
  const punctualityData = useMemo(() => {
    const { start, end } = getDateRange(chart3TimePeriod);
    const now = new Date();
    
    // If drill-down is active, show swimmers for that squad
    if (chart3DrillDownSquadId) {
      const squadSwimmers = swimmers.filter(sw => sw.squadId === chart3DrillDownSquadId);
      
      return squadSwimmers.map(swimmer => {
        const swimmerSessions = sessions.filter(s => 
          s.squadId === chart3DrillDownSquadId &&
          isWithinInterval(new Date(s.date), { start, end }) &&
          new Date(s.date) <= now &&
          s.attendance
        );

        let onTime = 0;
        let late = 0;
        let veryLate = 0;
        let total = 0;

        swimmerSessions.forEach(session => {
          const record = session.attendance?.find(a => a.swimmerId === swimmer.id);
          if (record && (record.status === 'Present' || record.status === '1st half only' || record.status === '2nd half only')) {
            total++;
            if (record.notes === 'Late') {
              late++;
            } else if (record.notes === 'Very Late') {
              veryLate++;
            } else {
              onTime++;
            }
          }
        });

        // Calculate percentages ensuring they add up to 100%
        let onTimePercentage, latePercentage, veryLatePercentage;
        
        if (total > 0) {
          onTimePercentage = Math.round((onTime / total) * 100);
          latePercentage = Math.round((late / total) * 100);
          veryLatePercentage = 100 - onTimePercentage - latePercentage;
        } else {
          // If no data, show 100% on time (so bar still displays)
          onTimePercentage = 100;
          latePercentage = 0;
          veryLatePercentage = 0;
        }

        return {
          id: swimmer.id,
          name: swimmer.name,
          'On Time': onTimePercentage,
          'Late': latePercentage,
          'Very Late': veryLatePercentage,
          total
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Otherwise show squads
    const selectedSquadIds = chart3SelectedSquad === 'all' ? squads.map(s => s.id) : [chart3SelectedSquad];
    
    return selectedSquadIds.map(squadId => {
      const squad = squads.find(s => s.id === squadId);
      const squadSessions = sessions.filter(s => 
        s.squadId === squadId &&
        isWithinInterval(new Date(s.date), { start, end }) &&
        new Date(s.date) <= now &&
        s.attendance
      );

      let onTime = 0;
      let late = 0;
      let veryLate = 0;
      let total = 0;

      squadSessions.forEach(session => {
        session.attendance?.forEach(record => {
          if (record.status === 'Present' || record.status === '1st half only' || record.status === '2nd half only') {
            total++;
            if (record.notes === 'Late') {
              late++;
            } else if (record.notes === 'Very Late') {
              veryLate++;
            } else {
              onTime++;
            }
          }
        });
      });

      // Calculate percentages ensuring they add up to 100%
      let onTimePercentage, latePercentage, veryLatePercentage;
      
      if (total > 0) {
        onTimePercentage = Math.round((onTime / total) * 100);
        latePercentage = Math.round((late / total) * 100);
        veryLatePercentage = 100 - onTimePercentage - latePercentage;
      } else {
        // If no data, show 100% on time (so bar still displays)
        onTimePercentage = 100;
        latePercentage = 0;
        veryLatePercentage = 0;
      }

      return {
        id: squadId,
        name: squad?.name || 'Unknown',
        'On Time': onTimePercentage,
        'Late': latePercentage,
        'Very Late': veryLatePercentage,
        total,
        squadId
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, squads, swimmers, chart3TimePeriod, chart3SelectedSquad, chart3DrillDownSquadId]);

  const handlePunctualityBarClick = (data: any, index: number) => {
    // Only allow drill-down if we're at squad level and a single squad is selected or viewing all squads
    if (!chart3DrillDownSquadId && data && data.squadId) {
      setChart3DrillDownSquadId(data.squadId);
    }
  };

  const handleBackToSquads = () => {
    setChart3DrillDownSquadId(null);
  };

  // Chart 4 Data: Attendance Trends Over Time
  const attendanceTrendsData = useMemo(() => {
    const now = new Date();
    
    // Generate list of months from most recent to oldest
    const months: Date[] = [];
    for (let i = chart4MonthsBack - 1; i >= 0; i--) {
      months.push(subMonths(now, i));
    }
    
    // For each month, calculate attendance % for each selected squad
    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const dataPoint: any = {
        month: format(monthDate, 'MMM yy')
      };
      
      chart4SelectedSquads.forEach(squadId => {
        const squad = squads.find(s => s.id === squadId);
        if (!squad) return;
        
        const monthSessions = sessions.filter(s => 
          s.squadId === squadId &&
          isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd }) &&
          new Date(s.date) <= now &&
          s.attendance
        );

        let totalAttended = 0;
        let totalPossible = 0;

        monthSessions.forEach(session => {
          const attended = session.attendance?.filter(a => 
            a.status === 'Present' || 
            a.status === '1st half only' || 
            a.status === '2nd half only'
          ).length || 0;
          
          totalAttended += attended;
          totalPossible += session.attendance?.length || 0;
        });

        const percentage = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;
        dataPoint[squad.name] = percentage;
      });
      
      return dataPoint;
    });
  }, [sessions, squads, chart4MonthsBack, chart4SelectedSquads]);

  // AI Analysis Assistant Logic
  const processQuestion = (question: string): string => {
    const q = question.toLowerCase();
    
    // Helper: Find squad by name (fuzzy match)
    const findSquad = (text: string): Squad | undefined => {
      return squads.find(squad => 
        text.includes(squad.name.toLowerCase()) ||
        text.includes(squad.name.toLowerCase().replace(/\s+/g, ''))
      );
    };

    // Helper: Parse date from text
    const parseDate = (text: string): Date | null => {
      // Try common date formats
      const datePatterns = [
        /(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i,
        /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
        /(\d{4})-(\d{2})-(\d{2})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          if (pattern === datePatterns[0]) {
            // "20th Jan" format
            const day = match[1];
            const month = match[3];
            const year = new Date().getFullYear();
            const dateStr = `${day} ${month} ${year}`;
            const parsed = parse(dateStr, 'd MMM yyyy', new Date());
            if (isValid(parsed)) return parsed;
          } else if (pattern === datePatterns[1]) {
            // "20/01/2024" format
            const parsed = parse(match[0], 'dd/MM/yyyy', new Date());
            if (isValid(parsed)) return parsed;
          } else if (pattern === datePatterns[2]) {
            // "2024-01-20" format
            const parsed = parse(match[0], 'yyyy-MM-dd', new Date());
            if (isValid(parsed)) return parsed;
          }
        }
      }
      return null;
    };

    // Question Type 1: Attendance % for a specific squad on a specific date
    if ((q.includes('attend') || q.includes('%')) && (q.includes('session') || q.includes('date'))) {
      const squad = findSquad(q);
      const date = parseDate(q);
      
      if (squad && date) {
        const session = sessions.find(s => 
          s.squadId === squad.id && 
          format(new Date(s.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        
        if (session && session.attendance) {
          const total = session.attendance.length;
          const attended = session.attendance.filter(a => 
            a.status === 'Present' || a.status === '1st half only' || a.status === '2nd half only'
          ).length;
          const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
          
          return `On ${format(date, 'do MMMM yyyy')}, the ${squad.name} squad had **${attended} out of ${total}** swimmers attend the session, which is **${percentage}%** attendance.`;
        } else {
          return `I couldn't find a session for ${squad.name} on ${format(date, 'do MMMM yyyy')}. Please check the date is correct.`;
        }
      } else if (!squad) {
        return `I couldn't identify which squad you're asking about. Available squads are: ${squads.map(s => s.name).join(', ')}.`;
      } else {
        return `I couldn't parse the date from your question. Please use formats like "20th Jan", "20/01/2024", or "2024-01-20".`;
      }
    }

    // Question Type 2: Which squad is worst for punctuality
    if ((q.includes('worst') || q.includes('best')) && (q.includes('punctual') || q.includes('late') || q.includes('on time'))) {
      const isWorst = q.includes('worst');
      
      const squadPunctuality = squads.map(squad => {
        const squadSessions = sessions.filter(s => s.squadId === squad.id && s.attendance);
        
        let onTime = 0;
        let total = 0;
        
        squadSessions.forEach(session => {
          session.attendance?.forEach(record => {
            if (record.status === 'Present' || record.status === '1st half only' || record.status === '2nd half only') {
              total++;
              if (!record.notes || (record.notes !== 'Late' && record.notes !== 'Very Late')) {
                onTime++;
              }
            }
          });
        });
        
        const percentage = total > 0 ? Math.round((onTime / total) * 100) : 0;
        
        return { squad, percentage, total };
      }).filter(s => s.total > 0);
      
      if (squadPunctuality.length === 0) {
        return "I don't have enough punctuality data to answer this question.";
      }
      
      squadPunctuality.sort((a, b) => isWorst ? a.percentage - b.percentage : b.percentage - a.percentage);
      
      const topSquad = squadPunctuality[0];
      const comparison = squadPunctuality.slice(0, 3);
      
      let response = `The **${isWorst ? 'worst' : 'best'}** squad for punctuality is **${topSquad.squad.name}** with **${topSquad.percentage}%** on-time arrivals.\n\n`;
      response += `**Top ${Math.min(3, comparison.length)} squads:**\n`;
      comparison.forEach((item, idx) => {
        response += `${idx + 1}. ${item.squad.name}: ${item.percentage}% on time\n`;
      });
      
      return response;
    }

    // Question Type 3: Coach correlation with attendance
    if (q.includes('coach') && (q.includes('attendance') || q.includes('correlation') || q.includes('affect'))) {
      return "To analyze coach correlation with attendance rates, I would need access to coach assignment data for each session. This feature requires the coach field to be populated in your session data.";
    }

    // Question Type 4: Overall attendance for a squad
    if ((q.includes('attendance') || q.includes('attend')) && !q.includes('session')) {
      const squad = findSquad(q);
      
      if (squad) {
        const squadSessions = sessions.filter(s => s.squadId === squad.id && s.attendance);
        
        let totalAttended = 0;
        let totalPossible = 0;
        
        squadSessions.forEach(session => {
          const attended = session.attendance?.filter(a => 
            a.status === 'Present' || a.status === '1st half only' || a.status === '2nd half only'
          ).length || 0;
          totalAttended += attended;
          totalPossible += session.attendance?.length || 0;
        });
        
        const percentage = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;
        
        return `The **${squad.name}** squad has an overall attendance rate of **${percentage}%** across ${squadSessions.length} sessions (${totalAttended} attended out of ${totalPossible} possible attendances).`;
      }
      
      return `I couldn't identify which squad you're asking about. Available squads are: ${squads.map(s => s.name).join(', ')}.`;
    }

    // Default response
    return `I'm not sure how to answer that question. I can help you with:\n\n• Attendance percentages for specific sessions (e.g., "What % of swimmers in CD attended the session on 20th Jan?")\n• Squad punctuality comparisons (e.g., "What squad is worst for being punctual?")\n• Overall attendance rates by squad\n\nPlease try rephrasing your question!`;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setIsProcessing(true);
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Process and add assistant response
    setTimeout(() => {
      const response = processQuestion(userMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsProcessing(false);
    }, 500);
  };

  const PIE_COLORS = ['#4B9A4A', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Attendance Analysis</h1>
        <p className="text-sm text-muted-foreground">Interactive charts and insights for your swimming club</p>
      </div>

      {/* Chart 1: Average Attendance by Squad */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" style={{ color: '#4B9A4A' }} />
                Average Attendance by Squad
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Compare attendance rates across different squads</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Squad:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 justify-start text-left font-normal">
                      {chart1SelectedSquads.length === 0 ? (
                        <span className="text-muted-foreground">Select squads...</span>
                      ) : chart1SelectedSquads.length === 1 ? (
                        squads.find(s => s.id === chart1SelectedSquads[0])?.name
                      ) : (
                        `${chart1SelectedSquads.length} squads selected`
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-2">Select Squads</p>
                      {squads.map(squad => (
                        <div key={squad.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`chart1-squad-${squad.id}`}
                            checked={chart1SelectedSquads.includes(squad.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setChart1SelectedSquads([...chart1SelectedSquads, squad.id]);
                              } else {
                                setChart1SelectedSquads(chart1SelectedSquads.filter(id => id !== squad.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`chart1-squad-${squad.id}`}
                            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {squad.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Period:</span>
                <Select value={chart1TimePeriod} onValueChange={(v) => setChart1TimePeriod(v as TimePeriod)}>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={attendanceBySquadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value: any) => `${value}%`}
                labelFormatter={(label) => `Squad: ${label}`}
              />
              <Bar dataKey="percentage" fill="#4B9A4A" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Attendance for Squad on Specific Day */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" style={{ color: '#4B9A4A' }} />
                Attendance Breakdown by Day
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Analyse attendance patterns for specific days and squads</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">Squad:</span>
                <Select value={chart2SelectedSquad} onValueChange={setChart2SelectedSquad}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Squads</SelectItem>
                    {squads.map(squad => (
                      <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">Day:</span>
                <Select value={chart2DayOfWeek} onValueChange={(v) => setChart2DayOfWeek(v as DayOfWeek)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dayLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">Period:</span>
                <Select value={chart2TimePeriod} onValueChange={(v) => setChart2TimePeriod(v as TimePeriod)}>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={attendanceByDayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.percentage}%`}
                outerRadius={120}
                dataKey="value"
              >
                <Cell fill="#4B9A4A" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip formatter={(value: any, name: string) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 3: Punctuality Analysis */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" style={{ color: '#4B9A4A' }} />
                Punctuality Breakdown {chart3DrillDownSquadId ? `- ${squads.find(s => s.id === chart3DrillDownSquadId)?.name}` : 'by Squad'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {chart3DrillDownSquadId 
                  ? 'Individual swimmer punctuality within the squad' 
                  : 'Track on-time arrivals, late, and very late percentages'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {chart3DrillDownSquadId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToSquads}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Squads
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Squad:</span>
                  <Select value={chart3SelectedSquad} onValueChange={setChart3SelectedSquad}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Squads</SelectItem>
                      {squads.map(squad => (
                        <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Period:</span>
                <Select value={chart3TimePeriod} onValueChange={(v) => setChart3TimePeriod(v as TimePeriod)}>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={punctualityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                label={{ value: 'Percentage %', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Legend />
              <Bar 
                dataKey="On Time" 
                stackId="a" 
                fill="#4B9A4A" 
                cursor={!chart3DrillDownSquadId ? "pointer" : "default"} 
                onClick={!chart3DrillDownSquadId ? handlePunctualityBarClick : undefined}
              />
              <Bar 
                dataKey="Late" 
                stackId="a" 
                fill="#FCD34D" 
                cursor={!chart3DrillDownSquadId ? "pointer" : "default"} 
                onClick={!chart3DrillDownSquadId ? handlePunctualityBarClick : undefined}
              />
              <Bar 
                dataKey="Very Late" 
                stackId="a" 
                fill="#EF4444" 
                cursor={!chart3DrillDownSquadId ? "pointer" : "default"} 
                onClick={!chart3DrillDownSquadId ? handlePunctualityBarClick : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
          {!chart3DrillDownSquadId && chart3SelectedSquad !== 'all' && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Click on a bar to view individual swimmers in this squad
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chart 4: Attendance Trends Over Time */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: '#4B9A4A' }} />
                Attendance Trends Over Time
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Track attendance trends for selected squads over multiple months</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Squad Multi-Select */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap">Squads:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 justify-start text-left font-normal">
                      {chart4SelectedSquads.length === 0 ? (
                        <span className="text-muted-foreground">Select squads...</span>
                      ) : chart4SelectedSquads.length === 1 ? (
                        squads.find(s => s.id === chart4SelectedSquads[0])?.name
                      ) : (
                        `${chart4SelectedSquads.length} squads selected`
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-2">Select Squads</p>
                      {squads.map(squad => (
                        <div key={squad.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`chart4-squad-${squad.id}`}
                            checked={chart4SelectedSquads.includes(squad.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setChart4SelectedSquads([...chart4SelectedSquads, squad.id]);
                              } else {
                                setChart4SelectedSquads(chart4SelectedSquads.filter(id => id !== squad.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`chart4-squad-${squad.id}`}
                            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {squad.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Time Period Slider */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium whitespace-nowrap">Time Period:</span>
                <div className="flex items-center gap-3 w-48">
                  <Slider
                    value={[chart4MonthsBack]}
                    onValueChange={(v) => setChart4MonthsBack(v[0])}
                    min={3}
                    max={12}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">{chart4MonthsBack} months</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chart4SelectedSquads.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <p className="text-sm">Please select at least one squad to view trends</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={attendanceTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Attendance %', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
                {chart4SelectedSquads.map((squadId, index) => {
                  const squad = squads.find(s => s.id === squadId);
                  if (!squad) return null;
                  
                  // Generate different colors for each squad
                  const colors = ['#4B9A4A', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'];
                  const color = colors[index % colors.length];
                  
                  return (
                    <Bar 
                      key={squadId}
                      dataKey={squad.name}
                      fill={color}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" style={{ color: '#4B9A4A' }} />
            AI Analysis Assistant
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask questions about attendance, punctuality, squads, and more
          </p>
        </CardHeader>
        <CardContent>
          {/* Chat Messages */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">No messages yet. Try asking:</p>
                <div className="text-xs space-y-1">
                  <p>• "What % of swimmers in CD attended the session on 20th Jan?"</p>
                  <p>• "What squad is worst for being punctual?"</p>
                  <p>• "What's the attendance rate for Performance squad?"</p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-[#4B9A4A] text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your data..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isProcessing}
              style={{ backgroundColor: '#4B9A4A', color: 'white' }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}