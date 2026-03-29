import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, X, ChevronDown } from 'lucide-react';
import type { Session, SessionFocus, Squad, Location, Coach } from '../lib/typeAdapters';

interface AddSessionProps {
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  onSave: (session: Omit<Session, 'id'>) => void;
  onCancel: () => void;
}

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

export function AddSession({ squads, locations, coaches, onSave, onCancel }: AddSessionProps) {
  const [formData, setFormData] = useState<{
    squadIds: string[];
    locationId: string;
    leadCoachId: string;
    secondCoachId: string;
    helperId: string;
    setWriterId: string;
    date: string;
    startTime: string;
    endTime: string;
    focus: SessionFocus | '';
  }>({
    squadIds: [],
    locationId: '',
    leadCoachId: '',
    secondCoachId: 'none',
    helperId: 'none',
    setWriterId: '',
    date: '',
    startTime: '',
    endTime: '',
    focus: '',
  });

  const [squadDropdownOpen, setSquadDropdownOpen] = useState(false);
  const squadDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target as Node)) {
        setSquadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSquad = (squadId: string) => {
    setFormData(prev => ({
      ...prev,
      squadIds: prev.squadIds.includes(squadId)
        ? prev.squadIds.filter(id => id !== squadId)
        : [...prev.squadIds, squadId],
    }));
  };

  const removeSquad = (squadId: string) => {
    setFormData(prev => ({
      ...prev,
      squadIds: prev.squadIds.filter(id => id !== squadId),
    }));
  };

  const isFormValid = () => {
    return (
      formData.squadIds.length > 0 &&
      formData.locationId &&
      formData.leadCoachId &&
      formData.setWriterId &&
      formData.date &&
      formData.startTime &&
      formData.endTime &&
      formData.focus
    );
  };

  const handleSave = () => {
    if (!isFormValid()) return;

    const sessionData: Omit<Session, 'id'> = {
      squadId: formData.squadIds[0],
      squadIds: formData.squadIds,
      locationId: formData.locationId,
      leadCoachId: formData.leadCoachId,
      secondCoachId: formData.secondCoachId !== 'none' ? formData.secondCoachId : undefined,
      helperId: formData.helperId !== 'none' ? formData.helperId : undefined,
      setWriterId: formData.setWriterId,
      date: new Date(formData.date),
      startTime: formData.startTime,
      endTime: formData.endTime,
      focus: formData.focus as SessionFocus,
    };

    onSave(sessionData);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden" data-testid="view-add-session">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-4 flex items-center justify-between" style={{ borderBottomColor: 'var(--club-primary)' }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Add New Session</h1>
        </div>
        {/* Desktop only button */}
        <Button onClick={handleSave} disabled={!isFormValid()} className="hidden md:flex" data-testid="button-save-desktop">
          <Save className="h-4 w-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Session Details</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Fill in all required fields to create a new session
            </p>

              <div className="space-y-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="input-date"
                  />
                </div>

                {/* Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">
                      Start Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">
                      End Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>

                {/* Squad(s) */}
                <div className="space-y-2">
                  <Label>
                    Squad(s) <span className="text-destructive">*</span>
                  </Label>
                  <div ref={squadDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setSquadDropdownOpen(!squadDropdownOpen)}
                      className="flex items-center justify-between w-full min-h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid="select-squad"
                    >
                      <span className="text-muted-foreground">
                        {formData.squadIds.length === 0
                          ? "Select squad(s)"
                          : `${formData.squadIds.length} squad${formData.squadIds.length > 1 ? 's' : ''} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </button>
                    {squadDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                        {squads.map((squad) => (
                          <button
                            key={squad.id}
                            type="button"
                            onClick={() => toggleSquad(squad.id)}
                            className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
                            data-testid={`option-squad-${squad.id}`}
                          >
                            <div
                              className="h-4 w-4 rounded-sm border flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: formData.squadIds.includes(squad.id) ? squad.color : 'transparent',
                                borderColor: squad.color,
                              }}
                            >
                              {formData.squadIds.includes(squad.id) && (
                                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                            <span>{squad.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.squadIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {formData.squadIds.map((squadId) => {
                        const squad = squads.find(s => s.id === squadId);
                        if (!squad) return null;
                        return (
                          <Badge
                            key={squadId}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-squad-${squadId}`}
                          >
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: squad.color }} />
                            {squad.name}
                            <button
                              type="button"
                              onClick={() => removeSquad(squadId)}
                              className="ml-0.5"
                              data-testid={`button-remove-squad-${squadId}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger id="location" data-testid="select-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} ({location.poolType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Focus */}
                <div className="space-y-2">
                  <Label htmlFor="focus">
                    Session Focus <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.focus}
                    onValueChange={(value) => setFormData({ ...formData, focus: value as SessionFocus })}
                  >
                    <SelectTrigger id="focus" data-testid="select-focus">
                      <SelectValue placeholder="Select focus" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionFocusOptions.map((focus) => (
                        <SelectItem key={focus} value={focus}>
                          {focus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Coach */}
                <div className="space-y-2">
                  <Label htmlFor="leadCoach">
                    Lead Coach <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.leadCoachId}
                    onValueChange={(value) => setFormData({ ...formData, leadCoachId: value })}
                  >
                    <SelectTrigger id="leadCoach" data-testid="select-lead-coach">
                      <SelectValue placeholder="Select lead coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Second Coach */}
                <div className="space-y-2">
                  <Label htmlFor="secondCoach">Second Coach (Optional)</Label>
                  <Select
                    value={formData.secondCoachId}
                    onValueChange={(value) => setFormData({ ...formData, secondCoachId: value })}
                  >
                    <SelectTrigger id="secondCoach" data-testid="select-second-coach">
                      <SelectValue placeholder="Select second coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Helper */}
                <div className="space-y-2">
                  <Label htmlFor="helper">Helper (Optional)</Label>
                  <Select
                    value={formData.helperId}
                    onValueChange={(value) => setFormData({ ...formData, helperId: value })}
                  >
                    <SelectTrigger id="helper" data-testid="select-helper">
                      <SelectValue placeholder="Select helper" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Set Writer */}
                <div className="space-y-2">
                  <Label htmlFor="setWriter">
                    Set Writer <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.setWriterId}
                    onValueChange={(value) => setFormData({ ...formData, setWriterId: value })}
                  >
                    <SelectTrigger id="setWriter" data-testid="select-set-writer">
                      <SelectValue placeholder="Select set writer" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
              
              {/* Mobile only button */}
              <Button 
                onClick={handleSave} 
                disabled={!isFormValid()} 
                className="w-full md:hidden"
                data-testid="button-save-mobile"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
