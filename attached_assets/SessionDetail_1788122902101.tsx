import { ArrowLeft, Pencil, Trash2, CalendarIcon, Clock, MapPin, ChevronRight, Target, Save, Users, Play, Lightbulb, Sparkles, Copy, ListChecks, FileText, Zap, LayoutList } from 'lucide-react';
import { useState } from 'react';
import {
  Session,
  Squad,
  Location,
  Coach,
  Swimmer,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceNote,
  SessionFocus,
  SessionTemplate,
  Drill,
  SessionFeedback,
} from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { RichTextEditor } from './RichTextEditor';
import { DrillsSidebar } from './DrillsSidebar';
import { FeedbackForm } from './FeedbackForm';
import { SessionWriterHelper } from './SessionWriterHelper';
import { AiChatPanel } from './AiChatPanel';
import { NotesSidebar } from './NotesSidebar';
import { SessionIntelligenceSidebar } from './SessionIntelligenceSidebar';
import { SeasonPlannerSidebar } from './SeasonPlannerSidebar';

interface SessionDetailProps {
  session: Session;
  squad: Squad;
  location: Location;
  coaches: Coach[];
  swimmers: Swimmer[];
  templates: SessionTemplate[];
  drills: Drill[];
  feedbackData?: SessionFeedback[]; // Add feedback data prop
  onBack: () => void;
  onDuplicate?: (sessionData: Omit<Session, 'id'>) => void;
  squads?: Squad[];
  locations?: Location[];
}

const sessionFocusOptions: SessionFocus[] = [
  'Aerobic capacity',
  'Anaerobic capacity',
  'Speed',
  'Technique',
  'Recovery',
  'Starts & turns',
];

const attendanceStatusOptions: AttendanceStatus[] = [
  'Present',
  '1st half only',
  '2nd half only',
  'Absent',
];

const attendanceNoteOptions: AttendanceNote[] = ['-', 'Late', 'Very Late'];

type TabType = 'detail' | 'session' | 'attendance' | 'feedback';

