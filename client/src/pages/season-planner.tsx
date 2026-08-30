import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, CalendarRange, Check, Edit2, Plus, Save, Trash2,
} from "lucide-react";
import type { SeasonPlanEntry } from "@shared/schema";
import type { Squad } from "@/lib/typeAdapters";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PHASES = [
  "General Prep", "Build", "Race Prep", "Race Week",
  "Recovery", "Maintenance", "Speed",
] as const;
const INTENSITIES = [
  "1 - Recovery", "2 - Low", "3 - Moderate", "4 - High", "5 - Maximum",
] as const;

type SeasonPlanRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  entries: SeasonPlanEntry[];
  squadIds: string[];
  createdByUserId: string;
  creatorName: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
};

interface SeasonPlannerProps {
  squads: Squad[];
  onBack: () => void;
}

function displayDate(date: string) {
  try {
    return format(new Date(`${date}T12:00:00`), "EEE d MMM");
  } catch {
    return date;
  }
}

function displayTime(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return "All day";
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SeasonPlanner({ squads, onBack }: SeasonPlannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SeasonPlanRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [squadFilter, setSquadFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [weekFilter, setWeekFilter] = useState("all");
  const [createForm, setCreateForm] = useState({
    name: "",
    startDate: "2026-09-01",
    endDate: "2027-07-31",
    squadIds: [] as string[],
  });
  const [manualForm, setManualForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    squadId: "",
    mainFocus: "",
    notes: "",
  });

  const { data: plans = [], isLoading } = useQuery<SeasonPlanRecord[]>({
    queryKey: ["/api/season-plans"],
  });

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  useEffect(() => {
    const plan = plans.find(item => item.id === selectedPlanId);
    setDraft(plan ? structuredClone(plan) : null);
  }, [plans, selectedPlanId]);

  const canEdit = Boolean(draft && (user?.role === "admin" || draft.createdByUserId === user?.id));
  const activeEntries = draft?.entries.filter(entry => !entry.removed) || [];
  const weeks = useMemo(
    () => Array.from(new Set(activeEntries.map(entry => entry.trainingWeek))).sort((a, b) => a - b),
    [activeEntries],
  );
  const filteredEntries = useMemo(() => activeEntries.filter(entry =>
    (squadFilter === "all" || entry.squadIds.includes(squadFilter)) &&
    (phaseFilter === "all" || entry.trainingPhase === phaseFilter) &&
    (weekFilter === "all" || entry.trainingWeek === Number(weekFilter)),
  ), [activeEntries, squadFilter, phaseFilter, weekFilter]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/season-plans", createForm);
      return response.json() as Promise<SeasonPlanRecord>;
    },
    onSuccess: async plan => {
      await queryClient.invalidateQueries({ queryKey: ["/api/season-plans"] });
      setSelectedPlanId(plan.id);
      setCreateOpen(false);
      setCreateForm(form => ({ ...form, name: "", squadIds: [] }));
      toast({ title: "Season plan created", description: `${plan.name} is ready to edit.` });
    },
    onError: (error: Error) => toast({ title: "Could not create plan", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No plan selected");
      const response = await apiRequest("PATCH", `/api/season-plans/${draft.id}`, {
        name: draft.name,
        entries: draft.entries,
        version: draft.version,
      });
      return response.json() as Promise<SeasonPlanRecord>;
    },
    onSuccess: async plan => {
      await queryClient.invalidateQueries({ queryKey: ["/api/season-plans"] });
      setDraft(structuredClone(plan));
      toast({ title: "Season plan saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save plan", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No plan selected");
      await apiRequest("DELETE", `/api/season-plans/${draft.id}`);
    },
    onSuccess: async () => {
      setSelectedPlanId(null);
      setDraft(null);
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/season-plans"] });
      toast({ title: "Season plan deleted" });
    },
    onError: (error: Error) => toast({ title: "Could not delete plan", description: error.message, variant: "destructive" }),
  });

  const updateEntry = (entryId: string, patch: Partial<SeasonPlanEntry>) => {
    if (!canEdit) return;
    setDraft(current => current ? {
      ...current,
      entries: current.entries.map(entry => entry.id === entryId ? { ...entry, ...patch } : entry),
    } : current);
  };

  const toggleCreateSquad = (squadId: string) => {
    setCreateForm(form => ({
      ...form,
      squadIds: form.squadIds.includes(squadId)
        ? form.squadIds.filter(id => id !== squadId)
        : [...form.squadIds, squadId],
    }));
  };

  const addManualEntry = () => {
    if (!draft || !manualForm.date || !manualForm.squadId || !manualForm.startTime || !manualForm.endTime) {
      toast({ title: "Complete the manual entry", description: "Date, times, and squad are required.", variant: "destructive" });
      return;
    }
    const start = new Date(`${draft.startDate}T00:00:00`).getTime();
    const current = new Date(`${manualForm.date}T00:00:00`).getTime();
    const trainingWeek = Math.floor((current - start) / (7 * 86400000)) + 1;
    const entry: SeasonPlanEntry = {
      id: makeId(),
      squadIds: [manualForm.squadId],
      date: manualForm.date,
      startTime: manualForm.startTime,
      endTime: manualForm.endTime,
      type: "manual",
      trainingWeek: Math.max(1, trainingWeek),
      sourceRecurringSessionId: null,
      competitionId: null,
      competitionEvent: "",
      trainingPhase: "",
      intensity: "",
      mainFocus: manualForm.mainFocus,
      secondaryFocus: "",
      testSet: false,
      notes: manualForm.notes,
      holidayName: null,
      isInHoliday: false,
      removed: false,
      locationId: null,
    };
    setDraft({ ...draft, entries: [...draft.entries, entry] });
    setManualOpen(false);
    setManualForm({ date: "", startTime: "", endTime: "", squadId: "", mainFocus: "", notes: "" });
  };

  return (
    <div className="h-full">
      <div className="lg:hidden h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center">
          <CalendarRange className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Season Planner is desktop-only</h2>
          <p className="text-sm text-muted-foreground mt-2">Open Swim Squad on a desktop or laptop to create and edit full season plans.</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>Back to home</Button>
        </Card>
      </div>

      <div className="hidden lg:flex h-full min-h-[650px] border rounded-xl bg-card overflow-hidden" data-testid="season-planner">
        <aside className="w-64 shrink-0 border-r bg-muted/20 p-4 flex flex-col">
          <Button variant="ghost" className="justify-start mb-4 -ml-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2 mb-1">
            <CalendarRange className="h-5 w-5" style={{ color: "var(--club-primary)" }} />
            <h1 className="font-semibold">Season Planner</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Snapshot plans built from the Standard Schedule.</p>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-season-plan">
            <Plus className="h-4 w-4 mr-2" /> New plan
          </Button>
          <div className="mt-5 space-y-2 overflow-y-auto">
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedPlanId === plan.id ? "bg-background border-primary" : "bg-card hover:bg-accent"
                }`}
                data-testid={`button-plan-${plan.id}`}
              >
                <div className="font-medium text-sm truncate">{plan.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{plan.startDate} – {plan.endDate}</div>
                <div className="text-xs text-muted-foreground mt-1">{plan.squadIds.length} squad{plan.squadIds.length === 1 ? "" : "s"}</div>
              </button>
            ))}
            {!isLoading && plans.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">No season plans yet.</div>
            )}
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          {draft ? (
            <>
              <header className="border-b p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {canEdit ? (
                      <Input
                        value={draft.name}
                        onChange={event => setDraft({ ...draft, name: event.target.value })}
                        className="text-xl font-semibold h-10 max-w-xl"
                        data-testid="input-plan-name"
                      />
                    ) : (
                      <h2 className="text-xl font-semibold truncate">{draft.name}</h2>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {draft.startDate} to {draft.endDate} · Created by {draft.creatorName}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">School holidays use an England 2026/27 baseline; local dates may vary.</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" onClick={() => setManualOpen(true)} data-testid="button-add-manual-entry">
                        <Plus className="h-4 w-4 mr-2" /> Manual entry
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteOpen(true)} data-testid="button-delete-season-plan">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !draft.name.trim()} data-testid="button-save-season-plan">
                        <Save className="h-4 w-4 mr-2" /> Save
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 max-w-3xl">
                  <Select value={squadFilter} onValueChange={setSquadFilter}>
                    <SelectTrigger data-testid="select-plan-squad-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All squads</SelectItem>
                      {draft.squadIds.map(id => <SelectItem key={id} value={id}>{squads.find(s => s.id === id)?.name || "Unknown squad"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={weekFilter} onValueChange={setWeekFilter}>
                    <SelectTrigger data-testid="select-plan-week-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All training weeks</SelectItem>
                      {weeks.map(week => <SelectItem key={week} value={String(week)}>Week {week}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                    <SelectTrigger data-testid="select-plan-phase-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All phases</SelectItem>
                      {PHASES.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </header>

              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[1480px] text-sm">
                  <thead className="sticky top-0 bg-muted z-10 text-left">
                    <tr>
                      {["Date", "Squad", "Time", "Week", "Competition / holiday", "Phase", "Intensity", "Main focus", "Secondary focus", "Test set", "Notes", ""].map(label => (
                        <th key={label} className="px-3 py-3 font-medium border-b">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className={`${entry.competitionEvent ? "bg-blue-50/60" : entry.isInHoliday ? "bg-amber-50/70" : ""} border-b align-top`}>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-medium">{displayDate(entry.date)}</div>
                          {entry.type !== "session" && <Badge variant="outline" className="mt-1 text-[10px]">{entry.type}</Badge>}
                        </td>
                        <td className="px-3 py-3 max-w-[170px]">{entry.squadIds.map(id => squads.find(s => s.id === id)?.name || "Unknown").join(", ")}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{displayTime(entry.startTime, entry.endTime)}</td>
                        <td className="px-3 py-3">W{entry.trainingWeek}</td>
                        <td className="px-3 py-3 min-w-[190px]">
                          {entry.competitionEvent && <Badge className="mb-1 bg-blue-600">{entry.competitionEvent}</Badge>}
                          {entry.holidayName && <div className="text-xs text-amber-800">{entry.holidayName}</div>}
                          {!entry.competitionEvent && !entry.holidayName && "—"}
                        </td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <Select disabled={!canEdit || entry.type === "holiday"} value={entry.trainingPhase || "none"} onValueChange={value => updateEntry(entry.id, { trainingPhase: value === "none" ? "" : value as SeasonPlanEntry["trainingPhase"] })}>
                            <SelectTrigger><SelectValue placeholder="Choose phase" /></SelectTrigger>
                            <SelectContent><SelectItem value="none">Not set</SelectItem>{PHASES.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 min-w-[150px]">
                          <Select disabled={!canEdit || entry.type === "holiday"} value={entry.intensity || "none"} onValueChange={value => updateEntry(entry.id, { intensity: value === "none" ? "" : value as SeasonPlanEntry["intensity"] })}>
                            <SelectTrigger><SelectValue placeholder="Intensity" /></SelectTrigger>
                            <SelectContent><SelectItem value="none">Not set</SelectItem>{INTENSITIES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 min-w-[180px]"><Input disabled={!canEdit || entry.type === "holiday"} value={entry.mainFocus} onChange={event => updateEntry(entry.id, { mainFocus: event.target.value })} /></td>
                        <td className="px-3 py-2 min-w-[180px]"><Input disabled={!canEdit || entry.type === "holiday"} value={entry.secondaryFocus} onChange={event => updateEntry(entry.id, { secondaryFocus: event.target.value })} /></td>
                        <td className="px-3 py-3 text-center"><Checkbox disabled={!canEdit || entry.type === "holiday"} checked={entry.testSet} onCheckedChange={checked => updateEntry(entry.id, { testSet: checked === true })} /></td>
                        <td className="px-3 py-2 min-w-[220px]"><Textarea disabled={!canEdit} value={entry.notes} onChange={event => updateEntry(entry.id, { notes: event.target.value })} className="min-h-9 h-9 resize-y" /></td>
                        <td className="px-3 py-2">
                          {canEdit && <Button variant="ghost" size="icon" onClick={() => updateEntry(entry.id, { removed: true })} title="Remove row"><Trash2 className="h-4 w-4" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEntries.length === 0 && <div className="p-12 text-center text-muted-foreground">No planner entries match these filters.</div>}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-10">
              <div>
                <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <h2 className="font-semibold">Create your first season plan</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">Choose squads and dates to snapshot their Standard Schedule without creating calendar sessions.</p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> New plan</Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create season plan</DialogTitle>
            <DialogDescription>This snapshots matching Standard Schedule slots. It will not create or edit calendar sessions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="plan-name">Plan name</Label><Input id="plan-name" value={createForm.name} onChange={event => setCreateForm({ ...createForm, name: event.target.value })} placeholder="2026/27 Performance Season" data-testid="input-create-plan-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={createForm.startDate} onChange={event => setCreateForm({ ...createForm, startDate: event.target.value })} data-testid="input-create-plan-start" /></div>
              <div><Label>End date</Label><Input type="date" min={createForm.startDate} value={createForm.endDate} onChange={event => setCreateForm({ ...createForm, endDate: event.target.value })} data-testid="input-create-plan-end" /></div>
            </div>
            <div>
              <Label>Squads</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 mt-1 max-h-48 overflow-y-auto">
                {squads.map(squad => (
                  <label key={squad.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={createForm.squadIds.includes(squad.id)} onCheckedChange={() => toggleCreateSquad(squad.id)} />
                    {squad.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!createForm.name.trim() || createForm.squadIds.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()} data-testid="button-confirm-create-plan">
              <Check className="h-4 w-4 mr-2" /> Generate plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add manual entry</DialogTitle><DialogDescription>Add a planning row without creating a real swimming session.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" min={draft?.startDate} max={draft?.endDate} value={manualForm.date} onChange={event => setManualForm({ ...manualForm, date: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start time</Label><Input type="time" value={manualForm.startTime} onChange={event => setManualForm({ ...manualForm, startTime: event.target.value })} /></div>
              <div><Label>End time</Label><Input type="time" value={manualForm.endTime} onChange={event => setManualForm({ ...manualForm, endTime: event.target.value })} /></div>
            </div>
            <div><Label>Squad</Label><Select value={manualForm.squadId} onValueChange={squadId => setManualForm({ ...manualForm, squadId })}><SelectTrigger><SelectValue placeholder="Select squad" /></SelectTrigger><SelectContent>{draft?.squadIds.map(id => <SelectItem key={id} value={id}>{squads.find(s => s.id === id)?.name || "Unknown squad"}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Main focus</Label><Input value={manualForm.mainFocus} onChange={event => setManualForm({ ...manualForm, mainFocus: event.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={manualForm.notes} onChange={event => setManualForm({ ...manualForm, notes: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button><Button onClick={addManualEntry}>Add entry</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this season plan?</AlertDialogTitle><AlertDialogDescription>The plan will be removed from planner and session detail views. Calendar sessions are not affected.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete plan</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}