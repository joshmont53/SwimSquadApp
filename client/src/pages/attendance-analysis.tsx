import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  MessageSquare,
  ArrowLeftCircle,
  Send,
  TrendingUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  getDay,
  format,
} from 'date-fns';
import type { Session, Squad, Swimmer } from '@/lib/typeAdapters';
import type { Attendance } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

type TimePeriod = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'all_time';
type DayOfWeek = 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const periodLabels: Record<TimePeriod, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  year_to_date: 'Year to Date',
  all_time: 'All Time',
};

const dayLabels: Record<DayOfWeek, string> = {
  all: 'All Days',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const TIME_PERIOD_OPTIONS: TimePeriod[] = [
  'this_week', 'this_month', 'last_month', 'last_3_months', 'year_to_date', 'all_time',
];

const DAY_OPTIONS: DayOfWeek[] = [
  'all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
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

const dayIndexMap: Record<Exclude<DayOfWeek, 'all'>, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const isPresent = (status: string | null | undefined) =>
  status === 'Present' || status === 'First Half Only' || status === 'Second Half Only';

// Squad average attendance: per-swimmer average, then average of those
function calcSquadAvg(
  sessions: Session[],
  attendance: Attendance[],
  squadId: string,
  dateRange: { start: Date; end: Date }
): number {
  const now = new Date();
  const squadSessions = sessions.filter(
    s =>
      s.squadId === squadId &&
      isWithinInterval(new Date(s.date), dateRange) &&
      new Date(s.date) <= now
  );

  if (squadSessions.length === 0) return 0;

  const sessionIds = new Set(squadSessions.map(s => s.id));
  const squadAttendance = attendance.filter(a => sessionIds.has(a.sessionId));

  // unique swimmer IDs in this squad's attendance records
  const swimmerIds = Array.from(new Set(squadAttendance.map(a => a.swimmerId)));

  const swimmerAvgs = swimmerIds
    .map(swId => {
      const records = squadAttendance.filter(a => a.swimmerId === swId);
      if (records.length === 0) return null;
      const attended = records.filter(a => isPresent(a.status)).length;
      return (attended / records.length) * 100;
    })
    .filter((v): v is number => v !== null);

  if (swimmerAvgs.length === 0) return 0;
  return Math.round(swimmerAvgs.reduce((a, b) => a + b, 0) / swimmerAvgs.length);
}

// Multi-squad select popover
function SquadMultiSelect({
  squads,
  selected,
  onChange,
}: {
  squads: Squad[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = selected.length === squads.length;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-36 justify-between gap-2" data-testid="button-squad-multiselect">
          <span className="truncate text-sm">
            {allSelected ? 'All Squads' : selected.length === 0 ? 'No Squads' : `${selected.length} Squad${selected.length > 1 ? 's' : ''}`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-1">
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover-elevate cursor-pointer text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={checked => onChange(checked ? squads.map(s => s.id) : [])}
              data-testid="checkbox-all-squads"
            />
            All Squads
          </label>
          <div className="h-px bg-border my-1" />
          {squads.map(sq => (
            <label key={sq.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover-elevate cursor-pointer text-sm">
              <Checkbox
                checked={selected.includes(sq.id)}
                onCheckedChange={() => toggle(sq.id)}
                data-testid={`checkbox-squad-${sq.id}`}
              />
              {sq.name}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AttendanceAnalysisProps {
  sessions: Session[];
  squads: Squad[];
  swimmers: Swimmer[];
  attendance: Attendance[];
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PIE_COLORS = {
  Present: 'var(--club-primary)',
  Absent: '#ef4444',
};

const PUNCTUALITY_COLORS = {
  'On Time': '#22c55e',
  Late: '#f59e0b',
  'Very Late': '#ef4444',
};

export function AttendanceAnalysis({ sessions, squads, swimmers, attendance, onBack }: AttendanceAnalysisProps) {
  // ── Chart 1 filters ───────────────────────────────────────────────────────
  const [c1Period, setC1Period] = useState<TimePeriod>('all_time');
  const [c1Squads, setC1Squads] = useState<string[]>(squads.map(s => s.id));

  // ── Chart 2 filters ───────────────────────────────────────────────────────
  const [c2Period, setC2Period] = useState<TimePeriod>('all_time');
  const [c2Squad, setC2Squad] = useState<string>('all');
  const [c2Day, setC2Day] = useState<DayOfWeek>('all');

  // ── Chart 3 filters ───────────────────────────────────────────────────────
  const [c3Period, setC3Period] = useState<TimePeriod>('all_time');
  const [c3Squads, setC3Squads] = useState<string[]>(squads.map(s => s.id));
  const [drillDownSquadId, setDrillDownSquadId] = useState<string | null>(null);

  // ── Chart 4 filters ───────────────────────────────────────────────────────
  const [c4Months, setC4Months] = useState<number>(6);
  const [c4Squads, setC4Squads] = useState<string[]>(squads.slice(0, Math.min(3, squads.length)).map(s => s.id));

  // ── AI Chat ───────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Chart 1: Average Attendance by Squad ──────────────────────────────────
  const chart1Data = useMemo(() => {
    const range = getDateRange(c1Period);
    return c1Squads
      .map(squadId => {
        const squad = squads.find(s => s.id === squadId);
        return {
          name: squad?.name || 'Unknown',
          percentage: calcSquadAvg(sessions, attendance, squadId, range),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, attendance, squads, c1Period, c1Squads]);

  // ── Chart 2: Attendance breakdown by day (pie) ────────────────────────────
  const chart2Data = useMemo(() => {
    const range = getDateRange(c2Period);
    const now = new Date();

    const squadIds = c2Squad === 'all' ? squads.map(s => s.id) : [c2Squad];

    const filteredSessions = sessions.filter(s => {
      if (!squadIds.includes(s.squadId)) return false;
      const d = new Date(s.date);
      if (!isWithinInterval(d, range) || d > now) return false;
      if (c2Day !== 'all' && getDay(d) !== dayIndexMap[c2Day]) return false;
      return true;
    });

    let presentCount = 0;
    let absentCount = 0;

    const sessionIds = new Set(filteredSessions.map(s => s.id));
    attendance
      .filter(a => sessionIds.has(a.sessionId))
      .forEach(a => {
        if (isPresent(a.status)) presentCount++;
        else absentCount++;
      });

    const total = presentCount + absentCount;
    return [
      {
        name: 'Present',
        value: presentCount,
        percentage: total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0',
      },
      {
        name: 'Absent',
        value: absentCount,
        percentage: total > 0 ? ((absentCount / total) * 100).toFixed(1) : '0',
      },
    ];
  }, [sessions, attendance, squads, c2Period, c2Squad, c2Day]);

  // ── Chart 3: Punctuality breakdown (stacked bar) ──────────────────────────
  const chart3Data = useMemo(() => {
    const range = getDateRange(c3Period);
    const now = new Date();

    if (drillDownSquadId) {
      // Swimmer drill-down
      const squadSwimmers = swimmers.filter(sw => sw.squadId === drillDownSquadId);
      const squadSessions = sessions.filter(s =>
        s.squadId === drillDownSquadId &&
        isWithinInterval(new Date(s.date), range) &&
        new Date(s.date) <= now
      );
      const sessionIds = new Set(squadSessions.map(s => s.id));

      return squadSwimmers.map(sw => {
        const recs = attendance.filter(a => a.swimmerId === sw.id && sessionIds.has(a.sessionId) && isPresent(a.status));
        const total = recs.length;
        const late = recs.filter(a => a.notes?.toLowerCase() === 'late').length;
        const veryLate = recs.filter(a => a.notes?.toLowerCase() === 'very late').length;
        const onTime = total - late - veryLate;

        const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;
        const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
        const veryLatePct = total > 0 ? 100 - onTimePct - latePct : 0;

        return {
          name: `${sw.firstName} ${sw.lastName}`,
          'On Time': onTimePct,
          Late: latePct,
          'Very Late': veryLatePct,
          total,
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    }

    // Squad level
    return c3Squads.map(squadId => {
      const squad = squads.find(s => s.id === squadId);
      const squadSessions = sessions.filter(s =>
        s.squadId === squadId &&
        isWithinInterval(new Date(s.date), range) &&
        new Date(s.date) <= now
      );
      const sessionIds = new Set(squadSessions.map(s => s.id));

      const recs = attendance.filter(a => sessionIds.has(a.sessionId) && isPresent(a.status));
      const total = recs.length;
      const late = recs.filter(a => a.notes?.toLowerCase() === 'late').length;
      const veryLate = recs.filter(a => a.notes?.toLowerCase() === 'very late').length;
      const onTime = total - late - veryLate;

      const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;
      const latePct = total > 0 ? Math.round((late / total) * 100) : 0;
      const veryLatePct = total > 0 ? 100 - onTimePct - latePct : 0;

      return {
        name: squad?.name || 'Unknown',
        squadId,
        'On Time': onTimePct,
        Late: latePct,
        'Very Late': veryLatePct,
        total,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, attendance, squads, swimmers, c3Period, c3Squads, drillDownSquadId]);

  // ── Chart 4: Attendance trends (clustered bar) ────────────────────────────
  const chart4Data = useMemo(() => {
    const now = new Date();
    const months: Date[] = [];
    for (let i = c4Months - 1; i >= 0; i--) {
      months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }

    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const dataPoint: Record<string, any> = { month: format(monthDate, 'MMM yy') };

      c4Squads.forEach(squadId => {
        const squad = squads.find(s => s.id === squadId);
        if (!squad) return;
        const avg = calcSquadAvg(sessions, attendance, squadId, { start: monthStart, end: monthEnd });
        dataPoint[squad.name] = avg || null;
      });

      return dataPoint;
    });
  }, [sessions, attendance, squads, c4Months, c4Squads]);

  // Squad colours for chart 4 clusters
  const squadColors = useMemo(() => {
    const palette = [
      'var(--club-primary)',
      '#3b82f6',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
    ];
    return Object.fromEntries(squads.map((sq, i) => [sq.name, palette[i % palette.length]]));
  }, [squads]);

  // ── AI Chat handlers ──────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: msg };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await apiRequest('POST', '/api/attendance/ai-chat', {
        message: msg,
        history: chatMessages.map(m => ({ role: m.role, content: m.content })),
      });
      const data = await res.json();
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply || 'No response received.' }]);
    } catch (err) {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Pie chart custom label
  const renderPieLabel = ({ name, percentage }: any) => `${name}: ${percentage}%`;

  // Punctuality bar tooltip
  const PunctualityTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-md p-3 shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.dataKey}: {p.value}%
          </p>
        ))}
      </div>
    );
  };

  const Chart1Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-md p-3 shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <p style={{ color: 'var(--club-primary)' }}>Avg Attendance: {payload[0]?.value}%</p>
      </div>
    );
  };

  const Chart4Tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-md p-3 shadow-md text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          p.value !== null && (
            <p key={p.dataKey} style={{ color: p.fill }}>
              {p.dataKey}: {p.value}%
            </p>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
          data-testid="button-back-attendance"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate font-semibold" data-testid="text-attendance-title">
            Attendance Analysis
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">

        {/* ── Chart 1: Average Attendance by Squad ───────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
                Average Attendance by Squad
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <SquadMultiSelect squads={squads} selected={c1Squads} onChange={setC1Squads} />
                <Select value={c1Period} onValueChange={v => setC1Period(v as TimePeriod)}>
                  <SelectTrigger className="w-36" data-testid="select-c1-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{periodLabels[opt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average attendance per swimmer, then averaged across the squad.
            </p>
          </CardHeader>
          <CardContent>
            {chart1Data.length === 0 || chart1Data.every(d => d.percentage === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data for the selected filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chart1Data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip content={<Chart1Tooltip />} />
                  <Bar dataKey="percentage" name="Avg Attendance" fill="var(--club-primary)" radius={[4, 4, 0, 0]}>
                    {chart1Data.map((entry, index) => (
                      <Cell key={`c1-${index}`} fill="var(--club-primary)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Chart 2: Attendance breakdown by day (pie) ─────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
                Attendance Breakdown by Day
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={c2Squad} onValueChange={setC2Squad}>
                  <SelectTrigger className="w-36" data-testid="select-c2-squad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Squads</SelectItem>
                    {squads.map(sq => (
                      <SelectItem key={sq.id} value={sq.id}>{sq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c2Day} onValueChange={v => setC2Day(v as DayOfWeek)}>
                  <SelectTrigger className="w-32" data-testid="select-c2-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{dayLabels[opt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c2Period} onValueChange={v => setC2Period(v as TimePeriod)}>
                  <SelectTrigger className="w-36" data-testid="select-c2-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIOD_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{periodLabels[opt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Present includes: Present, 1st Half Only, 2nd Half Only.
            </p>
          </CardHeader>
          <CardContent>
            {chart2Data[0].value === 0 && chart2Data[1].value === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data for the selected filters.</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chart2Data}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine
                    >
                      {chart2Data.map((entry, index) => (
                        <Cell
                          key={`c2-${index}`}
                          fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [`${value} records`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 min-w-36">
                  {chart2Data.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[d.name as keyof typeof PIE_COLORS] || '#6b7280' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.percentage}% ({d.value})</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Chart 3: Punctuality breakdown (stacked bar) ──────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {drillDownSquadId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrillDownSquadId(null)}
                    className="h-7 px-2"
                    data-testid="button-back-to-squads"
                  >
                    <ArrowLeftCircle className="h-4 w-4 mr-1" />
                    Squads
                  </Button>
                )}
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
                  {drillDownSquadId
                    ? `Punctuality — ${squads.find(s => s.id === drillDownSquadId)?.name}`
                    : 'Punctuality Breakdown by Squad'}
                </CardTitle>
              </div>
              {!drillDownSquadId && (
                <div className="flex flex-wrap gap-2">
                  <SquadMultiSelect squads={squads} selected={c3Squads} onChange={setC3Squads} />
                  <Select value={c3Period} onValueChange={v => setC3Period(v as TimePeriod)}>
                    <SelectTrigger className="w-36" data-testid="select-c3-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PERIOD_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{periodLabels[opt]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {!drillDownSquadId && (
              <p className="text-xs text-muted-foreground mt-1">
                Click a bar to drill through to individual swimmers.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {chart3Data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data for the selected filters.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chart3Data}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  onClick={(data) => {
                    if (!drillDownSquadId && data?.activePayload?.[0]?.payload?.squadId) {
                      setDrillDownSquadId(data.activePayload[0].payload.squadId);
                    }
                  }}
                  style={{ cursor: drillDownSquadId ? 'default' : 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip content={<PunctualityTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="On Time" stackId="a" fill={PUNCTUALITY_COLORS['On Time']} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Late" stackId="a" fill={PUNCTUALITY_COLORS['Late']} />
                  <Bar dataKey="Very Late" stackId="a" fill={PUNCTUALITY_COLORS['Very Late']} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Chart 4: Attendance trends (clustered bar) ────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
                Attendance Trends Over Time
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <SquadMultiSelect squads={squads} selected={c4Squads} onChange={setC4Squads} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground shrink-0">3 months</span>
              <Slider
                value={[c4Months]}
                min={3}
                max={12}
                step={1}
                onValueChange={([v]) => setC4Months(v)}
                className="flex-1"
                data-testid="slider-months"
              />
              <span className="text-xs text-muted-foreground shrink-0">12 months</span>
              <Badge variant="secondary" className="shrink-0 text-xs">{c4Months} months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {c4Squads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Select at least one squad.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chart4Data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip content={<Chart4Tooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {c4Squads.map(squadId => {
                    const squad = squads.find(s => s.id === squadId);
                    if (!squad) return null;
                    return (
                      <Bar
                        key={squadId}
                        dataKey={squad.name}
                        fill={squadColors[squad.name]}
                        radius={[3, 3, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── AI Chat ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
              What would you like to know?
            </CardTitle>
            <div className="flex items-start gap-2 mt-1 p-3 bg-muted/40 rounded-md border">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Ask me about your club's attendance statistics — I can return figures, tables and text summaries.
                I'm unable to generate charts, but I can give you the exact numbers behind them.
                All responses are based solely on your club's data.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {/* Message history */}
            <div
              className="min-h-48 max-h-96 overflow-y-auto space-y-3 mb-4 p-3 rounded-md border bg-muted/20"
              data-testid="div-chat-history"
            >
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No messages yet. Ask a question below to get started.
                </p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'text-white'
                          : 'bg-card border text-foreground'
                      }`}
                      style={msg.role === 'user' ? { backgroundColor: 'var(--club-primary)' } : undefined}
                      data-testid={`message-${msg.role}-${i}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. What is the attendance rate for the Elite squad this month?"
                disabled={isChatLoading}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                size="icon"
                style={{ backgroundColor: 'var(--club-primary)' }}
                className="text-white shrink-0"
                data-testid="button-send-chat"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
