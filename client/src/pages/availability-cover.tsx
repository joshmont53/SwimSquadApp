import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, CalendarOff, Plus, Trash2, ChevronDown, ChevronUp,
  Clock, MapPin, Users, CheckCircle2, AlertCircle, UserCheck,
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Coach, Location, Squad } from '@/lib/typeAdapters';
import type { SwimmingSession } from '@shared/schema';

interface AbsencePeriod {
  id: string;
  coachId: string;
  clubId: string;
  startDate: string;
  endDate: string;
  absenceType: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  recordStatus: string;
  createdAt: string;
}

interface CoverOpportunity {
  id: string;
  clubId: string;
  requesterCoachId: string;
  sessionId: string;
  role: string;
  reason: string | null;
  coverStatus: string;
  coverCoachId: string | null;
  createdAt: string;
}

interface Props {
  onBack: () => void;
  currentCoach: Coach | undefined;
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  sessions: SwimmingSession[];
  sessionSquadMap: Record<string, string[]>;
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function fmt(d: string) {
  try { return format(parseISO(d), 'EEE d MMM yyyy'); }
  catch { return d; }
}

function roleLabel(role: string) {
  if (role === 'lead') return 'Lead Coach';
  if (role === 'second') return 'Second Coach';
  return 'Helper';
}

export function AvailabilityCover({ onBack, currentCoach, coaches, squads, locations, sessions, sessionSquadMap }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Absence form state ────────────────────────────────────────────────────
  const [absForm, setAbsForm] = useState({
    startDate: today,
    endDate: today,
    absenceType: 'all_day' as 'all_day' | 'specific_times',
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [absFormOpen, setAbsFormOpen] = useState(false);

  // ── Cover request form state ───────────────────────────────────────────────
  const [coverForm, setCoverForm] = useState({ sessionId: '', role: '', reason: '' });
  const [coverFormOpen, setCoverFormOpen] = useState(false);

  // ── Volunteer confirm state ────────────────────────────────────────────────
  const [volunteerOppId, setVolunteerOppId] = useState<string | null>(null);
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(new Set());

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: absences = [], isLoading: absLoading } = useQuery<AbsencePeriod[]>({
    queryKey: ['/api/absence-periods'],
  });

  const { data: coverOpps = [], isLoading: coverLoading } = useQuery<CoverOpportunity[]>({
    queryKey: ['/api/cover-opportunities'],
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const myAbsences = useMemo(() =>
    absences.filter(a => a.coachId === currentCoach?.id),
    [absences, currentCoach]
  );

  const upcomingAbsences = useMemo(() =>
    myAbsences.filter(a => a.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [myAbsences, today]
  );

  const pastAbsences = useMemo(() =>
    myAbsences.filter(a => a.endDate < today).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [myAbsences, today]
  );

  const myCoverRequests = useMemo(() =>
    coverOpps.filter(o => o.requesterCoachId === currentCoach?.id),
    [coverOpps, currentCoach]
  );

  const openOpportunities = useMemo(() =>
    coverOpps.filter(o =>
      o.coverStatus === 'pending' &&
      o.requesterCoachId !== currentCoach?.id &&
      sessions.find(s => s.id === o.sessionId && s.sessionDate >= today)
    ),
    [coverOpps, currentCoach, sessions, today]
  );

  // Sessions where current coach is lead/second/helper and date >= today
  const eligibleSessions = useMemo(() => {
    if (!currentCoach) return [];
    return sessions
      .filter(s =>
        s.sessionDate >= today &&
        (s.leadCoachId === currentCoach.id || s.secondCoachId === currentCoach.id || s.helperId === currentCoach.id)
      )
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  }, [sessions, currentCoach, today]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  type AbsencePayload = { startDate: string; endDate: string; absenceType: string; startTime?: string; endTime?: string; reason?: string };
  type CoverPayload = { sessionId: string; role: string; reason?: string };

  const createAbsence = useMutation({
    mutationFn: (data: AbsencePayload) => apiRequest('POST', '/api/absence-periods', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/absence-periods'] });
      setAbsFormOpen(false);
      setAbsForm({ startDate: today, endDate: today, absenceType: 'all_day', startTime: '', endTime: '', reason: '' });
      toast({ title: 'Absence logged' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to log absence', variant: 'destructive' }),
  });

  const deleteAbsence = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/absence-periods/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/absence-periods'] });
      toast({ title: 'Absence removed' });
    },
  });

  const createCover = useMutation({
    mutationFn: (data: CoverPayload) => apiRequest('POST', '/api/cover-opportunities', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/cover-opportunities'] });
      setCoverFormOpen(false);
      setCoverForm({ sessionId: '', role: '', reason: '' });
      toast({ title: 'Cover request submitted' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to submit request', variant: 'destructive' }),
  });

  const volunteer = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/cover-opportunities/${id}/volunteer`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/cover-opportunities'] });
      qc.invalidateQueries({ queryKey: ['/api/sessions'] });
      setVolunteerOppId(null);
      toast({ title: 'Volunteered successfully', description: 'You have been assigned to this session.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to volunteer', variant: 'destructive' }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const coachName = (id: string | null | undefined) => {
    if (!id) return 'None';
    const c = coaches.find(c => c.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  const locationName = (id: string) => locations.find(l => l.id === id)?.name ?? 'Unknown';

  const squadNames = (sessionId: string, session: SwimmingSession) => {
    const ids = sessionSquadMap[sessionId] ?? [session.squadId];
    return ids.map(sid => squads.find(sq => sq.id === sid)?.name ?? 'Unknown').join(', ');
  };

  const handleAbsSubmit = () => {
    if (!absForm.startDate || !absForm.endDate) return;
    if (absForm.absenceType === 'specific_times' && (!absForm.startTime || !absForm.endTime)) {
      toast({ title: 'Validation error', description: 'Start and end time are required for specific times', variant: 'destructive' });
      return;
    }
    createAbsence.mutate({
      startDate: absForm.startDate,
      endDate: absForm.endDate,
      absenceType: absForm.absenceType,
      startTime: absForm.absenceType === 'specific_times' ? absForm.startTime : null,
      endTime: absForm.absenceType === 'specific_times' ? absForm.endTime : null,
      reason: absForm.reason || null,
    });
  };

  const handleCoverSubmit = () => {
    if (!coverForm.sessionId || !coverForm.role) {
      toast({ title: 'Validation error', description: 'Please select a session and role', variant: 'destructive' });
      return;
    }
    createCover.mutate({
      sessionId: coverForm.sessionId,
      role: coverForm.role,
      reason: coverForm.reason || null,
    });
  };

  const selectedSession = sessions.find(s => s.id === coverForm.sessionId);
  const availableRoles = useMemo(() => {
    if (!selectedSession || !currentCoach) return [];
    const roles: { value: string; label: string }[] = [];
    if (selectedSession.leadCoachId === currentCoach.id) roles.push({ value: 'lead', label: 'Lead Coach' });
    if (selectedSession.secondCoachId === currentCoach.id) roles.push({ value: 'second', label: 'Second Coach' });
    if (selectedSession.helperId === currentCoach.id) roles.push({ value: 'helper', label: 'Helper' });
    return roles;
  }, [selectedSession, currentCoach]);

  const toggleExpanded = (id: string) => {
    setExpandedOpps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b px-2 pt-2">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-availability">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base flex-1 min-w-0 truncate">Availability & Cover</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-2">
          <Tabs defaultValue="availability" className="mt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="availability" data-testid="tab-availability">Availability</TabsTrigger>
              <TabsTrigger value="mycover" data-testid="tab-my-cover">My Cover</TabsTrigger>
              <TabsTrigger value="opportunities" data-testid="tab-opportunities">Opportunities</TabsTrigger>
            </TabsList>

            {/* ── Availability Tab ─────────────────────────────────────────── */}
            <TabsContent value="availability" className="mt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Log Absence</h2>
                <Button size="sm" variant="outline" onClick={() => setAbsFormOpen(v => !v)} data-testid="button-toggle-absence-form">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Log Absence
                </Button>
              </div>

              {absFormOpen && (
                <Card className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="abs-start">Start Date <span className="text-destructive">*</span></Label>
                      <Input id="abs-start" type="date" value={absForm.startDate} onChange={e => setAbsForm(f => ({ ...f, startDate: e.target.value }))} data-testid="input-absence-start" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="abs-end">End Date <span className="text-destructive">*</span></Label>
                      <Input id="abs-end" type="date" value={absForm.endDate} min={absForm.startDate} onChange={e => setAbsForm(f => ({ ...f, endDate: e.target.value }))} data-testid="input-absence-end" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Type <span className="text-destructive">*</span></Label>
                    <Select value={absForm.absenceType} onValueChange={v => setAbsForm(f => ({ ...f, absenceType: v }))}>
                      <SelectTrigger data-testid="select-absence-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_day">All Day</SelectItem>
                        <SelectItem value="specific_times">Specific Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {absForm.absenceType === 'specific_times' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="abs-stime">Start Time <span className="text-destructive">*</span></Label>
                        <Input id="abs-stime" type="time" value={absForm.startTime} onChange={e => setAbsForm(f => ({ ...f, startTime: e.target.value }))} data-testid="input-absence-start-time" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="abs-etime">End Time <span className="text-destructive">*</span></Label>
                        <Input id="abs-etime" type="time" value={absForm.endTime} onChange={e => setAbsForm(f => ({ ...f, endTime: e.target.value }))} data-testid="input-absence-end-time" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="abs-reason">Reason (optional)</Label>
                    <Textarea id="abs-reason" value={absForm.reason} onChange={e => setAbsForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason for absence" rows={2} data-testid="input-absence-reason" />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleAbsSubmit} disabled={createAbsence.isPending} data-testid="button-submit-absence">
                      {createAbsence.isPending ? 'Saving…' : 'Save Absence'}
                    </Button>
                    <Button variant="ghost" onClick={() => setAbsFormOpen(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              {absLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : (
                <>
                  {upcomingAbsences.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Upcoming absences</h3>
                      {upcomingAbsences.map(a => (
                        <AbsenceCard key={a.id} absence={a} onDelete={() => deleteAbsence.mutate(a.id)} deleting={deleteAbsence.isPending} />
                      ))}
                    </div>
                  )}
                  {pastAbsences.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Past absences</h3>
                      {pastAbsences.map(a => (
                        <AbsenceCard key={a.id} absence={a} onDelete={() => deleteAbsence.mutate(a.id)} deleting={deleteAbsence.isPending} past />
                      ))}
                    </div>
                  )}
                  {upcomingAbsences.length === 0 && pastAbsences.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No absences recorded</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── My Cover Requests Tab ─────────────────────────────────────── */}
            <TabsContent value="mycover" className="mt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Cover Requests</h2>
                <Button size="sm" variant="outline" onClick={() => setCoverFormOpen(v => !v)} data-testid="button-toggle-cover-form">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Request Cover
                </Button>
              </div>

              {coverFormOpen && (
                <Card className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Session <span className="text-destructive">*</span></Label>
                    <Select
                      value={coverForm.sessionId}
                      onValueChange={v => setCoverForm(f => ({ ...f, sessionId: v, role: '' }))}
                    >
                      <SelectTrigger data-testid="select-cover-session"><SelectValue placeholder="Select a session" /></SelectTrigger>
                      <SelectContent>
                        {eligibleSessions.map(s => {
                          const sqs = squadNames(s.id, s);
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              {fmt(s.sessionDate)} — {s.startTime.slice(0, 5)} · {sqs} · {locationName(s.poolId)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {availableRoles.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Role <span className="text-destructive">*</span></Label>
                      <Select value={coverForm.role} onValueChange={v => setCoverForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger data-testid="select-cover-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="cover-reason">Reason (optional)</Label>
                    <Textarea id="cover-reason" value={coverForm.reason} onChange={e => setCoverForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why do you need cover?" rows={2} data-testid="input-cover-reason" />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleCoverSubmit} disabled={createCover.isPending} data-testid="button-submit-cover">
                      {createCover.isPending ? 'Submitting…' : 'Submit Request'}
                    </Button>
                    <Button variant="ghost" onClick={() => setCoverFormOpen(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              {coverLoading ? (
                <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : myCoverRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No cover requests yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myCoverRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(opp => {
                    const session = sessions.find(s => s.id === opp.sessionId);
                    return (
                      <Card key={opp.id} className="p-3 space-y-1.5" data-testid={`card-cover-request-${opp.id}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="space-y-0.5">
                            {session ? (
                              <>
                                <p className="text-sm font-medium">{fmt(session.sessionDate)} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}</p>
                                <p className="text-xs text-muted-foreground">{squadNames(session.id, session)} · {locationName(session.poolId)}</p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Session not found</p>
                            )}
                            <p className="text-xs text-muted-foreground">{roleLabel(opp.role)}</p>
                            {opp.reason && <p className="text-xs text-muted-foreground italic">{opp.reason}</p>}
                          </div>
                          <Badge variant={opp.coverStatus === 'covered' ? 'default' : 'secondary'} data-testid={`badge-cover-status-${opp.id}`}>
                            {opp.coverStatus === 'covered' ? 'Covered' : 'Pending'}
                          </Badge>
                        </div>
                        {opp.coverStatus === 'covered' && opp.coverCoachId && (
                          <p className="text-xs text-muted-foreground">Covered by: {coachName(opp.coverCoachId)}</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Cover Opportunities Tab ───────────────────────────────────── */}
            <TabsContent value="opportunities" className="mt-4 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cover Opportunities</h2>

              {coverLoading ? (
                <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : openOpportunities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No open cover requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openOpportunities.map(opp => {
                    const session = sessions.find(s => s.id === opp.sessionId);
                    const expanded = expandedOpps.has(opp.id);
                    return (
                      <Card key={opp.id} className="p-3 space-y-2" data-testid={`card-opportunity-${opp.id}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="space-y-1 flex-1 min-w-0">
                            {session ? (
                              <>
                                <p className="text-sm font-medium">{fmt(session.sessionDate)} · {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{squadNames(session.id, session)}</span>
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationName(session.poolId)}</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{roleLabel(opp.role)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Requested by: {coachName(opp.requesterCoachId)}</p>
                                {opp.reason && <p className="text-xs text-muted-foreground italic">{opp.reason}</p>}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Session not found</p>
                            )}
                          </div>
                          <Button size="sm" onClick={() => setVolunteerOppId(opp.id)} data-testid={`button-volunteer-${opp.id}`}>
                            Volunteer
                          </Button>
                        </div>

                        {session && (
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleExpanded(opp.id)}
                            data-testid={`button-expand-${opp.id}`}
                          >
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expanded ? 'Hide session details' : 'Show session details'}
                          </button>
                        )}

                        {expanded && session && (
                          <div className="pt-1 border-t text-xs space-y-1 text-muted-foreground">
                            <p>Lead: {coachName(session.leadCoachId)}</p>
                            {session.secondCoachId && <p>Second: {coachName(session.secondCoachId)}</p>}
                            {session.helperId && <p>Helper: {coachName(session.helperId)}</p>}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Volunteer confirmation dialog */}
      <AlertDialog open={!!volunteerOppId} onOpenChange={open => !open && setVolunteerOppId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Volunteer for cover?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be assigned to this session in the requested role. Please make sure you are available before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={volunteer.isPending}
              onClick={() => volunteerOppId && volunteer.mutate(volunteerOppId)}
              data-testid="button-confirm-volunteer"
            >
              {volunteer.isPending ? 'Confirming…' : 'Yes, volunteer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AbsenceCard({ absence, onDelete, deleting, past }: { absence: AbsencePeriod; onDelete: () => void; deleting: boolean; past?: boolean }) {
  return (
    <Card className={`p-3 space-y-1 ${past ? 'opacity-60' : ''}`} data-testid={`card-absence-${absence.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-sm font-medium">
            {fmt(absence.startDate)}{absence.startDate !== absence.endDate ? ` – ${fmt(absence.endDate)}` : ''}
          </p>
          {absence.absenceType === 'specific_times' && absence.startTime && absence.endTime && (
            <p className="text-xs text-muted-foreground">{absence.startTime.slice(0, 5)} – {absence.endTime.slice(0, 5)}</p>
          )}
          {absence.reason && <p className="text-xs text-muted-foreground italic">{absence.reason}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {absence.absenceType === 'all_day' ? 'All Day' : 'Specific Times'}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} data-testid={`button-delete-absence-${absence.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
