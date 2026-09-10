import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Clock,
  PenLine,
  Trophy,
  FileText,
  Banknote,
  Copy,
  Plus,
  X,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Coach as BackendCoach, SwimmingSession, CompetitionCoaching, Squad, Competition, Location, FloatSession } from '@shared/schema';

interface InvoiceData {
  coachId: string;
  coachName: string;
  qualificationLevel: string;
  year: number;
  month: number;
  rates: {
    hourlyRate: number;
    sessionWritingRate: number;
  };
  coaching: {
    totalHours: number;
    breakdown: {
      sessionHours: number;
      competitionHours: number;
    };
    sessions: Array<{
      sessionId: string;
      sessionDate: string;
      squadId: string;
      squadName: string;
      startTime: string;
      endTime: string;
      duration: number;
      role: 'lead' | 'second' | 'helper';
    }>;
    competitions: Array<{
      coachingId: string;
      competitionId: string;
      competitionName: string;
      locationName: string;
      coachingDate: string;
      duration: number;
    }>;
    earnings: number;
  };
  floatSessions: {
    sessions: Array<{
      floatId: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      locationName: string;
      duration: number;
    }>;
    totalHours: number;
    earnings: number;
  };
  sessionWriting: {
    count: number;
    sessions: Array<{
      sessionId: string;
      sessionDate: string;
      squadId: string;
      squadName: string;
      isDuplicated?: boolean;
    }>;
    earnings: number;
  };
  totals: {
    totalEarnings: number;
    totalHours: number;
    totalSessionsWritten: number;
  };
}

interface MonthOption {
  year: number;
  month: number;
  label: string;
  value: string;
}

interface InvoiceTrackerProps {
  onBack: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const INVOICE_MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'
];
const ADMIN_HOURS_STORAGE_PREFIX = 'invoice-admin-hours:';

function adminHoursStorageKey(coachId: string, month: string) {
  return `${ADMIN_HOURS_STORAGE_PREFIX}${coachId}:${month}`;
}

function invoiceInitials(coachName: string) {
  const names = coachName.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return 'INV';
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
}

function formatHours(hours: number) {
  return hours.toFixed(2).replace(/\.?0+$/, '');
}

