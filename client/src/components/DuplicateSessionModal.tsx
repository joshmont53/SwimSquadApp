import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, ChevronDown, X, Loader2, FilePlus, FileCheck, AlertTriangle, Search, CheckSquare, Square } from "lucide-react";
import { format, parseISO, isToday, isFuture } from "date-fns";
import type { SwimmingSession, Squad, Coach, Location } from "@shared/schema";

type SessionFocus = 'Aerobic capacity' | 'Anaerobic capacity' | 'Speed' | 'Technique' | 'Recovery' | 'Starts & turns';

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

type Step = 'choice' | 'new' | 'existing';

interface DuplicateSessionModalProps {
  session: SwimmingSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: (newSessionId: string) => void;
}

export function DuplicateSessionModal({ session, open, onOpenChange, onDuplicated }: DuplicateSessionModalProps) {
  const { toast } = useToast();
  const { data: squads = [] } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: coaches = [] } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const { data: locations = [] } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const { data: allSessions = [] } = useQuery<SwimmingSession[]>({ queryKey: ["/api/sessions"] });
  const { data: allSessionSquads = [] } = useQuery<{ id: string; sessionId: string; squadId: string; recordStatus: string }[]>({
    queryKey: ["/api/session-squads"],
  });

  const activeSquads = squads.filter(s => s.recordStatus === "active");
  const activeCoaches = coaches.filter(c => c.recordStatus === "active");
  const activeLocations = locations.filter(l => l.recordStatus === "active");

  // Step management
  const [step, setStep] = useState<Step>('choice');

  // ── New session state ──
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState(session.sessionDate);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [locationId, setLocationId] = useState(session.poolId);
  const [focus, setFocus] = useState(session.focus);
  const [leadCoachId, setLeadCoachId] = useState(session.leadCoachId);
  const [secondCoachId, setSecondCoachId] = useState(session.secondCoachId || "none");
  const [helperId, setHelperId] = useState(session.helperId || "none");
  const [setWriterId, setSetWriterId] = useState(session.setWriterId);
  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const squadDropdownRef = useRef<HTMLDivElement>(null);

  // ── Existing session state ──
  const [searchText, setSearchText] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  // Reset everything when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('choice');
      setSquadIds([]);
      setSessionDate(session.sessionDate);
      setStartTime(session.startTime);
      setEndTime(session.endTime);
      setLocationId(session.poolId);
      setFocus(session.focus);
      setLeadCoachId(session.leadCoachId);
      setSecondCoachId(session.secondCoachId || "none");
      setHelperId(session.helperId || "none");
      setSetWriterId(session.setWriterId);
      setSquadDropdownOpen(false);
      setSearchText("");
      setSquadFilter("all");
      setSelectedTargetIds([]);
    }
  }, [open, session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target as Node)) {
        setSquadDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Squad multi-select helpers ──
  const toggleSquad = (squadId: string) => {
    setSquadIds(prev => prev.includes(squadId) ? prev.filter(id => id !== squadId) : [...prev, squadId]);
  };
  const removeSquad = (squadId: string) => {
    setSquadIds(prev => prev.filter(id => id !== squadId));
  };

  // ── Build session-squad lookup ──
  const sessionSquadMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ss of allSessionSquads) {
      if (!map[ss.sessionId]) map[ss.sessionId] = [];
      map[ss.sessionId].push(ss.squadId);
    }
    return map;
  }, [allSessionSquads]);

  // ── Future sessions list (excluding source) ──
  const futureSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allSessions
      .filter(s => {
        if (s.id === session.id) return false;
        if (s.recordStatus && s.recordStatus !== 'active') return false;
        const d = parseISO(s.sessionDate);
        return isToday(d) || isFuture(d);
      })
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));
  }, [allSessions, session.id]);

  // ── Filtered list ──
  const filteredSessions = useMemo(() => {
    return futureSessions.filter(s => {
      const squadIds = sessionSquadMap[s.id] || (s.squadId ? [s.squadId] : []);
      if (squadFilter !== "all" && !squadIds.includes(squadFilter)) return false;
      if (searchText.trim()) {
        const lower = searchText.toLowerCase();
        const dateStr = format(parseISO(s.sessionDate), "EEE d MMM yyyy").toLowerCase();
        const squadNames = squadIds
          .map(id => squads.find(sq => sq.id === id)?.squadName || "")
          .join(" ")
          .toLowerCase();
        const timeStr = s.startTime.toLowerCase();
        if (!dateStr.includes(lower) && !squadNames.includes(lower) && !timeStr.includes(lower)) return false;
      }
      return true;
    });
  }, [futureSessions, squadFilter, searchText, sessionSquadMap, squads]);

  // ── Sessions that already have content ──
  const selectedWithContent = useMemo(() => {
    return selectedTargetIds.filter(id => {
      const s = allSessions.find(x => x.id === id);
      return s && s.sessionContent && s.sessionContent.trim().length > 0;
    });
  }, [selectedTargetIds, allSessions]);

  const toggleTarget = (id: string) => {
    setSelectedTargetIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedTargetIds.length === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedTargetIds([]);
    } else {
      setSelectedTargetIds(filteredSessions.map(s => s.id));
    }
  };

  // ── Mutations ──
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${session.id}/duplicate`, {
        squadIds,
        sessionDate,
        startTime,
        endTime,
        locationId,
        focus,
        leadCoachId,
        secondCoachId: secondCoachId !== "none" ? secondCoachId : null,
        helperId: helperId !== "none" ? helperId : null,
        setWriterId,
      });
      return res.json();
    },
    onSuccess: (newSession: SwimmingSession) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/session-squads"] });
      toast({
        title: "Session Duplicated",
        description: `Session has been duplicated to ${squadIds.length} squad${squadIds.length > 1 ? "s" : ""}.`,
      });
      onOpenChange(false);
      if (onDuplicated) onDuplicated(newSession.id);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to duplicate session", variant: "destructive" });
    },
  });

  const copyContentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${session.id}/copy-content`, {
        targetSessionIds: selectedTargetIds,
      });
      return res.json();
    },
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Content Copied",
        description: `Session content copied to ${data.updated} session${data.updated !== 1 ? "s" : ""}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to copy content", variant: "destructive" });
    },
  });

  const canSubmitNew = squadIds.length > 0 && sessionDate && startTime && endTime && locationId && focus && leadCoachId && setWriterId;

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  // Step 0: Choice
  if (step === 'choice') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Session
            </DialogTitle>
            <DialogDescription>
              How would you like to use this session's content?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <button
              type="button"
              onClick={() => setStep('new')}
              className="flex items-start gap-4 rounded-md border p-4 text-left hover-elevate transition-colors"
              data-testid="duplicate-choice-new"
            >
              <FilePlus className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">New session</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create a brand-new session with this content copied in. You'll fill in the squad, date, time, and coaches.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStep('existing')}
              className="flex items-start gap-4 rounded-md border p-4 text-left hover-elevate transition-colors"
              data-testid="duplicate-choice-existing"
            >
              <FileCheck className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Existing session</p>
                <p className="text-xs text-muted-foreground mt-0.5">Copy this content into one or more sessions that have already been scheduled. Their existing content will be replaced.</p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="duplicate-button-cancel">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1a: New session (existing flow, unchanged)
  if (step === 'new') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Session — New Session
            </DialogTitle>
            <DialogDescription>
              Create a copy of this session. All content and distances will be copied. Adjust the details below as needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Squad(s) */}
            <div className="space-y-2">
              <Label>Squad(s) <span className="text-destructive">*</span></Label>
              <div ref={squadDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
                  className="flex items-center justify-between w-full min-h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="duplicate-select-squad"
                >
                  <span className="text-muted-foreground">
                    {squadIds.length === 0 ? "Select squad(s)" : `${squadIds.length} squad${squadIds.length > 1 ? "s" : ""} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                {squadDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                    {activeSquads.map((squad) => (
                      <button
                        key={squad.id}
                        type="button"
                        onClick={() => toggleSquad(squad.id)}
                        className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
                        data-testid={`duplicate-option-squad-${squad.id}`}
                      >
                        <div
                          className="h-4 w-4 rounded-sm border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: squadIds.includes(squad.id) ? (squad.color || "hsl(var(--primary))") : "transparent",
                            borderColor: squad.color || "hsl(var(--primary))",
                          }}
                        >
                          {squadIds.includes(squad.id) && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                        {squad.squadName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {squadIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {squadIds.map((squadId) => {
                    const squad = activeSquads.find(s => s.id === squadId);
                    if (!squad) return null;
                    return (
                      <Badge key={squadId} variant="secondary" className="gap-1" data-testid={`duplicate-badge-squad-${squadId}`}>
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                        {squad.squadName}
                        <button type="button" onClick={() => removeSquad(squadId)} className="ml-0.5" data-testid={`duplicate-remove-squad-${squadId}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-date">Date <span className="text-destructive">*</span></Label>
              <Input id="duplicate-date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} data-testid="duplicate-input-date" />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="duplicate-start">Start Time <span className="text-destructive">*</span></Label>
                <Input id="duplicate-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} data-testid="duplicate-input-start-time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duplicate-end">End Time <span className="text-destructive">*</span></Label>
                <Input id="duplicate-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} data-testid="duplicate-input-end-time" />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-location">Location <span className="text-destructive">*</span></Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="duplicate-location" data-testid="duplicate-select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.poolName} ({loc.poolType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Focus */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-focus">Session Focus <span className="text-destructive">*</span></Label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger id="duplicate-focus" data-testid="duplicate-select-focus">
                  <SelectValue placeholder="Select focus" />
                </SelectTrigger>
                <SelectContent>
                  {sessionFocusOptions.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Coach */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-lead-coach">Lead Coach <span className="text-destructive">*</span></Label>
              <Select value={leadCoachId} onValueChange={setLeadCoachId}>
                <SelectTrigger id="duplicate-lead-coach" data-testid="duplicate-select-lead-coach">
                  <SelectValue placeholder="Select lead coach" />
                </SelectTrigger>
                <SelectContent>
                  {activeCoaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Second Coach */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-second-coach">Second Coach (Optional)</Label>
              <Select value={secondCoachId} onValueChange={setSecondCoachId}>
                <SelectTrigger id="duplicate-second-coach" data-testid="duplicate-select-second-coach">
                  <SelectValue placeholder="Select second coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeCoaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Helper */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-helper">Helper (Optional)</Label>
              <Select value={helperId} onValueChange={setHelperId}>
                <SelectTrigger id="duplicate-helper" data-testid="duplicate-select-helper">
                  <SelectValue placeholder="Select helper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeCoaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Set Writer */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-set-writer">Set Writer <span className="text-destructive">*</span></Label>
              <Select value={setWriterId} onValueChange={setSetWriterId}>
                <SelectTrigger id="duplicate-set-writer" data-testid="duplicate-select-set-writer">
                  <SelectValue placeholder="Select set writer" />
                </SelectTrigger>
                <SelectContent>
                  {activeCoaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStep('choice')} disabled={duplicateMutation.isPending} data-testid="duplicate-button-back">
              Back
            </Button>
            <Button
              onClick={() => duplicateMutation.mutate()}
              disabled={!canSubmitNew || duplicateMutation.isPending}
              data-testid="duplicate-button-confirm"
            >
              {duplicateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Duplicating...</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" />Duplicate Session</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1b: Existing session picker
  const allFilteredSelected = filteredSessions.length > 0 && filteredSessions.every(s => selectedTargetIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Copy Content to Existing Sessions
          </DialogTitle>
          <DialogDescription>
            Select one or more upcoming sessions to copy this content into. Any existing content on the selected sessions will be replaced.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 px-6">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search date, squad, time..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              data-testid="existing-search-input"
            />
          </div>
          <Select value={squadFilter} onValueChange={setSquadFilter}>
            <SelectTrigger className="w-40" data-testid="existing-select-squad-filter">
              <SelectValue placeholder="All squads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All squads</SelectItem>
              {activeSquads.map(sq => (
                <SelectItem key={sq.id} value={sq.id}>{sq.squadName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warning if selected sessions already have content */}
        {selectedWithContent.length > 0 && (
          <div className="mx-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span>
              {selectedWithContent.length} selected session{selectedWithContent.length > 1 ? "s" : ""} already {selectedWithContent.length > 1 ? "have" : "has"} content — it will be overwritten when you confirm.
            </span>
          </div>
        )}

        {/* Select all row */}
        {filteredSessions.length > 0 && (
          <div className="mx-6 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="existing-toggle-all"
            >
              {allFilteredSelected
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedTargetIds.length} selected · {filteredSessions.length} shown
            </span>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {filteredSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {futureSessions.length === 0
                ? "No upcoming sessions found."
                : "No sessions match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredSessions.map(s => {
                const sSquadIds = sessionSquadMap[s.id] || (s.squadId ? [s.squadId] : []);
                const squadLabels = sSquadIds
                  .map(id => squads.find(sq => sq.id === id))
                  .filter(Boolean)
                  .map(sq => sq!.squadName)
                  .join(" / ");
                const hasContent = !!(s.sessionContent && s.sessionContent.trim().length > 0);
                const isSelected = selectedTargetIds.includes(s.id);
                const squadColors = sSquadIds
                  .map(id => squads.find(sq => sq.id === id)?.color)
                  .filter(Boolean);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleTarget(s.id)}
                    className={`flex items-center gap-3 w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors hover-elevate ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-transparent"
                    }`}
                    data-testid={`existing-session-row-${s.id}`}
                  >
                    {/* Checkbox */}
                    <div
                      className="h-4 w-4 rounded-sm border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", backgroundColor: isSelected ? "hsl(var(--primary))" : "transparent" }}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Squad colour dots */}
                    <div className="flex gap-0.5 shrink-0">
                      {squadColors.length > 0
                        ? squadColors.map((color, i) => (
                            <div key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: color as string }} />
                          ))
                        : <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{squadLabels || "Unknown squad"}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(s.sessionDate), "EEE d MMM yyyy")} · {s.startTime}
                      </div>
                    </div>

                    {/* Has content indicator */}
                    {hasContent && (
                      <Badge variant="secondary" className="text-xs shrink-0">Has content</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setStep('choice')} disabled={copyContentMutation.isPending} data-testid="existing-button-back">
            Back
          </Button>
          <Button
            onClick={() => copyContentMutation.mutate()}
            disabled={selectedTargetIds.length === 0 || copyContentMutation.isPending}
            data-testid="existing-button-confirm"
          >
            {copyContentMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Copying...</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" />Copy to {selectedTargetIds.length} Session{selectedTargetIds.length !== 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
