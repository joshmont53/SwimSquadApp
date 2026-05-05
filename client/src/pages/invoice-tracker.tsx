import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Waves,
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

export function InvoiceTracker({ onBack }: InvoiceTrackerProps) {
  const { user } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [coachingExpanded, setCoachingExpanded] = useState(false);
  const [writingExpanded, setWritingExpanded] = useState(false);
  const [competitionExpanded, setCompetitionExpanded] = useState(false);
  const [floatExpanded, setFloatExpanded] = useState(false);

  // Fetch current user's coach profile
  const { data: coaches = [] } = useQuery<BackendCoach[]>({ 
    queryKey: ['/api/coaches'],
  });

  const currentCoach = useMemo(() => {
    return coaches.find(c => c.userId === user?.id);
  }, [coaches, user?.id]);

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
  }, [currentCoach, allSessions, allCompetitionCoaching]);

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

  const handleExport = () => {
    if (!invoiceData) return;
    
    const csvRows = [
      ['Hart Swimming Club - Coaching Invoice'],
      [`Coach: ${invoiceData.coachName}`],
      [`Period: ${MONTH_NAMES[invoiceData.month - 1]} ${invoiceData.year}`],
      [`Qualification: ${invoiceData.qualificationLevel}`],
      [`Hourly Rate: £${invoiceData.rates.hourlyRate.toFixed(2)}`],
      [],
      ['COACHING SESSIONS'],
      ['Date', 'Squad', 'Time', 'Hours', 'Amount'],
    ];

    invoiceData.coaching.sessions.forEach(session => {
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

    invoiceData.sessionWriting.sessions.forEach(session => {
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
      invoiceData.floatSessions.sessions.forEach(fs => {
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

    invoiceData.coaching.competitions.forEach(comp => {
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

    csvRows.push([]);
    csvRows.push([
      'TOTAL PAYMENT',
      '',
      '',
      '',
      `£${invoiceData.totals.totalEarnings.toFixed(2)}`,
    ]);

    const escapeCsvCell = (cell: string) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };
    const csvContent = csvRows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
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
                  {invoiceData.coaching.sessions.map((session) => {
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
                  {invoiceData.sessionWriting.sessions.map((session) => {
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
                  {invoiceData.floatSessions.sessions.map((fs) => {
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
                  {invoiceData.coaching.competitions.map((comp) => {
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

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-medium">Total Payment</p>
                <p className="text-sm text-muted-foreground">
                  {invoiceData.coaching.breakdown.sessionHours.toFixed(1)} session hrs + {invoiceData.coaching.breakdown.competitionHours.toFixed(1)} comp hrs
                  {invoiceData.floatSessions.totalHours > 0 ? ` + ${invoiceData.floatSessions.totalHours.toFixed(1)} float hrs` : ''} + {invoiceData.sessionWriting.count} written
                </p>
              </div>
              <p className="text-3xl font-medium text-primary">£{invoiceData.totals.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - Mobile View */}
      {invoiceData && (
        <div className="p-4 space-y-3 print:hidden overflow-y-auto overflow-x-hidden flex-1 pb-6 scroll-container">
          {/* Coaching Hours Card - Expandable */}
          <Collapsible open={coachingExpanded} onOpenChange={setCoachingExpanded}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 text-left hover-elevate active-elevate-2" data-testid="collapsible-coaching-hours">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Coaching Hours</p>
                    <p className="text-2xl font-semibold text-primary">{invoiceData.coaching.breakdown.sessionHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{invoiceData.coaching.sessions.length} session{invoiceData.coaching.sessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  {invoiceData.coaching.sessions.length > 0 && (
                    coachingExpanded ? 
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : 
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/20">
                  <div className="divide-y">
                    {invoiceData.coaching.sessions.map((session) => {
                      const sessionDate = new Date(session.sessionDate);
                      return (
                        <div key={session.sessionId} className="p-4 space-y-1" data-testid={`session-detail-${session.sessionId}`}>
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
                    {invoiceData.sessionWriting.sessions.map((session) => {
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

          {/* Float Sessions Card - Expandable */}
          {invoiceData.floatSessions.sessions.length > 0 && (
            <Collapsible open={floatExpanded} onOpenChange={setFloatExpanded}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 text-left hover-elevate active-elevate-2" data-testid="collapsible-float-sessions">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Waves className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Float Sessions</p>
                      <p className="text-2xl font-semibold text-primary">{invoiceData.floatSessions.totalHours.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">{invoiceData.floatSessions.sessions.length} session{invoiceData.floatSessions.sessions.length !== 1 ? 's' : ''}</p>
                    </div>
                    {floatExpanded
                      ? <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t bg-muted/20">
                    <div className="divide-y">
                      {invoiceData.floatSessions.sessions.map((fs) => {
                        const fsDate = new Date(fs.sessionDate);
                        return (
                          <div key={fs.floatId} className="p-4 space-y-1" data-testid={`float-detail-${fs.floatId}`}>
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{format(fsDate, 'EEEE do')}</p>
                              <p className="font-semibold text-primary">{fs.duration.toFixed(1)} hrs</p>
                            </div>
                            <div className="flex items-start justify-between gap-2 text-sm">
                              <Badge variant="outline" className="font-normal">{fs.locationName}</Badge>
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
          )}

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
                    {invoiceData.coaching.competitions.map((comp) => {
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
                <p className="text-3xl font-semibold text-primary" data-testid="text-total-earnings">£{invoiceData.totals.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {invoiceData.coaching.breakdown.sessionHours.toFixed(1)} coaching + {invoiceData.floatSessions.totalHours.toFixed(1)} float hrs
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
