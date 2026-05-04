import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft, Plus, Edit2, Trash2, LayoutGrid, List,
  AlertCircle, CheckCircle2, Clock, MapPin, Users, CalendarDays,
  Info, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { format, addDays, startOfWeek, isAfter, parseISO, addWeeks, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Coach, Location, Squad } from '@/lib/typeAdapters';
import type { SwimmingSession } from '@shared/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecurringSession {
  id: string;
  clubId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  leadCoachId: string;
  secondCoachId: string | null;
  helperId: string | null;
  setWriterId: string;
  notes: string | null;
  squadIds: string[];
}

interface AbsencePeriod {
  id: string;
  coachId: string;
  startDate: string;
  endDate: string;
  absenceType: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface CoverOpportunity {
  id: string;
  requesterCoachId: string;
  sessionId: string;
  role: string;
  reason: string | null;
  coverStatus: string;
  coverCoachId: string | null;
  createdAt: string;
}

interface FloatSession {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  coachId: string;
  locationId: string;
  notes: string | null;
}

interface DraftRow {
  id: string;
  type: 'session' | 'float';
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  leadCoachId: string;
  secondCoachId: string | null;
  helperId: string | null;
  setWriterId: string | null;
  squadIds: string[];
  coachId?: string; // for float
  notes?: string;
  status: 'ok' | 'warn' | 'error';
  issues: string[];
  recurringId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ISO: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
const LEVEL2_LEVELS = ['Level 2', 'Level 3'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) { try { return format(parseISO(d), 'EEE d MMM'); } catch { return d; } }
function coachN(coaches: Coach[], id: string | null | undefined) {
  if (!id) return 'None';
  const c = coaches.find(c => c.id === id);
  return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
}
function squadN(squads: Squad[], ids: string[]) {
  return ids.map(id => squads.find(s => s.id === id)?.name ?? 'Unknown').join(', ');
}
function locN(locations: Location[], id: string) {
  return locations.find(l => l.id === id)?.name ?? 'Unknown';
}

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
}

export function ScheduleManager({ onBack, coaches, squads, locations }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: recurringSessions = [], isLoading: rsLoading } = useQuery<RecurringSession[]>({
    queryKey: ['/api/recurring-sessions'],
  });
  const { data: absences = [] } = useQuery<AbsencePeriod[]>({
    queryKey: ['/api/absence-periods'],
  });
  const { data: coverOpps = [] } = useQuery<CoverOpportunity[]>({
    queryKey: ['/api/cover-opportunities'],
  });
  const { data: allSessions = [] } = useQuery<SwimmingSession[]>({
    queryKey: ['/api/sessions'],
  });
  const { data: floatSessions = [] } = useQuery<FloatSession[]>({
    queryKey: ['/api/float-sessions'],
  });

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b px-2 pt-2">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-schedule-manager">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base flex-1 min-w-0 truncate">Schedule Manager</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-2">
          <Tabs defaultValue="standard" className="mt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="standard" data-testid="tab-standard-schedule">Standard Schedule</TabsTrigger>
              <TabsTrigger value="generate" data-testid="tab-generate-sessions">Generate Sessions</TabsTrigger>
              <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="mt-4">
              <StandardScheduleTab
                recurringSessions={recurringSessions}
                isLoading={rsLoading}
                coaches={coaches}
                squads={squads}
                locations={locations}
                onRefresh={() => qc.invalidateQueries({ queryKey: ['/api/recurring-sessions'] })}
              />
            </TabsContent>

            <TabsContent value="generate" className="mt-4">
              <GenerateSessionsTab
                recurringSessions={recurringSessions}
                absences={absences}
                coaches={coaches}
                squads={squads}
                locations={locations}
                floatSessions={floatSessions}
                onRefresh={() => {
                  qc.invalidateQueries({ queryKey: ['/api/sessions'] });
                  qc.invalidateQueries({ queryKey: ['/api/float-sessions'] });
                  qc.invalidateQueries({ queryKey: ['/api/cover-opportunities'] });
                }}
              />
            </TabsContent>