export function InvoiceTracker({ onBack }: InvoiceTrackerProps) {
  const { user } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [coachingExpanded, setCoachingExpanded] = useState(false);
  const [writingExpanded, setWritingExpanded] = useState(false);
  const [competitionExpanded, setCompetitionExpanded] = useState(false);
  const [adminHoursInput, setAdminHoursInput] = useState('');
  const [adminHoursVisible, setAdminHoursVisible] = useState(false);
  const [storedAdminMonths, setStoredAdminMonths] = useState<string[]>([]);

  // Fetch current user's coach profile
  const { data: coaches = [] } = useQuery<BackendCoach[]>({ 
    queryKey: ['/api/coaches'],
  });

  const currentCoach = useMemo(() => {
    return coaches.find(c => c.userId === user?.id);
  }, [coaches, user?.id]);

  useEffect(() => {
    if (!currentCoach) {
      setStoredAdminMonths([]);
      return;
    }

    const prefix = `${ADMIN_HOURS_STORAGE_PREFIX}${currentCoach.id}:`;
    const months: string[] = [];
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const value = Number(window.localStorage.getItem(key));
      if (Number.isFinite(value) && value > 0) months.push(key.slice(prefix.length));
    }
    setStoredAdminMonths(months);
  }, [currentCoach]);

  // Fetch all sessions to determine available months
  const { data: allSessions = [] } = useQuery<SwimmingSession[]>({ 
    queryKey: ['/api/sessions'],
    enabled: !!currentCoach,
  });

  // Fetch all competition coaching to determine available months
  const { data: allCompetitionCoaching = [] } = useQuery<CompetitionCoaching[]>({ 
    queryKey: ['/api/competitions/coaching/all'],
    enabled: !!currentCoach,
  });

  // Fetch float sessions to determine available months
  const { data: allMyFloatSessions = [] } = useQuery<FloatSession[]>({
    queryKey: ['/api/float-sessions/mine'],
    enabled: !!currentCoach,
  });

  // Calculate available months based on coaching activity
  const availableMonths = useMemo<MonthOption[]>(() => {
    if (!currentCoach) return [];

    const monthSet = new Set<string>();

    // Add months from coaching sessions (use UTC to match backend date filtering)
    allSessions.forEach(session => {
      if (
        session.leadCoachId === currentCoach.id ||
        session.secondCoachId === currentCoach.id ||
        session.helperId === currentCoach.id ||
        session.setWriterId === currentCoach.id
      ) {
        // Parse ISO date string and extract year-month (YYYY-MM format matches backend)
        const dateStr = session.sessionDate; // Already in YYYY-MM-DD format
        const key = dateStr.substring(0, 7); // Extract YYYY-MM
        monthSet.add(key);
      }
    });

    // Add months from competition coaching (use UTC to match backend date filtering)
    allCompetitionCoaching.forEach(coaching => {
      if (coaching.coachId === currentCoach.id) {
        // Parse ISO date string and extract year-month (YYYY-MM format matches backend)
        const dateStr = coaching.coachingDate; // Already in YYYY-MM-DD format
        const key = dateStr.substring(0, 7); // Extract YYYY-MM
        monthSet.add(key);
      }
    });

    // Add months from float sessions
    allMyFloatSessions.forEach(fs => {
      const key = fs.sessionDate.substring(0, 7);
      monthSet.add(key);
    });

    storedAdminMonths.forEach(month => monthSet.add(month));

    // Convert to sorted array of month options
    const months = Array.from(monthSet)
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          value: key,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return months;
  }, [currentCoach, allSessions, allCompetitionCoaching, allMyFloatSessions, storedAdminMonths]);

  // Auto-select most recent month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);

  // Parse selected month
  const { selectedYear, selectedMonthNum } = useMemo(() => {
    if (!selectedMonth) return { selectedYear: 0, selectedMonthNum: 0 };
    const [year, month] = selectedMonth.split('-').map(Number);
    return { selectedYear: year, selectedMonthNum: month };
  }, [selectedMonth]);

  // Fetch invoice data for selected month
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery<InvoiceData>({
    queryKey: [`/api/invoices/${currentCoach?.id}/${selectedYear}/${selectedMonthNum}`],
    enabled: !!currentCoach && !!selectedMonth && selectedYear > 0 && selectedMonthNum > 0,
  });

  useEffect(() => {
    if (!currentCoach || !selectedMonth) {
      setAdminHoursInput('');
      setAdminHoursVisible(false);
      return;
    }

    const saved = window.localStorage.getItem(adminHoursStorageKey(currentCoach.id, selectedMonth));
    const savedHours = saved === null ? 0 : Number(saved);
    if (Number.isFinite(savedHours) && savedHours > 0) {
      setAdminHoursInput(String(savedHours));
      setAdminHoursVisible(true);
    } else {
      setAdminHoursInput('');
      setAdminHoursVisible(false);
    }
  }, [currentCoach, selectedMonth]);

  const adminHours = useMemo(() => {
    const value = Number(adminHoursInput);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [adminHoursInput]);

  const adminEarnings = adminHours * (invoiceData?.rates.hourlyRate || 0);
  const totalEarningsWithAdmin = (invoiceData?.totals.totalEarnings || 0) + adminEarnings;

  const updateAdminHours = (value: string) => {
    if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return;
    setAdminHoursInput(value);
    if (!currentCoach || !selectedMonth) return;

    const numericValue = Number(value);
    const key = adminHoursStorageKey(currentCoach.id, selectedMonth);
    if (value !== '' && Number.isFinite(numericValue) && numericValue > 0) {
      window.localStorage.setItem(key, String(numericValue));
      setStoredAdminMonths(months => Array.from(new Set([...months, selectedMonth])));
    } else {
      window.localStorage.removeItem(key);
      setStoredAdminMonths(months => months.filter(month => month !== selectedMonth));
    }
  };

  const removeAdminHours = () => {
    if (currentCoach && selectedMonth) {
      window.localStorage.removeItem(adminHoursStorageKey(currentCoach.id, selectedMonth));
      setStoredAdminMonths(months => months.filter(month => month !== selectedMonth));
    }
    setAdminHoursInput('');
    setAdminHoursVisible(false);
  };

  const sortedCoachingSessions = useMemo(
    () => [...(invoiceData?.coaching.sessions || [])].sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime)
    ),
    [invoiceData],
  );
  const sortedFloatSessions = useMemo(
    () => [...(invoiceData?.floatSessions.sessions || [])].sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime)
    ),
    [invoiceData],
  );
  const sortedWritingSessions = useMemo(
    () => [...(invoiceData?.sessionWriting.sessions || [])].sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate)
    ),
    [invoiceData],
  );
  const sortedCompetitions = useMemo(
    () => [...(invoiceData?.coaching.competitions || [])].sort((a, b) =>
      a.coachingDate.localeCompare(b.coachingDate)
    ),
    [invoiceData],
  );
  const combinedCoachingActivity = useMemo(() => [
    ...sortedCoachingSessions.map(session => ({
      kind: 'session' as const,
      id: session.sessionId,
      date: session.sessionDate,
      startTime: session.startTime,
      session,
    })),
    ...sortedFloatSessions.map(floatSession => ({
      kind: 'float' as const,
      id: floatSession.floatId,
      date: floatSession.sessionDate,
      startTime: floatSession.startTime,
      floatSession,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)), [
    sortedCoachingSessions,
    sortedFloatSessions,
  ]);

  const handleExport = () => {
    if (!invoiceData) return;
    const invoiceNumber = `${invoiceInitials(invoiceData.coachName)}-${INVOICE_MONTH_NAMES[invoiceData.month - 1]}-${String(invoiceData.year).slice(-2)}`;
    
    const csvRows = [
      ['Hart Swimming Club - Coaching Invoice'],
      [`Coach: ${invoiceData.coachName}`],
      [`Period: ${MONTH_NAMES[invoiceData.month - 1]} ${invoiceData.year}`],
      [`Qualification: ${invoiceData.qualificationLevel}`],
      [`Hourly Rate: £${invoiceData.rates.hourlyRate.toFixed(2)}`],
      [`Invoice #: ${invoiceNumber}`],
      [],
      ['COACHING SESSIONS'],
      ['Date', 'Squad', 'Time', 'Hours', 'Amount'],
    ];

    sortedCoachingSessions.forEach(session => {
      const sessionDate = new Date(session.sessionDate);
      csvRows.push([
        format(sessionDate, 'EEE dd MMM'),
        session.squadName,
        `${session.startTime} - ${session.endTime}`,
        session.duration.toFixed(1),
        `£${(session.duration * invoiceData.rates.hourlyRate).toFixed(2)}`,
      ]);
    });

    csvRows.push([
      'Subtotal',
      '',
      '',
      invoiceData.coaching.breakdown.sessionHours.toFixed(1),
      `£${(invoiceData.coaching.breakdown.sessionHours * invoiceData.rates.hourlyRate).toFixed(2)}`,
    ]);

    csvRows.push([]);
    csvRows.push(['SESSIONS WRITTEN']);
    csvRows.push(['Date', 'Squad', 'Amount']);

    sortedWritingSessions.forEach(session => {
      const sessionDate = new Date(session.sessionDate);
      csvRows.push([
        format(sessionDate, 'EEE dd MMM'),
        session.squadName + (session.isDuplicated ? ' (Duplicate)' : ''),
        session.isDuplicated ? '£0.00' : `£${invoiceData.rates.sessionWritingRate.toFixed(2)}`,
      ]);
    });

    csvRows.push([
      `Subtotal (${invoiceData.sessionWriting.count} sessions)`,
      '',
      `£${invoiceData.sessionWriting.earnings.toFixed(2)}`,
    ]);

    if (invoiceData.floatSessions.sessions.length > 0) {
      csvRows.push([]);
      csvRows.push(['FLOAT SESSIONS']);
      csvRows.push(['Date', 'Location', 'Time', 'Hours', 'Amount']);
      sortedFloatSessions.forEach(fs => {
        const fsDate = new Date(fs.sessionDate);
        csvRows.push([
          format(fsDate, 'EEE dd MMM'),
          fs.locationName,
          `${fs.startTime} - ${fs.endTime}`,
          fs.duration.toFixed(1),
          `£${(fs.duration * invoiceData.rates.hourlyRate).toFixed(2)}`,
        ]);
      });
      csvRows.push([
        'Subtotal',
        '',
        '',
        invoiceData.floatSessions.totalHours.toFixed(1),
        `£${invoiceData.floatSessions.earnings.toFixed(2)}`,
      ]);
    }

    csvRows.push([]);
    csvRows.push(['COMPETITION HOURS']);
    csvRows.push(['Date', 'Competition', 'Location', 'Hours', 'Amount']);

    sortedCompetitions.forEach(comp => {
      const compDate = new Date(comp.coachingDate);
      csvRows.push([
        format(compDate, 'EEE dd MMM'),
        comp.competitionName,
        comp.locationName,
        comp.duration.toFixed(1),
        `£${(comp.duration * invoiceData.rates.hourlyRate).toFixed(2)}`,
      ]);
    });

    csvRows.push([
      'Subtotal',
      '',
      '',
      invoiceData.coaching.breakdown.competitionHours.toFixed(1),
      `£${(invoiceData.coaching.breakdown.competitionHours * invoiceData.rates.hourlyRate).toFixed(2)}`,
    ]);

    if (adminHours > 0) {
      csvRows.push([]);
      csvRows.push(['ADMIN HOURS']);
      csvRows.push(['Total Hours', 'Amount']);
      csvRows.push([
        formatHours(adminHours),
        `£${adminEarnings.toFixed(2)}`,
      ]);
    }

    csvRows.push([]);
    csvRows.push([
      'TOTAL PAYMENT',
      '',
      '',
      '',
      `£${totalEarningsWithAdmin.toFixed(2)}`,
    ]);

    const escapeCsvCell = (cell: string) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };
    const csvContent = `\uFEFF${csvRows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.coachName.replace(/\s+/g, '-')}-${invoiceData.year}-${String(invoiceData.month).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!currentCoach) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No coach profile found for your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col print:p-8 overflow-hidden">
      {/* Header - Hidden when printing */}
      <div className="print:hidden flex-shrink-0">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-9 w-9 shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base truncate">Invoice Tracker</h1>
          </div>
          <Button 
            onClick={handleExport} 
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={!invoiceData}
            data-testid="button-export"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm whitespace-nowrap">Month:</label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger data-testid="select-month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      {invoiceData && (
        <div className="hidden print:block mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Hart Swimming Club</h1>
            <p className="text-lg text-muted-foreground">Coaching Invoice</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 border-b pb-4">
            <div>
              <p><strong>Coach:</strong> {invoiceData.coachName}</p>
              <p><strong>Qualification:</strong> {invoiceData.qualificationLevel}</p>
              <p><strong>Hourly Rate:</strong> £{invoiceData.rates.hourlyRate.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p><strong>Invoice Period:</strong></p>
              <p>{MONTH_NAMES[invoiceData.month - 1]} {invoiceData.year}</p>
              <p className="text-sm text-muted-foreground">Generated: {format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingInvoice && (
        <div className="p-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* No Data Message */}
      {!isLoadingInvoice && selectedMonth && !invoiceData && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No coaching activity found for {availableMonths.find(m => m.value === selectedMonth)?.label}
            </p>
          </div>
        </div>
      )}

      {/* Print Version - Only visible when printing */}
      {invoiceData && (
        <div className="hidden print:block space-y-6">
          {invoiceData.coaching.sessions.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Coaching Sessions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCoachingSessions.map((session) => {
                    const sessionDate = new Date(session.sessionDate);
                    return (
                      <TableRow key={session.sessionId}>
                        <TableCell>{format(sessionDate, 'EEE, dd MMM')}</TableCell>
                        <TableCell>{session.squadName}</TableCell>
                        <TableCell className="text-sm">{session.startTime} - {session.endTime}</TableCell>
                        <TableCell className="text-right">{session.duration.toFixed(1)}</TableCell>
                        <TableCell className="text-right">£{(session.duration * invoiceData.rates.hourlyRate).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium">Coaching Subtotal</TableCell>
                    <TableCell className="text-right font-medium">{invoiceData.coaching.breakdown.sessionHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right font-medium">£{(invoiceData.coaching.breakdown.sessionHours * invoiceData.rates.hourlyRate).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {invoiceData.sessionWriting.sessions.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Sessions Written</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Squad</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedWritingSessions.map((session) => {
                    const sessionDate = new Date(session.sessionDate);
                    return (
                      <TableRow key={session.sessionId} className={session.isDuplicated ? "text-muted-foreground" : ""}>
                        <TableCell>{format(sessionDate, 'EEE, dd MMM')}</TableCell>
                        <TableCell className="flex items-center gap-2 flex-wrap">
                          {session.squadName}
                          {session.isDuplicated && (
                            <Badge variant="outline" className="text-xs">
                              <Copy className="w-3 h-3 mr-1" />
                              Duplicate
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {session.isDuplicated ? (
                            <span className="text-muted-foreground">£0.00</span>
                          ) : (
                            `£${invoiceData.rates.sessionWritingRate.toFixed(2)}`
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="font-medium">
                      Writing Subtotal ({invoiceData.sessionWriting.count} sessions)
                    </TableCell>
                    <TableCell className="text-right font-medium">£{invoiceData.sessionWriting.earnings.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {invoiceData.floatSessions.sessions.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Float Sessions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFloatSessions.map((fs) => {
                    const fsDate = new Date(fs.sessionDate);
                    return (
                      <TableRow key={fs.floatId}>
                        <TableCell>{format(fsDate, 'EEE, dd MMM')}</TableCell>
                        <TableCell>{fs.locationName}</TableCell>
                        <TableCell className="text-sm">{fs.startTime} - {fs.endTime}</TableCell>
                        <TableCell className="text-right">{fs.duration.toFixed(1)}</TableCell>
                        <TableCell className="text-right">£{(fs.duration * invoiceData.rates.hourlyRate).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium">Float Subtotal</TableCell>
                    <TableCell className="text-right font-medium">{invoiceData.floatSessions.totalHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right font-medium">£{invoiceData.floatSessions.earnings.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {invoiceData.coaching.competitions.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Competition Hours</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Competition</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCompetitions.map((comp) => {
                    const compDate = new Date(comp.coachingDate);
                    return (
                      <TableRow key={comp.coachingId}>
                        <TableCell>{format(compDate, 'EEE, dd MMM')}</TableCell>
                        <TableCell>{comp.competitionName}</TableCell>
                        <TableCell className="text-sm">{comp.locationName}</TableCell>
                        <TableCell className="text-right">{comp.duration.toFixed(1)}</TableCell>
                        <TableCell className="text-right">£{(comp.duration * invoiceData.rates.hourlyRate).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium">Competition Subtotal</TableCell>
                    <TableCell className="text-right font-medium">{invoiceData.coaching.breakdown.competitionHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="text-right font-medium">£{(invoiceData.coaching.breakdown.competitionHours * invoiceData.rates.hourlyRate).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {adminHours > 0 && (
            <div>
              <h3 className="mb-3 font-semibold">Admin Hours</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Total Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{formatHours(adminHours)}</TableCell>
                    <TableCell className="text-right">£{adminEarnings.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium">Total Payment</p>
                <p className="text-sm text-muted-foreground">
                  {invoiceData.coaching.breakdown.sessionHours.toFixed(1)} session hrs + {invoiceData.coaching.breakdown.competitionHours.toFixed(1)} comp hrs
                  {invoiceData.floatSessions.totalHours > 0 ? ` + ${invoiceData.floatSessions.totalHours.toFixed(1)} float hrs` : ''} + {invoiceData.sessionWriting.count} written
                   {adminHours > 0 ? ` + ${formatHours(adminHours)} admin hrs` : ''}
                </p>
              </div>
               <p className="text-3xl font-medium text-primary">£{totalEarningsWithAdmin.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - Mobile View */}
      {invoiceData && (
        <div className="p-4 space-y-3 print:hidden overflow-y-auto overflow-x-hidden flex-1 pb-6 scroll-container">
          {/* Coaching Hours Card - Expandable (includes float sessions) */}
          <Collapsible open={coachingExpanded} onOpenChange={setCoachingExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left hover-elevate active-elevate-2" data-testid="collapsible-coaching-hours">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Coaching Hours</p>
                    <p className="text-2xl font-semibold text-primary">{(invoiceData.coaching.breakdown.sessionHours + invoiceData.floatSessions.totalHours).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{invoiceData.coaching.sessions.length + invoiceData.floatSessions.sessions.length} session{(invoiceData.coaching.sessions.length + invoiceData.floatSessions.sessions.length) !== 1 ? 's' : ''}</p>
                  </div>
                  {(invoiceData.coaching.sessions.length + invoiceData.floatSessions.sessions.length) > 0 && (
                    coachingExpanded ? 
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : 
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {combinedCoachingActivity.map((activity) => {
                      if (activity.kind === 'session') {
                        const session = activity.session;
                        const sessionDate = new Date(session.sessionDate);
                        return (
                          <div key={`session-${activity.id}`} className="p-4 space-y-1" data-testid={`session-detail-${session.sessionId}`}>
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{format(sessionDate, 'EEEE do')}</p>
                              <p className="font-semibold text-primary">{session.duration.toFixed(1)} hrs</p>
                            </div>
                            <div className="flex items-start justify-between gap-2 text-sm">
                              <Badge variant="outline" className="font-normal whitespace-normal text-left">{session.squadName}</Badge>
                              <p className="text-muted-foreground whitespace-nowrap flex-shrink-0">{session.startTime} - {session.endTime}</p>
                            </div>
                          </div>
                        );
                      }

                      const fs = activity.floatSession;
                      const fsDate = new Date(fs.sessionDate);
                      return (
                        <div key={`float-${activity.id}`} className="p-4 space-y-1" data-testid={`float-detail-${fs.floatId}`}>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{format(fsDate, 'EEEE do')}</p>
                            <p className="font-semibold text-primary">{fs.duration.toFixed(1)} hrs</p>
                          </div>
                          <div className="flex items-start justify-between gap-2 text-sm">
                            <Badge variant="outline" className="font-normal">Float</Badge>
                            <p className="text-muted-foreground whitespace-nowrap flex-shrink-0">{fs.startTime} - {fs.endTime}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Sessions Written Card - Expandable */}
          <Collapsible open={writingExpanded} onOpenChange={setWritingExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left hover-elevate active-elevate-2" data-testid="collapsible-sessions-written">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Sessions Written</p>
                    <p className="text-2xl font-semibold text-primary">{invoiceData.sessionWriting.count}</p>
                    <p className="text-xs text-muted-foreground">{invoiceData.sessionWriting.sessions.length} session{invoiceData.sessionWriting.sessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  {invoiceData.sessionWriting.sessions.length > 0 && (
                    writingExpanded ? 
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : 
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {sortedWritingSessions.map((session) => {
                      const sessionDate = new Date(session.sessionDate);
                      return (
                        <div key={session.sessionId} className={`p-4 space-y-1 ${session.isDuplicated ? "opacity-60" : ""}`} data-testid={`writing-detail-${session.sessionId}`}>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{format(sessionDate, 'EEEE do')}</p>
                            <p className={`font-semibold ${session.isDuplicated ? "text-muted-foreground" : "text-primary"}`}>
                              {session.isDuplicated ? "£0.00" : `£${invoiceData.rates.sessionWritingRate.toFixed(2)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <Badge variant="outline" className="font-normal whitespace-normal text-left">{session.squadName}</Badge>
                            {session.isDuplicated && (
                              <Badge variant="outline" className="text-xs">
                                <Copy className="w-3 h-3 mr-1" />
                                Duplicate
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Competition Hours Card - Expandable */}
          <Collapsible open={competitionExpanded} onOpenChange={setCompetitionExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left hover-elevate active-elevate-2" data-testid="collapsible-competition-hours">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Competition Hours</p>
                    <p className="text-2xl font-semibold text-primary">{invoiceData.coaching.breakdown.competitionHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{invoiceData.coaching.competitions.length} competition{invoiceData.coaching.competitions.length !== 1 ? 's' : ''}</p>
                  </div>
                  {invoiceData.coaching.competitions.length > 0 && (
                    competitionExpanded ? 
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : 
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {sortedCompetitions.map((comp) => {
                      const compDate = new Date(comp.coachingDate);
                      return (
                        <div key={comp.coachingId} className="p-4 space-y-1" data-testid={`competition-detail-${comp.coachingId}`}>
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{format(compDate, 'EEEE do')}</p>
                            <p className="font-semibold text-primary">{comp.duration.toFixed(1)} hrs</p>
                          </div>
                          <div className="flex flex-col gap-1 text-sm">
                            <Badge variant="outline" className="w-fit font-normal">{comp.competitionName}</Badge>
                            <p className="text-muted-foreground text-xs">{comp.locationName}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {!adminHoursVisible ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
                onClick={() => setAdminHoursVisible(true)}
                data-testid="button-add-admin-hours"
              >
                <Plus className="h-3.5 w-3.5" />
                Add admin hours
              </Button>
            </div>
          ) : (
            <Card className="p-4" data-testid="card-admin-hours">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Admin Hours</p>
                      <p className="text-2xl font-semibold text-primary" data-testid="text-admin-amount">
                        £{adminEarnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        At £{invoiceData.rates.hourlyRate.toFixed(2)} per hour
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={removeAdminHours}
                      aria-label="Remove admin hours"
                      data-testid="button-remove-admin-hours"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="admin-hours" className="text-sm whitespace-nowrap">Hours:</label>
                    <Input
                      id="admin-hours"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.25"
                      value={adminHoursInput}
                      onChange={(event) => updateAdminHours(event.target.value)}
                      placeholder="0"
                      className="max-w-28"
                      data-testid="input-admin-hours"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Hourly Rate Card */}
          <Card className="p-4" data-testid="card-hourly-rate">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="text-2xl font-semibold text-primary" data-testid="text-hourly-rate">£{invoiceData.rates.hourlyRate.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground" data-testid="text-qualification-level">{invoiceData.qualificationLevel}</p>
              </div>
            </div>
          </Card>

          {/* Total Payment Card */}
          <Card className="p-4 bg-primary/5" data-testid="card-total-payment">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total Payment</p>
                <p className="text-3xl font-semibold text-primary" data-testid="text-total-earnings">£{totalEarningsWithAdmin.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {invoiceData.coaching.breakdown.sessionHours.toFixed(1)} coaching + {invoiceData.floatSessions.totalHours.toFixed(1)} float hrs
                  {adminHours > 0 ? ` + ${formatHours(adminHours)} admin hrs` : ''}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
        <p>Hart Swimming Club - Coaching Invoice</p>
        <p>Please remit payment to the coach within 14 days of invoice date</p>
      </div>
    </div>
  );
}