export function SessionDetail({
  session,
  squad,
  location,
  coaches,
  swimmers,
  templates,
  drills,
  feedbackData,
  onBack,
  onDuplicate,
  squads,
  locations,
}: SessionDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('detail');
  const [isEditDetailOpen, setIsEditDetailOpen] = useState(false);
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drillsSidebarOpen, setDrillsSidebarOpen] = useState(false);
  const [notesSidebarOpen, setNotesSidebarOpen] = useState(false);
  const [sessionNotesSidebarOpen, setSessionNotesSidebarOpen] = useState(false);
  const [manuallyAddedDrillIds, setManuallyAddedDrillIds] = useState<string[]>([]);
  const [helperSidebarOpen, setHelperSidebarOpen] = useState(false);
  const [aiChatPanelOpen, setAiChatPanelOpen] = useState(false);
  const [intelligenceSidebarOpen, setIntelligenceSidebarOpen] = useState(false);
  const [seasonPlannerOpen, setSeasonPlannerOpen] = useState(false);
  
  // Duplicate form state - pre-populate all fields except squadId
  const [duplicateForm, setDuplicateForm] = useState<{
    squadId: string;
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
    squadId: '',
    locationId: session.locationId,
    leadCoachId: session.leadCoachId,
    secondCoachId: session.secondCoachId || 'none',
    helperId: session.helperId || 'none',
    setWriterId: session.setWriterId,
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: session.startTime,
    endTime: session.endTime,
    focus: session.focus,
  });
  
  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    session.attendance ||
      swimmers
        .filter((s) => s.squadId === session.squadId)
        .map((s) => ({
          swimmerId: s.id,
          status: 'Present' as AttendanceStatus,
          notes: '-' as AttendanceNote,
        }))
  );

  // Detail form state
  const [detailForm, setDetailForm] = useState({
    date: session.date,
    locationId: session.locationId,
    startTime: session.startTime,
    endTime: session.endTime,
    leadCoachId: session.leadCoachId,
    secondCoachId: session.secondCoachId || '',
    helperId: session.helperId || '',
    setWriterId: session.setWriterId,
    focus: session.focus,
  });

  // Session content form state - convert plain text to HTML if needed
  const [sessionContent, setSessionContent] = useState(() => {
    const content = session.content || '';
    // If content doesn't contain HTML tags, convert line breaks to <br> tags
    if (content && !content.includes('<')) {
      return content.replace(/\n/g, '<br>');
    }
    return content;
  });

  // Session notes state
  const [sessionNotes, setSessionNotes] = useState(session.sessionNotes || '');

  const leadCoach = coaches.find((c) => c.id === session.leadCoachId);
  const secondCoach = coaches.find((c) => c.id === session.secondCoachId);
  const helper = coaches.find((c) => c.id === session.helperId);
  const setWriter = coaches.find((c) => c.id === session.setWriterId);

  const squadSwimmers = swimmers.filter((s) => s.squadId === session.squadId);

  const getCoachName = (coachId?: string) => {
    if (!coachId) return null;
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? coach.name : 'Unknown';
  };

  // Detect drills in session content and combine with manually added drills
  const autoDetectedDrills = drills.filter(drill => {
    if (!sessionContent) return false;
    const contentLower = sessionContent.toLowerCase();
    const drillNameLower = drill.name.toLowerCase();
    return contentLower.includes(drillNameLower);
  });

  // Combine auto-detected drills with manually added drills (remove duplicates)
  const allDetectedDrills = [
    ...autoDetectedDrills,
    ...drills.filter(drill => 
      manuallyAddedDrillIds.includes(drill.id) && 
      !autoDetectedDrills.some(d => d.id === drill.id)
    )
  ];

  const handleAddDrill = (drillId: string) => {
    if (!manuallyAddedDrillIds.includes(drillId)) {
      setManuallyAddedDrillIds([...manuallyAddedDrillIds, drillId]);
    }
  };

  const handleRemoveDrill = (drillId: string) => {
    setManuallyAddedDrillIds(manuallyAddedDrillIds.filter(id => id !== drillId));
  };

  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateDurationMinutes = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return durationMin;
  };

  const handleAttendanceChange = (
    swimmerId: string,
    field: 'status' | 'notes',
    value: AttendanceStatus | AttendanceNote
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((record) => {
        if (record.swimmerId === swimmerId) {
          if (field === 'status') {
            // If status is Absent, reset notes to '-'
            if (value === 'Absent') {
              return { ...record, status: value as AttendanceStatus, notes: '-' };
            }
            return { ...record, status: value as AttendanceStatus };
          }
          return { ...record, notes: value as AttendanceNote };
        }
        return record;
      })
    );
  };

  const handleSaveAttendance = () => {
    alert('Attendance saved successfully!');
    console.log('Attendance records:', attendanceRecords);
  };

  const handleSaveDetail = () => {
    alert('Session details updated!');
    console.log('Detail form:', detailForm);
    setIsEditDetailOpen(false);
  };

  const handleSaveSession = () => {
    alert('Session content and notes updated!');
    console.log('Session content:', sessionContent);
    console.log('Session notes:', sessionNotes);
    setIsEditingSession(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this session?')) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleDuplicate = () => {
    if (!isFormValid()) return;
    
    if (onDuplicate) {
      const newSessionData: Omit<Session, 'id'> = {
        squadId: duplicateForm.squadId,
        locationId: duplicateForm.locationId,
        leadCoachId: duplicateForm.leadCoachId,
        secondCoachId: duplicateForm.secondCoachId !== 'none' ? duplicateForm.secondCoachId : undefined,
        helperId: duplicateForm.helperId !== 'none' ? duplicateForm.helperId : undefined,
        setWriterId: duplicateForm.setWriterId,
        date: new Date(duplicateForm.date),
        startTime: duplicateForm.startTime,
        endTime: duplicateForm.endTime,
        focus: duplicateForm.focus as SessionFocus,
        content: session.content, // Copy session content from original
        distanceBreakdown: session.distanceBreakdown, // Copy distance breakdown
      };
      onDuplicate(newSessionData);
      setIsDuplicateDialogOpen(false);
    }
  };

  const isFormValid = () => {
    return (
      duplicateForm.squadId &&
      duplicateForm.locationId &&
      duplicateForm.leadCoachId &&
      duplicateForm.setWriterId &&
      duplicateForm.date &&
      duplicateForm.startTime &&
      duplicateForm.endTime &&
      duplicateForm.focus
    );
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">
      {/* Fixed Header - sticky to top, no scroll */}
      <div className="flex-shrink-0 sticky top-0 bg-background z-30 pb-3 md:pb-4">
        {/* Header */}
        <div className="mb-3 md:mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate">{squad.name} - {session.focus}</h1>
                <p className="text-sm text-muted-foreground">
                  {format(session.date, 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Reset form with current session values except squadId
                  setDuplicateForm({
                    squadId: '',
                    locationId: session.locationId,
                    leadCoachId: session.leadCoachId,
                    secondCoachId: session.secondCoachId || 'none',
                    helperId: session.helperId || 'none',
                    setWriterId: session.setWriterId,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    startTime: session.startTime,
                    endTime: session.endTime,
                    focus: session.focus,
                  });
                  setIsDuplicateDialogOpen(true);
                }} 
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Duplicate</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-shrink-0">
                <Trash2 className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Horizontal Banner */}
        <div className="border-b">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('detail')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'detail'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Detail
              {activeTab === 'detail' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'session'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Session
              {activeTab === 'session' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'attendance'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Attendance
              {activeTab === 'attendance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={cn(
                'px-4 md:px-6 py-3 text-sm transition-colors relative',
                activeTab === 'feedback'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Feedback
              {activeTab === 'feedback' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 mt-4 md:mt-6 min-h-0">
        {/* Detail Tab */}
        {activeTab === 'detail' && (
          <div className="space-y-4 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2>Session Details</h2>
              <Button variant="outline" size="sm" onClick={() => setIsEditDetailOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <h3 className="mb-4">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p>{format(session.date, 'MMMM dd, yyyy')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p>
                          {session.startTime} - {session.endTime} ({calculateDuration(session.startTime, session.endTime)})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p>{location.name} ({location.poolType})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Session Focus</p>
                        <Badge variant="secondary">{session.focus}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <h3 className="mb-4">Coaching Team</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Coach</p>
                      <p>{getCoachName(session.leadCoachId)}</p>
                    </div>
                    {secondCoach && (
                      <div>
                        <p className="text-sm text-muted-foreground">Second Coach</p>
                        <p>{getCoachName(session.secondCoachId)}</p>
                      </div>
                    )}
                    {helper && (
                      <div>
                        <p className="text-sm text-muted-foreground">Helper</p>
                        <p>{getCoachName(session.helperId)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Set Writer</p>
                      <p>{getCoachName(session.setWriterId)}</p>
                    </div>
                  </div>
                </div>

                {session.distanceBreakdown && (
                  <div className="border rounded-lg p-6 bg-card">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Distance</p>
                        <p className="text-2xl text-primary">{session.distanceBreakdown.total}m</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Session Tab */}
        {activeTab === 'session' && (
          <div className="space-y-4">
            {/* Header with better mobile layout */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate">Session Content</h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditingSession ? (
                    <Button 
                      size="sm" 
                      onClick={handleSaveSession}
                      className="flex-shrink-0"
                    >
                      <Save className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Save</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSeasonPlannerOpen(!seasonPlannerOpen); setIntelligenceSidebarOpen(false); }}
                        style={seasonPlannerOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                        className="flex-shrink-0"
                      >
                        <LayoutList className="h-4 w-4 sm:mr-2" style={seasonPlannerOpen ? { color: '#4B9A4A' } : undefined}/>
                        <span className="hidden sm:inline">Season Planner</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setIntelligenceSidebarOpen(!intelligenceSidebarOpen); setSeasonPlannerOpen(false); }}
                        style={intelligenceSidebarOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                        className="flex-shrink-0"
                      >
                        <Zap className="h-4 w-4 sm:mr-2" style={intelligenceSidebarOpen ? { color: '#4B9A4A' } : undefined}/>
                        <span className="hidden sm:inline">Squad Intel</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingSession(true);
                          setSidebarOpen(false);
                          setDrillsSidebarOpen(false);
                          setSessionNotesSidebarOpen(false);
                        }}
                        disabled={sidebarOpen || drillsSidebarOpen || sessionNotesSidebarOpen}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {isEditingSession && (
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setAiChatPanelOpen(!aiChatPanelOpen)}
                    style={aiChatPanelOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                    className="flex-1 min-w-[140px]"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Assistant
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setHelperSidebarOpen(!helperSidebarOpen)}
                    className="flex-1 min-w-[140px]"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Session Helper</span>
                    <span className="sm:hidden">Helper</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIntelligenceSidebarOpen(!intelligenceSidebarOpen)}
                    style={intelligenceSidebarOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                    className="flex-1 min-w-[140px]"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Squad Intelligence</span>
                    <span className="sm:hidden">Intel</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesSidebarOpen(!notesSidebarOpen)}
                    style={notesSidebarOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                    className="flex-1 min-w-[140px]"
                  >
                    <ListChecks className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Handbook Notes</span>
                    <span className="sm:hidden">Notes</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSeasonPlannerOpen(!seasonPlannerOpen); setIntelligenceSidebarOpen(false); }}
                    style={seasonPlannerOpen ? { backgroundColor: '#4B9A4A20', borderColor: '#4B9A4A' } : undefined}
                    className="flex-1 min-w-[140px]"
                  >
                    <LayoutList className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Season Planner</span>
                    <span className="sm:hidden">Plan</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="relative flex gap-4 items-start">
              <SessionIntelligenceSidebar
                isOpen={intelligenceSidebarOpen}
                onClose={() => setIntelligenceSidebarOpen(false)}
                squadSwimmers={squadSwimmers}
              />
              <SeasonPlannerSidebar
                isOpen={seasonPlannerOpen}
                onClose={() => setSeasonPlannerOpen(false)}
                squads={[
                  { id: squad.id, name: squad.name },
                  ...((session.additionalSquadIds || [])
                    .map(id => squads?.find(s => s.id === id))
                    .filter((s): s is NonNullable<typeof s> => !!s)
                    .map(s => ({ id: s.id, name: s.name }))),
                ]}
                sessionDate={session.date}
                startTime={session.startTime}
                endTime={session.endTime}
              />
              {/* Main Session Content */}
              <div className={cn("flex-1 transition-all", aiChatPanelOpen && isEditingSession && "lg:w-[calc(100%-420px)]")}>
                {isEditingSession ? (
                  <div className="space-y-4">
                    <div className="h-[600px]">
                      <RichTextEditor
                        value={sessionContent}
                        onChange={setSessionContent}
                        placeholder="Enter session content..."
                        templates={templates}
                      />
                    </div>
                    
                    {/* Session Notes Editor */}
                    <div className="border rounded-lg p-4 bg-card">
                      <Label htmlFor="session-notes" className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Session Notes
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Add personal notes for this session (observations, reminders, etc.)
                      </p>
                      <Textarea
                        id="session-notes"
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder="e.g., Focus on technique, specific swimmer improvements, pool conditions..."
                        className="min-h-[100px] resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 md:p-6 bg-card min-h-[400px]">
                    {sessionContent ? (
                      <div 
                        className="whitespace-pre-wrap font-sans text-sm"
                        dangerouslySetInnerHTML={{ __html: sessionContent }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No session content yet. Click Edit to add session details.</p>
                    )}
                  </div>
                )}
              </div>

              {/* AI Chat Panel - sticky on desktop */}
              {aiChatPanelOpen && isEditingSession && (
                <div className="hidden lg:block lg:sticky lg:top-4">
                  <AiChatPanel
                    isOpen={aiChatPanelOpen}
                    onClose={() => setAiChatPanelOpen(false)}
                    sessionId={session.id}
                    sessionContext={{
                      squad,
                      sessionDate: detailForm.date,
                      sessionDuration: calculateDurationMinutes(detailForm.startTime, detailForm.endTime),
                      poolLength: location.poolLength,
                      sessionFocus: detailForm.focus,
                      currentContent: sessionContent,
                    }}
                    onInsertContent={(content) => {
                      // Insert AI content at end of current content
                      const newContent = sessionContent 
                        ? `${sessionContent}\n\n${content}`
                        : content;
                      setSessionContent(newContent);
                    }}
                  />
                </div>
              )}

              {/* Sidebar Toggle Buttons - Only show when not editing */}
              {!isEditingSession && (
                <>
                  {/* Backdrop overlay for mobile */}
                  {(sidebarOpen || drillsSidebarOpen || sessionNotesSidebarOpen) && (
                    <div 
                      className="fixed inset-0 bg-black/50 z-40 md:hidden"
                      onClick={() => {
                        setSidebarOpen(false);
                        setDrillsSidebarOpen(false);
                        setSessionNotesSidebarOpen(false);
                      }}
                    />
                  )}

                  {/* Distance Breakdown Toggle Button */}
                  {session.distanceBreakdown && (
                    <button
                      onClick={() => {
                        setSidebarOpen(!sidebarOpen);
                        setDrillsSidebarOpen(false);
                        setSessionNotesSidebarOpen(false);
                      }}
                      className={cn(
                        "absolute top-4 md:top-6 border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                        sidebarOpen ? "right-[280px] md:right-80" : "right-0"
                      )}
                      title="Distance Breakdown"
                    >
                      <Target className={cn("h-4 w-4 text-primary", sidebarOpen && "mr-1")} />
                      {sidebarOpen && <span className="text-xs hidden md:inline">Distance</span>}
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          sidebarOpen && "rotate-180"
                        )}
                      />
                    </button>
                  )}

                  {/* Drills Toggle Button */}
                  {allDetectedDrills.length > 0 && (
                    <button
                      onClick={() => {
                        setDrillsSidebarOpen(!drillsSidebarOpen);
                        setSidebarOpen(false);
                        setSessionNotesSidebarOpen(false);
                      }}
                      className={cn(
                        "absolute border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                        session.distanceBreakdown ? "top-16 md:top-20" : "top-4 md:top-6",
                        drillsSidebarOpen ? "right-[280px] md:right-[30rem]" : "right-0"
                      )}
                      title="Session Drills"
                    >
                      <Play className={cn("h-4 w-4 text-primary", drillsSidebarOpen && "mr-1")} />
                      {drillsSidebarOpen && <span className="text-xs hidden md:inline">Drills</span>}
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          drillsSidebarOpen && "rotate-180"
                        )}
                      />
                    </button>
                  )}

                  {/* Session Notes Toggle Button - Show when there are session notes */}
                  {sessionNotes && !isEditingSession && (
                    <button
                      onClick={() => {
                        setSessionNotesSidebarOpen(!sessionNotesSidebarOpen);
                        setSidebarOpen(false);
                        setDrillsSidebarOpen(false);
                      }}
                      className={cn(
                        "absolute border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                        session.distanceBreakdown && allDetectedDrills.length > 0 ? "top-28 md:top-32" :
                        session.distanceBreakdown || allDetectedDrills.length > 0 ? "top-16 md:top-20" : "top-4 md:top-6",
                        sessionNotesSidebarOpen ? "right-[280px] md:right-80" : "right-0"
                      )}
                      title="Session Notes"
                    >
                      <FileText className={cn("h-4 w-4 text-primary", sessionNotesSidebarOpen && "mr-1")} />
                      {sessionNotesSidebarOpen && <span className="text-xs hidden md:inline">Notes</span>}
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          sessionNotesSidebarOpen && "rotate-180"
                        )}
                      />
                    </button>
                  )}
                </>
              )}

              {/* Distance Breakdown Sidebar - Only show when not editing */}
              {session.distanceBreakdown && !isEditingSession && (
                <div
                  className={cn(
                    "fixed md:absolute top-0 md:top-0 right-0 h-full md:h-auto border rounded-lg bg-card overflow-y-auto transition-all duration-300 ease-in-out z-50",
                    sidebarOpen ? "w-[280px] md:w-80 p-4 md:p-6" : "w-0 p-0"
                  )}
                >
                  {sidebarOpen && (
                    <div className="space-y-4">
                      <div>
                        <h3>Distance Breakdown</h3>
                        <p className="text-sm text-muted-foreground">Stroke-by-stroke analysis</p>
                      </div>

                      <div className="space-y-3">
                          {/* Front Crawl */}
                          {session.distanceBreakdown.frontCrawl > 0 && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Front Crawl</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.frontCrawl}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.frontCrawlBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Backstroke */}
                          {session.distanceBreakdown.backstroke > 0 && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Backstroke</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.backstroke}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.backstrokeBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Breaststroke */}
                          {session.distanceBreakdown.breaststroke > 0 && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Breaststroke</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.breaststroke}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.breaststrokeBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Butterfly */}
                          {session.distanceBreakdown.butterfly > 0 && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Butterfly</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.butterfly}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.butterflyBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Individual Medley */}
                          {session.distanceBreakdown.individualMedley > 0 && (
                            <div className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2 gap-2">
                                <span className="whitespace-nowrap">Individual Medley</span>
                                <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.individualMedley}m</span>
                              </div>
                              <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Swim</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.swim}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Drill</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.drill}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kick</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.kick}m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Pull</span>
                                  <span>{session.distanceBreakdown.individualMedleyBreakdown.pull}m</span>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Session Notes Sidebar - Only show when not editing */}
              {sessionNotes && !isEditingSession && (
                <div
                  className={cn(
                    "fixed md:absolute top-0 md:top-0 right-0 h-full md:h-auto border rounded-lg bg-card overflow-y-auto transition-all duration-300 ease-in-out z-50",
                    sessionNotesSidebarOpen ? "w-[280px] md:w-80 p-4 md:p-6" : "w-0 p-0"
                  )}
                >
                  {sessionNotesSidebarOpen && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Session Notes
                        </h3>
                        <p className="text-sm text-muted-foreground">Coach observations and reminders</p>
                      </div>

                      <div className="border rounded-lg p-4 bg-muted/20">
                        <p className="text-sm whitespace-pre-wrap">{sessionNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2>Attendance Register</h2>
                <p className="text-sm text-muted-foreground">
                  {squadSwimmers.length} swimmers
                </p>
              </div>
              <Button onClick={handleSaveAttendance} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Attendance
              </Button>
            </div>

            <div className="border rounded-lg p-4 md:p-6 bg-card">
              <div className="space-y-2 md:space-y-3">
                {squadSwimmers.map((swimmer) => {
                  const record = attendanceRecords.find((r) => r.swimmerId === swimmer.id);
                  const status = record?.status || 'Present';
                  const notes = record?.notes || '-';
                  const isAbsent = status === 'Absent';

                  return (
                    <div
                      key={swimmer.id}
                      className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_200px_150px] gap-2 md:gap-3 items-center p-2 md:p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm md:text-base">
                          {swimmer.firstName} {swimmer.lastName}
                        </p>
                      </div>
                      <div>
                        <Select
                          value={status}
                          onValueChange={(value) =>
                            handleAttendanceChange(swimmer.id, 'status', value as AttendanceStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-[90px] md:w-[120px] text-xs md:text-sm [&>svg]:hidden md:[&>svg]:block">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {attendanceStatusOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select
                          value={notes}
                          onValueChange={(value) =>
                            handleAttendanceChange(swimmer.id, 'notes', value as AttendanceNote)
                          }
                          disabled={isAbsent}
                        >
                          <SelectTrigger disabled={isAbsent} className="h-8 w-[70px] md:w-[100px] text-xs md:text-sm [&>svg]:hidden md:[&>svg]:block">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {attendanceNoteOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <FeedbackForm
              sessionId={session.id}
              coachId={session.leadCoachId}
              existingFeedback={feedbackData?.[0]}
              onSave={(feedback) => {
                console.log('Feedback saved:', feedback);
                alert('Feedback saved successfully!');
              }}
            />
          </div>
        )}
      </div>

      {/* Session Writer Helper - Only show when editing session content */}
      {helperSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setHelperSidebarOpen(false)}
        />
      )}
      <SessionWriterHelper
        isOpen={helperSidebarOpen}
        onClose={() => setHelperSidebarOpen(false)}
        squad={squad}
        sessionFocus={detailForm.focus}
        pastFeedback={feedbackData}
      />

      {/* Edit Detail Dialog */}
      <Dialog open={isEditDetailOpen} onOpenChange={setIsEditDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session Details</DialogTitle>
            <DialogDescription>Update the session information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(detailForm.date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={detailForm.date}
                    onSelect={(date) => date && setDetailForm({ ...detailForm, date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={detailForm.locationId}
                onValueChange={(value) => setDetailForm({ ...detailForm, locationId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={location.id}>
                    {location.name}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={detailForm.startTime}
                  onChange={(e) => setDetailForm({ ...detailForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={detailForm.endTime}
                  onChange={(e) => setDetailForm({ ...detailForm, endTime: e.target.value })}
                />
              </div>
            </div>

            {/* Lead Coach */}
            <div className="space-y-2">
              <Label>Lead Coach</Label>
              <Select
                value={detailForm.leadCoachId}
                onValueChange={(value) => setDetailForm({ ...detailForm, leadCoachId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Second Coach (Optional)</Label>
              <Select
                value={detailForm.secondCoachId || 'none'}
                onValueChange={(value) => setDetailForm({ ...detailForm, secondCoachId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
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
              <Label>Helper (Optional)</Label>
              <Select
                value={detailForm.helperId || 'none'}
                onValueChange={(value) => setDetailForm({ ...detailForm, helperId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
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
              <Label>Set Writer</Label>
              <Select
                value={detailForm.setWriterId}
                onValueChange={(value) => setDetailForm({ ...detailForm, setWriterId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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

            {/* Session Focus */}
            <div className="space-y-2">
              <Label>Session Focus</Label>
              <Select
                value={detailForm.focus}
                onValueChange={(value) =>
                  setDetailForm({ ...detailForm, focus: value as SessionFocus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionFocusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDetailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDetail}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drills Sidebar */}
      <DrillsSidebar
        open={drillsSidebarOpen}
        onOpenChange={setDrillsSidebarOpen}
        detectedDrills={allDetectedDrills}
        allDrills={drills}
        onAddDrill={handleAddDrill}
        onRemoveDrill={handleRemoveDrill}
      />

      {/* Notes Sidebar */}
      <NotesSidebar
        open={notesSidebarOpen}
        onOpenChange={setNotesSidebarOpen}
        squadId={session.squadId}
        squads={squads || []}
      />

      {/* Duplicate Session Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Session</DialogTitle>
            <DialogDescription>
              Create a copy of this session. All fields are pre-populated except the squad which you need to select.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="dup-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dup-date"
                type="date"
                value={duplicateForm.date}
                onChange={(e) => setDuplicateForm({ ...duplicateForm, date: e.target.value })}
              />
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dup-startTime">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dup-startTime"
                  type="time"
                  value={duplicateForm.startTime}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dup-endTime">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dup-endTime"
                  type="time"
                  value={duplicateForm.endTime}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, endTime: e.target.value })}
                />
              </div>
            </div>

            {/* Squad - BLANK by default */}
            <div className="space-y-2">
              <Label htmlFor="dup-squad">
                Squad <span className="text-destructive">*</span>
              </Label>
              <Select
                value={duplicateForm.squadId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, squadId: value })}
              >
                <SelectTrigger id="dup-squad">
                  <SelectValue placeholder="Select squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads && squads.map((sq) => (
                    <SelectItem key={sq.id} value={sq.id}>
                      {sq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="dup-location">
                Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={duplicateForm.locationId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, locationId: value })}
              >
                <SelectTrigger id="dup-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations && locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.poolType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Focus */}
            <div className="space-y-2">
              <Label htmlFor="dup-focus">
                Session Focus <span className="text-destructive">*</span>
              </Label>
              <Select
                value={duplicateForm.focus}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, focus: value as SessionFocus })}
              >
                <SelectTrigger id="dup-focus">
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
              <Label htmlFor="dup-leadCoach">
                Lead Coach <span className="text-destructive">*</span>
              </Label>
              <Select
                value={duplicateForm.leadCoachId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, leadCoachId: value })}
              >
                <SelectTrigger id="dup-leadCoach">
                  <SelectValue placeholder="Select lead coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Second Coach */}
            <div className="space-y-2">
              <Label htmlFor="dup-secondCoach">Second Coach (Optional)</Label>
              <Select
                value={duplicateForm.secondCoachId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, secondCoachId: value })}
              >
                <SelectTrigger id="dup-secondCoach">
                  <SelectValue placeholder="Select second coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Helper */}
            <div className="space-y-2">
              <Label htmlFor="dup-helper">Helper (Optional)</Label>
              <Select
                value={duplicateForm.helperId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, helperId: value })}
              >
                <SelectTrigger id="dup-helper">
                  <SelectValue placeholder="Select helper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Set Writer */}
            <div className="space-y-2">
              <Label htmlFor="dup-setWriter">
                Set Writer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={duplicateForm.setWriterId}
                onValueChange={(value) => setDuplicateForm({ ...duplicateForm, setWriterId: value })}
              >
                <SelectTrigger id="dup-setWriter">
                  <SelectValue placeholder="Select set writer" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!isFormValid()}>
              <Copy className="h-4 w-4 mr-2" />
              Create Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}