            <TabsContent value="alerts" className="mt-4">
              <AlertsTab
                coverOpps={coverOpps}
                absences={absences}
                coaches={coaches}
                squads={squads}
                locations={locations}
                sessions={allSessions}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Standard Schedule Tab ────────────────────────────────────────────────────

function StandardScheduleTab({ recurringSessions, isLoading, coaches, squads, locations, onRefresh }: {
  recurringSessions: RecurringSession[];
  isLoading: boolean;
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [gridView, setGridView] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = useMemo(() =>
    [...recurringSessions].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
    [recurringSessions]
  );

  const byDay = useMemo(() => {
    const map: Record<number, RecurringSession[]> = {};
    for (let d = 1; d <= 7; d++) map[d] = [];
    for (const rs of sorted) map[rs.dayOfWeek].push(rs);
    return map;
  }, [sorted]);

  type RecurringSessionFormData = {
    dayOfWeek: number; startTime: string; endTime: string; locationId: string;
    leadCoachId: string; secondCoachId?: string | null; helperId?: string | null;
    setWriterId?: string | null; notes?: string | null; squadIds: string[];
  };

  const createMut = useMutation({
    mutationFn: (data: RecurringSessionFormData) => apiRequest('POST', '/api/recurring-sessions', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/recurring-sessions'] }); setModalOpen(false); toast({ title: 'Session added' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to save session', variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecurringSessionFormData }) => apiRequest('PATCH', `/api/recurring-sessions/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/recurring-sessions'] }); setModalOpen(false); setEditing(null); toast({ title: 'Session updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update session', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/recurring-sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/recurring-sessions'] }); setDeleteId(null); toast({ title: 'Session removed' }); },
  });

  const handleEdit = (rs: RecurringSession) => { setEditing(rs); setModalOpen(true); };
  const handleAdd = () => { setEditing(null); setModalOpen(true); };

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="hidden md:flex border rounded-md overflow-hidden">
          <button
            className={cn('px-3 py-1.5 text-sm', gridView ? 'bg-accent' : 'hover-elevate')}
            onClick={() => setGridView(true)}
            data-testid="button-grid-view"
          ><LayoutGrid className="h-4 w-4 inline mr-1" />Grid</button>
          <button
            className={cn('px-3 py-1.5 text-sm', !gridView ? 'bg-accent' : 'hover-elevate')}
            onClick={() => setGridView(false)}
            data-testid="button-table-view"
          ><List className="h-4 w-4 inline mr-1" />Table</button>
        </div>
        <Button size="sm" onClick={handleAdd} data-testid="button-add-recurring">
          <Plus className="h-4 w-4 mr-1.5" />Add Recurring Session
        </Button>
      </div>

      {recurringSessions.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No recurring sessions yet. Add one to build your standard schedule.</p>
        </div>
      ) : (
        <>
          {/* Desktop grid view */}
          <div className={cn('hidden md:block', !gridView && 'md:hidden')}>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, idx) => {
                const dayNum = idx + 1;
                return (
                  <div key={day} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground text-center uppercase">{day.slice(0, 3)}</p>
                    {byDay[dayNum].map(rs => (
                      <RSCard key={rs.id} rs={rs} coaches={coaches} squads={squads} locations={locations} onEdit={() => handleEdit(rs)} onDelete={() => setDeleteId(rs.id)} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table view (desktop) */}
          <div className={cn('hidden', !gridView && 'md:block')}>
            <RSTable rows={sorted} coaches={coaches} squads={squads} locations={locations} onEdit={handleEdit} onDelete={id => setDeleteId(id)} />
          </div>

          {/* Mobile: stacked day list */}
          <div className="md:hidden space-y-4">
            {DAYS.map((day, idx) => {
              const dayNum = idx + 1;
              if (byDay[dayNum].length === 0) return null;
              return (
                <div key={day} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{day}</h3>
                  {byDay[dayNum].map(rs => (
                    <RSCard key={rs.id} rs={rs} coaches={coaches} squads={squads} locations={locations} onEdit={() => handleEdit(rs)} onDelete={() => setDeleteId(rs.id)} />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      <RecurringSessionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        initial={editing}
        coaches={coaches}
        squads={squads}
        locations={locations}
        onSave={(data) => {
          if (editing) {
            updateMut.mutate({ id: editing.id, data });
          } else {
            createMut.mutate(data);
          }
        }}
        saving={createMut.isPending || updateMut.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove recurring session?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the session from the standard schedule. Already-created sessions are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RSCard({ rs, coaches, squads, locations, onEdit, onDelete }: {
  rs: RecurringSession; coaches: Coach[]; squads: Squad[]; locations: Location[];
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <Card className="p-2 space-y-1 text-xs hover-elevate cursor-pointer" onClick={onEdit} data-testid={`card-rs-${rs.id}`}>
      <p className="font-medium text-sm">{rs.startTime.slice(0,5)}–{rs.endTime.slice(0,5)}</p>
      <p className="text-muted-foreground truncate">{squadN(squads, rs.squadIds)}</p>
      <p className="text-muted-foreground truncate">{locN(locations, rs.locationId)}</p>
      <p className="text-muted-foreground truncate">{coachN(coaches, rs.leadCoachId)}</p>
    </Card>
  );
}

function RSTable({ rows, coaches, squads, locations, onEdit, onDelete }: {
  rows: RecurringSession[]; coaches: Coach[]; squads: Squad[]; locations: Location[];
  onEdit: (rs: RecurringSession) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {['Day','Time','Squad(s)','Venue','Lead','Second','Helper','Set Writer',''].map(h => (
              <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(rs => (
            <tr key={rs.id} className="border-t hover:bg-muted/30 transition-colors" data-testid={`row-rs-${rs.id}`}>
              <td className="px-3 py-2 whitespace-nowrap">{DAYS[rs.dayOfWeek - 1]}</td>
              <td className="px-3 py-2 whitespace-nowrap">{rs.startTime.slice(0,5)}–{rs.endTime.slice(0,5)}</td>
              <td className="px-3 py-2">{squadN(squads, rs.squadIds)}</td>
              <td className="px-3 py-2">{locN(locations, rs.locationId)}</td>
              <td className="px-3 py-2">{coachN(coaches, rs.leadCoachId)}</td>
              <td className="px-3 py-2">{coachN(coaches, rs.secondCoachId) || '—'}</td>
              <td className="px-3 py-2">{coachN(coaches, rs.helperId) || '—'}</td>
              <td className="px-3 py-2">{coachN(coaches, rs.setWriterId)}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(rs)} data-testid={`button-edit-rs-${rs.id}`}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(rs.id)} data-testid={`button-delete-rs-${rs.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringSessionModal({ open, onClose, initial, coaches, squads, locations, onSave, saving }: {
  open: boolean; onClose: () => void; initial: RecurringSession | null;
  coaches: Coach[]; squads: Squad[]; locations: Location[];
  onSave: (data: RecurringSessionFormData) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    dayOfWeek: initial?.dayOfWeek?.toString() ?? '1',
    startTime: initial?.startTime?.slice(0,5) ?? '',
    endTime: initial?.endTime?.slice(0,5) ?? '',
    locationId: initial?.locationId ?? '',
    leadCoachId: initial?.leadCoachId ?? '',
    secondCoachId: initial?.secondCoachId ?? '',
    helperId: initial?.helperId ?? '',
    setWriterId: initial?.setWriterId ?? '',
    notes: initial?.notes ?? '',
    squadIds: initial?.squadIds ?? [] as string[],
  });

  // Reset form when initial changes
  const resetForm = useCallback(() => {
    setForm({
      dayOfWeek: initial?.dayOfWeek?.toString() ?? '1',
      startTime: initial?.startTime?.slice(0,5) ?? '',
      endTime: initial?.endTime?.slice(0,5) ?? '',
      locationId: initial?.locationId ?? '',
      leadCoachId: initial?.leadCoachId ?? '',
      secondCoachId: initial?.secondCoachId ?? '',
      helperId: initial?.helperId ?? '',
      setWriterId: initial?.setWriterId ?? '',
      notes: initial?.notes ?? '',
      squadIds: initial?.squadIds ?? [],
    });
  }, [initial]);

  const handleSquadToggle = (squadId: string) => {
    setForm(f => ({
      ...f,
      squadIds: f.squadIds.includes(squadId) ? f.squadIds.filter(id => id !== squadId) : [...f.squadIds, squadId],
    }));
  };

  const handleSave = () => {
    onSave({
      dayOfWeek: parseInt(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      locationId: form.locationId,
      leadCoachId: form.leadCoachId,
      secondCoachId: form.secondCoachId || null,
      helperId: form.helperId || null,
      setWriterId: form.setWriterId,
      notes: form.notes || null,
      squadIds: form.squadIds,
    });
  };

  const activeCoaches = coaches.filter(c => (c as Coach & { recordStatus?: string }).recordStatus !== 'inactive');

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Recurring Session' : 'Add Recurring Session'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Day of Week <span className="text-destructive">*</span></Label>
            <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
              <SelectTrigger data-testid="select-rs-day"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={d} value={String(i+1)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Squads <span className="text-destructive">*</span></Label>
            <div className="border rounded-md p-3 space-y-2">
              {squads.map(sq => (
                <label key={sq.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.squadIds.includes(sq.id)}
                    onCheckedChange={() => handleSquadToggle(sq.id)}
                    data-testid={`checkbox-squad-${sq.id}`}
                  />
                  <span className="text-sm">{sq.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time <span className="text-destructive">*</span></Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} data-testid="input-rs-start-time" />
            </div>
            <div className="space-y-1.5">
              <Label>End Time <span className="text-destructive">*</span></Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} data-testid="input-rs-end-time" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Venue <span className="text-destructive">*</span></Label>
            <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
              <SelectTrigger data-testid="select-rs-location"><SelectValue placeholder="Select venue" /></SelectTrigger>
              <SelectContent>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Lead Coach <span className="text-destructive">*</span></Label>
            <Select value={form.leadCoachId} onValueChange={v => setForm(f => ({ ...f, leadCoachId: v }))}>
              <SelectTrigger data-testid="select-rs-lead"><SelectValue placeholder="Select lead coach" /></SelectTrigger>
              <SelectContent>
                {activeCoaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Second Coach</Label>
            <Select value={form.secondCoachId} onValueChange={v => setForm(f => ({ ...f, secondCoachId: v === '_none' ? '' : v }))}>
              <SelectTrigger data-testid="select-rs-second"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {activeCoaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Helper</Label>
            <Select value={form.helperId} onValueChange={v => setForm(f => ({ ...f, helperId: v === '_none' ? '' : v }))}>
              <SelectTrigger data-testid="select-rs-helper"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {activeCoaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Set Writer <span className="text-destructive">*</span></Label>
            <Select value={form.setWriterId} onValueChange={v => setForm(f => ({ ...f, setWriterId: v }))}>
              <SelectTrigger data-testid="select-rs-writer"><SelectValue placeholder="Select set writer" /></SelectTrigger>
              <SelectContent>
                {activeCoaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes" data-testid="input-rs-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-rs">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Generate Sessions Tab ────────────────────────────────────────────────────

function GenerateSessionsTab({ recurringSessions, absences, coaches, squads, locations, floatSessions, onRefresh }: {
  recurringSessions: RecurringSession[];
  absences: AbsencePeriod[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  floatSessions: FloatSession[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [period, setPeriod] = useState<'next_week' | 'next_4_weeks' | 'custom'>('next_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [draft, setDraft] = useState<DraftRow[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [addFloatOpen, setAddFloatOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const dateRange = useMemo(() => {
    const nextMonday = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
    if (period === 'next_week') {
      return { start: format(nextMonday, 'yyyy-MM-dd'), end: format(addDays(nextMonday, 6), 'yyyy-MM-dd') };
    } else if (period === 'next_4_weeks') {
      return { start: format(nextMonday, 'yyyy-MM-dd'), end: format(addDays(nextMonday, 27), 'yyyy-MM-dd') };
    } else {
      return { start: customStart, end: customEnd };
    }
  }, [period, customStart, customEnd]);

  const previewCount = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 0;
    let count = 0;
    let d = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    while (!isAfter(d, end)) {
      const dow = (d.getDay() === 0 ? 7 : d.getDay());
      count += recurringSessions.filter(rs => rs.dayOfWeek === dow).length;
      d = addDays(d, 1);
    }
    return count;
  }, [dateRange, recurringSessions]);

  function isCoachAbsent(coachId: string, date: string, startTime: string, endTime: string) {
    return absences.some(a => {
      if (a.coachId !== coachId) return false;
      if (a.endDate < date || a.startDate > date) return false;
      if (a.absenceType === 'all_day') return true;
      if (!a.startTime || !a.endTime) return true;
      const absStart = timeToMins(a.startTime);
      const absEnd = timeToMins(a.endTime);
      const sessStart = timeToMins(startTime);
      const sessEnd = timeToMins(endTime);
      return absStart < sessEnd && absEnd > sessStart;
    });
  }

  function computeStatus(row: DraftRow, allRows: DraftRow[]): { status: DraftRow['status']; issues: string[] } {
    const issues: string[] = [];
    if (!row.leadCoachId) issues.push('Lead coach is vacant');
    // Level 2 check: for each concurrent session at same location, check if any L2+ coach is present
    const sameLocSameDate = allRows.filter(r =>
      r.type === 'session' && r.locationId === row.locationId && r.date === row.date
    );
    const hasL2 = sameLocSameDate.some(r => {
      const poolCoaches = [r.leadCoachId, r.secondCoachId, r.helperId].filter(Boolean) as string[];
      return poolCoaches.some(cid => {
        const c = coaches.find(co => co.id === cid);
        return c && LEVEL2_LEVELS.includes(c.level);
      });
    });
    if (!hasL2) issues.push('No Level 2+ coach at this venue/time block');
    const status = !row.leadCoachId ? 'error' : issues.length > 0 ? 'warn' : 'ok';
    return { status, issues };
  }

  const generateDraft = () => {
    if (!dateRange.start || !dateRange.end) {
      toast({ title: 'Please select a valid date range', variant: 'destructive' });
      return;
    }
    const rows: DraftRow[] = [];
    let d = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    while (!isAfter(d, end)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dow = (d.getDay() === 0 ? 7 : d.getDay());
      const dayRS = recurringSessions.filter(rs => rs.dayOfWeek === dow);
      for (const rs of dayRS) {
        const leadVacant = isCoachAbsent(rs.leadCoachId, dateStr, rs.startTime, rs.endTime);
        const secondVacant = rs.secondCoachId ? isCoachAbsent(rs.secondCoachId, dateStr, rs.startTime, rs.endTime) : false;
        const helperVacant = rs.helperId ? isCoachAbsent(rs.helperId, dateStr, rs.startTime, rs.endTime) : false;
        rows.push({
          id: `${rs.id}-${dateStr}`,
          type: 'session',
          date: dateStr,
          startTime: rs.startTime.slice(0,5),
          endTime: rs.endTime.slice(0,5),
          locationId: rs.locationId,
          leadCoachId: leadVacant ? '' : rs.leadCoachId,
          secondCoachId: secondVacant ? null : rs.secondCoachId,
          helperId: helperVacant ? null : rs.helperId,
          setWriterId: rs.setWriterId,
          squadIds: rs.squadIds,
          status: 'ok',
          issues: [
            ...(leadVacant ? ['Lead coach absent'] : []),
            ...(secondVacant ? ['Second coach absent'] : []),
            ...(helperVacant ? ['Helper absent'] : []),
          ],
          recurringId: rs.id,
        });
      }
      d = addDays(d, 1);
    }
    // Re-run status checks
    const finalRows = rows.map(row => {
      const { status, issues } = computeStatus(row, rows);
      return { ...row, status, issues: [...row.issues, ...issues.filter(i => !row.issues.includes(i))] };
    });
    setDraft(finalRows.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
  };

  const updateRow = (id: string, updates: Partial<DraftRow>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      return updated.map(row => {
        const { status, issues } = computeStatus(row, updated);
        const baseIssues = row.issues.filter(i => i.includes('absent'));
        return { ...row, ...( row.id === id ? updates : {}), status, issues: [...baseIssues, ...issues.filter(i => !baseIssues.includes(i))] };
      });
    });
  };

  const removeRow = (id: string) => {
    setDraft(prev => prev ? prev.filter(r => r.id !== id) : null);
  };

  const addSessionRow = (data: Omit<DraftRow, 'id' | 'type' | 'status' | 'issues'>) => {
    const newRow: DraftRow = {
      id: `manual-${Date.now()}`,
      type: 'session',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      locationId: data.locationId,
      leadCoachId: data.leadCoachId ?? '',
      secondCoachId: data.secondCoachId || null,
      helperId: data.helperId || null,
      setWriterId: data.setWriterId ?? '',
      squadIds: data.squadIds ?? [],
      status: 'ok',
      issues: [],
    };
    setDraft(prev => {
      if (!prev) return [newRow];
      const updated = [...prev, newRow];
      return updated.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    });
    setAddSessionOpen(false);
  };

  const addFloatRow = (data: { sessionDate: string; startTime: string; endTime: string; coachId: string; locationId: string; notes?: string }) => {
    const newRow: DraftRow = {
      id: `float-${Date.now()}`,
      type: 'float',
      date: data.sessionDate,
      startTime: data.startTime,
      endTime: data.endTime,
      locationId: data.locationId,
      leadCoachId: '',
      secondCoachId: null,
      helperId: null,
      setWriterId: null,
      squadIds: [],
      coachId: data.coachId,
      notes: data.notes || '',
      status: 'ok',
      issues: [],
    };
    setDraft(prev => {
      if (!prev) return [newRow];
      const updated = [...prev, newRow];
      return updated.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    });
    setAddFloatOpen(false);
  };

  const blockedRows = draft?.filter(r => r.type === 'session' && !r.leadCoachId) ?? [];
  const sessionRows = draft?.filter(r => r.type === 'session') ?? [];
  const floatRows = draft?.filter(r => r.type === 'float') ?? [];

  const confirmCreate = async () => {
    if (!draft) return;
    setCreating(true);
    try {
      for (const row of sessionRows) {
        if (!row.leadCoachId) continue;
        const startH = parseInt(row.startTime.split(':')[0]);
        const startM = parseInt(row.startTime.split(':')[1]);
        const endH = parseInt(row.endTime.split(':')[0]);
        const endM = parseInt(row.endTime.split(':')[1]);
        const duration = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
        const mainSquad = row.squadIds[0] ?? '';
        const res = await apiRequest('POST', '/api/sessions', {
          sessionDate: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          duration: duration.toFixed(2),
          poolId: row.locationId,
          squadId: mainSquad,
          leadCoachId: row.leadCoachId,
          secondCoachId: row.secondCoachId || null,
          helperId: row.helperId || null,
          setWriterId: row.setWriterId || row.leadCoachId,
          focus: 'Aerobic capacity',
          totalDistance: 0,
          totalFrontCrawlSwim: 0, totalFrontCrawlDrill: 0, totalFrontCrawlKick: 0, totalFrontCrawlPull: 0,
          totalBackstrokeSwim: 0, totalBackstrokeDrill: 0, totalBackstrokeKick: 0, totalBackstrokePull: 0,
          totalBreaststrokeSwim: 0, totalBreaststrokeDrill: 0, totalBreaststrokeKick: 0, totalBreaststrokePull: 0,
          totalButterflySwim: 0, totalButterflyDrill: 0, totalButterflyKick: 0, totalButterflyPull: 0,
          totalIMSwim: 0, totalIMDrill: 0, totalIMKick: 0, totalIMPull: 0,
          totalNo1Swim: 0, totalNo1Drill: 0, totalNo1Kick: 0, totalNo1Pull: 0,
        });
        const created = await res.json();
        // Create session squad links for additional squads
        for (const squadId of row.squadIds) {
          await apiRequest('POST', '/api/session-squads', { sessionId: created.id, squadId }).catch(() => {});
        }
        // Create cover opportunities for vacant roles
        const vacants = [
          ...(row.issues.includes('Lead coach absent') ? [{ role: 'lead' }] : []),
          ...(row.issues.includes('Second coach absent') ? [{ role: 'second' }] : []),
          ...(row.issues.includes('Helper absent') ? [{ role: 'helper' }] : []),
        ];
        const rs = recurringSessions.find(r => r.id === row.recurringId);
        if (rs) {
          for (const v of vacants) {
            const reqCoachId = v.role === 'lead' ? rs.leadCoachId : v.role === 'second' ? rs.secondCoachId : rs.helperId;
            if (reqCoachId) {
              await apiRequest('POST', '/api/cover-opportunities', {
                sessionId: created.id, role: v.role, reason: 'Coach absence', requesterCoachId: reqCoachId,
              }).catch(() => {});
            }
          }
        }
      }
      for (const row of floatRows) {
        await apiRequest('POST', '/api/float-sessions', {
          sessionDate: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          coachId: row.coachId,
          locationId: row.locationId,
          notes: row.notes || null,
        });
      }
      qc.invalidateQueries({ queryKey: ['/api/sessions'] });
      qc.invalidateQueries({ queryKey: ['/api/float-sessions'] });
      qc.invalidateQueries({ queryKey: ['/api/cover-opportunities'] });
      qc.invalidateQueries({ queryKey: ['/api/session-squads'] });
      toast({ title: 'Sessions created', description: `${sessionRows.filter(r => r.leadCoachId).length} sessions and ${floatRows.length} float sessions created.` });
      setDraft(null);
      setConfirmOpen(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error creating sessions', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const activeCoaches = coaches.filter(c => (c as Coach & { recordStatus?: string }).recordStatus !== 'inactive');

  return (
    <div className="space-y-4">
      {/* Time period selector */}
      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Select time period</h3>
        <div className="flex flex-wrap gap-2">
          {(['next_week', 'next_4_weeks', 'custom'] as const).map(opt => (
            <Button
              key={opt}
              variant={period === opt ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt)}
              data-testid={`button-period-${opt}`}
            >
              {opt === 'next_week' ? 'Next Week' : opt === 'next_4_weeks' ? 'Next 4 Weeks' : 'Custom Range'}
            </Button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={customStart} min={today} onChange={e => setCustomStart(e.target.value)} data-testid="input-custom-start" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={customEnd} min={customStart || today} onChange={e => setCustomEnd(e.target.value)} data-testid="input-custom-end" />
            </div>
          </div>
        )}
        {dateRange.start && dateRange.end && (
          <p className="text-sm text-muted-foreground">
            {fmt(dateRange.start)} – {fmt(dateRange.end)} · <span className="font-medium">{previewCount} sessions</span> would be generated
          </p>
        )}
        <Button onClick={generateDraft} disabled={!previewCount && period !== 'custom'} data-testid="button-generate-draft">
          Generate Draft Sessions
        </Button>
      </Card>

      {/* Draft table */}
      {draft !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold">Draft — {draft.length} rows</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddSessionOpen(true)} data-testid="button-add-session-draft">
                <Plus className="h-4 w-4 mr-1" />Add Session
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddFloatOpen(true)} data-testid="button-add-float-draft">
                <Plus className="h-4 w-4 mr-1" />Add Float
              </Button>
              <Button size="sm" onClick={() => setConfirmOpen(true)} data-testid="button-confirm-draft">
                Confirm & Create
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {['Status','Date','Time','Type','Squad(s)','Venue','Lead','Second','Helper',''].map(h => (
                    <th key={h} className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.map(row => (
                  <DraftTableRow
                    key={row.id}
                    row={row}
                    coaches={activeCoaches}
                    squads={squads}
                    locations={locations}
                    onUpdate={(u) => updateRow(row.id, u)}
                    onRemove={() => removeRow(row.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Session modal */}
      <AddDraftSessionModal
        open={addSessionOpen}
        onClose={() => setAddSessionOpen(false)}
        coaches={activeCoaches}
        squads={squads}
        locations={locations}
        onAdd={addSessionRow}
      />

      {/* Add Float Session modal */}
      <AddFloatSessionModal
        open={addFloatOpen}
        onClose={() => setAddFloatOpen(false)}
        coaches={activeCoaches}
        locations={locations}
        onAdd={addFloatRow}
      />

      {/* Confirm modal */}
      <AlertDialog open={confirmOpen} onOpenChange={open => !open && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm & Create Sessions</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{sessionRows.filter(r => r.leadCoachId).length} session{sessionRows.filter(r => r.leadCoachId).length !== 1 ? 's' : ''} and {floatRows.length} float session{floatRows.length !== 1 ? 's' : ''} will be created.</p>
                {blockedRows.length > 0 && (
                  <div className="text-destructive space-y-1">
                    <p className="font-medium">{blockedRows.length} session{blockedRows.length !== 1 ? 's' : ''} will be skipped (no lead coach):</p>
                    {blockedRows.map(r => <p key={r.id} className="text-xs">• {fmt(r.date)} {r.startTime} — {squadN(squads, r.squadIds)}</p>)}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Draft</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreate} disabled={creating || sessionRows.filter(r => r.leadCoachId).length === 0 && floatRows.length === 0}>
              {creating ? 'Creating…' : 'Confirm & Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DraftTableRow({ row, coaches, squads, locations, onUpdate, onRemove }: {
  row: DraftRow; coaches: Coach[]; squads: Squad[]; locations: Location[];
  onUpdate: (u: Partial<DraftRow>) => void; onRemove: () => void;
}) {
  const statusIcon = row.status === 'ok'
    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : row.status === 'warn'
    ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <AlertCircle className="h-4 w-4 text-destructive" />;

  return (
    <tr className="border-t hover:bg-muted/20 transition-colors" data-testid={`row-draft-${row.id}`}>
      <td className="px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{statusIcon}</span>
          </TooltipTrigger>
          <TooltipContent>
            {row.issues.length === 0 ? 'OK' : row.issues.join('; ')}
          </TooltipContent>
        </Tooltip>
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">{fmt(row.date)}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">{row.startTime}–{row.endTime}</td>
      <td className="px-2 py-1.5">
        {row.type === 'float'
          ? <Badge variant="outline" className="text-xs">Float</Badge>
          : <Badge variant="secondary" className="text-xs">Session</Badge>}
      </td>
      <td className="px-2 py-1.5">
        {row.type === 'float'
          ? <span className="text-muted-foreground">{coachN(coaches, row.coachId)}</span>
          : squadN(squads, row.squadIds)}
      </td>
      <td className="px-2 py-1.5">
        <Select value={row.locationId} onValueChange={v => onUpdate({ locationId: v })}>
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      {row.type === 'session' ? (
        <>
          <td className="px-2 py-1.5">
            <Select value={row.leadCoachId || '_vacant'} onValueChange={v => onUpdate({ leadCoachId: v === '_vacant' ? '' : v })}>
              <SelectTrigger className={cn('h-7 text-xs w-32', !row.leadCoachId && 'border-destructive')}>
                <SelectValue placeholder="Vacant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_vacant">Vacant</SelectItem>
                {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </td>
          <td className="px-2 py-1.5">
            <Select value={row.secondCoachId || '_none'} onValueChange={v => onUpdate({ secondCoachId: v === '_none' ? null : v })}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </td>
          <td className="px-2 py-1.5">
            <Select value={row.helperId || '_none'} onValueChange={v => onUpdate({ helperId: v === '_none' ? null : v })}>
              <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-1.5 text-muted-foreground text-xs" colSpan={3}>Float — {coachN(coaches, row.coachId)}</td>
        </>
      )}
      <td className="px-2 py-1.5">
        <Button variant="ghost" size="icon" onClick={onRemove} data-testid={`button-remove-draft-${row.id}`}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

type AddSessionFormData = Omit<DraftRow, 'id' | 'type' | 'status' | 'issues'>;

function AddDraftSessionModal({ open, onClose, coaches, squads, locations, onAdd }: {
  open: boolean; onClose: () => void; coaches: Coach[]; squads: Squad[]; locations: Location[];
  onAdd: (data: AddSessionFormData) => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ date: today, startTime: '', endTime: '', locationId: '', leadCoachId: '', secondCoachId: '', helperId: '', setWriterId: '', squadIds: [] as string[] });

  const handleSquadToggle = (id: string) => setForm(f => ({
    ...f, squadIds: f.squadIds.includes(id) ? f.squadIds.filter(s => s !== id) : [...f.squadIds, id]
  }));

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Session to Draft</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Squads</Label>
            <div className="border rounded-md p-3 space-y-2">
              {squads.map(sq => (
                <label key={sq.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.squadIds.includes(sq.id)} onCheckedChange={() => handleSquadToggle(sq.id)} />
                  <span className="text-sm">{sq.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Venue</Label>
            <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
              <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Lead Coach</Label>
            <Select value={form.leadCoachId} onValueChange={v => setForm(f => ({ ...f, leadCoachId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
              <SelectContent>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Second Coach</Label>
            <Select value={form.secondCoachId} onValueChange={v => setForm(f => ({ ...f, secondCoachId: v === '_none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent><SelectItem value="_none">None</SelectItem>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Helper</Label>
            <Select value={form.helperId} onValueChange={v => setForm(f => ({ ...f, helperId: v === '_none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent><SelectItem value="_none">None</SelectItem>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Set Writer</Label>
            <Select value={form.setWriterId} onValueChange={v => setForm(f => ({ ...f, setWriterId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select set writer" /></SelectTrigger>
              <SelectContent>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAdd(form)}>Add to Draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddFloatFormData = { sessionDate: string; startTime: string; endTime: string; coachId: string; locationId: string; notes?: string };

function AddFloatSessionModal({ open, onClose, coaches, locations, onAdd }: {
  open: boolean; onClose: () => void; coaches: Coach[]; locations: Location[];
  onAdd: (data: AddFloatFormData) => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ sessionDate: today, startTime: '', endTime: '', coachId: '', locationId: '', notes: '' });

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Float Session</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Coach <span className="text-destructive">*</span></Label>
            <Select value={form.coachId} onValueChange={v => setForm(f => ({ ...f, coachId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
              <SelectContent>{coaches.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Location <span className="text-destructive">*</span></Label>
            <Select value={form.locationId} onValueChange={v => setForm(f => ({ ...f, locationId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAdd(form)} disabled={!form.coachId || !form.locationId}>Add Float Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab({ coverOpps, absences, coaches, squads, locations, sessions }: {
  coverOpps: CoverOpportunity[];
  absences: AbsencePeriod[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  sessions: SwimmingSession[];
}) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const pending = coverOpps.filter(o => o.coverStatus === 'pending');
  const upcomingAbsences = absences.filter(a => a.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const recentlyCovered = coverOpps.filter(o => o.coverStatus === 'covered').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  function fmt2(d: string) { try { return format(parseISO(d), 'EEE d MMM yyyy'); } catch { return d; } }

  const getSession = (id: string) => sessions.find(s => s.id === id);
  const getCoach = (id: string | null | undefined) => {
    if (!id) return null;
    return coaches.find(c => c.id === id) ?? null;
  };
  const roleLabel = (r: string) => r === 'lead' ? 'Lead' : r === 'second' ? 'Second' : 'Helper';

  return (
    <div className="space-y-5">
      {/* Pending Cover Requests */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Pending Cover Requests</h3>
          <Badge variant="secondary">{pending.length}</Badge>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending cover requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(opp => {
              const sess = getSession(opp.sessionId);
              const requester = getCoach(opp.requesterCoachId);
              return (
                <div key={opp.id} className="border rounded-md p-3 text-sm space-y-1" data-testid={`alert-pending-${opp.id}`}>
                  {sess ? (
                    <p className="font-medium">{fmt2(sess.sessionDate)} · {sess.startTime.slice(0,5)}–{sess.endTime.slice(0,5)}</p>
                  ) : (
                    <p className="text-muted-foreground">Session not found</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Requesting: {requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown'} · {roleLabel(opp.role)}
                  </p>
                  {opp.reason && <p className="text-xs text-muted-foreground italic">{opp.reason}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Upcoming Absences */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <h3 className="font-semibold text-sm">Upcoming Absences</h3>
          <Badge variant="secondary">{upcomingAbsences.length}</Badge>
        </div>
        {upcomingAbsences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming absences.</p>
        ) : (
          <div className="space-y-2">
            {upcomingAbsences.map(a => {
              const c = getCoach(a.coachId);
              return (
                <div key={a.id} className="border rounded-md p-3 text-sm space-y-1" data-testid={`alert-absence-${a.id}`}>
                  <p className="font-medium">{c ? `${c.firstName} ${c.lastName}` : 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt2(a.startDate)}{a.startDate !== a.endDate ? ` – ${fmt2(a.endDate)}` : ''}
                    {a.absenceType === 'specific_times' && a.startTime && a.endTime
                      ? ` · ${a.startTime.slice(0,5)}–${a.endTime.slice(0,5)}`
                      : ' · All day'}
                  </p>
                  {a.reason && <p className="text-xs text-muted-foreground italic">{a.reason}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recently Covered */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h3 className="font-semibold text-sm">Recently Covered</h3>
        </div>
        {recentlyCovered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recently covered sessions.</p>
        ) : (
          <div className="space-y-2">
            {recentlyCovered.map(opp => {
              const sess = getSession(opp.sessionId);
              const requester = getCoach(opp.requesterCoachId);
              const cover = getCoach(opp.coverCoachId);
              return (
                <div key={opp.id} className="border rounded-md p-3 text-sm space-y-1" data-testid={`alert-covered-${opp.id}`}>
                  {sess && <p className="font-medium">{fmt2(sess.sessionDate)} · {sess.startTime.slice(0,5)}</p>}
                  <p className="text-xs text-muted-foreground">
                    {requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown'} covered by {cover ? `${cover.firstName} ${cover.lastName}` : 'Unknown'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
