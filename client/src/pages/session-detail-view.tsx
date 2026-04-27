import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Session, Squad, Location, Coach, Swimmer, AttendanceRecord, SessionFocus } from '../lib/typeAdapters';
import { adaptSession, adaptSquad } from '../lib/typeAdapters';
import type { SwimmingSession as BackendSession, Squad as BackendSquad, SessionTemplate, Drill } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Pencil, Trash2, Calendar as CalendarIcon, Clock, MapPin, ChevronRight, ChevronDown, Target, Save, Loader2, FileText, Play, Lightbulb, Sparkles, X, Copy, ListChecks, BookOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/RichTextEditor';
import { DrillsSidebar } from '@/components/DrillsSidebar';
import { DrillsLibrarySidebar } from '@/components/DrillsLibrarySidebar';
import { FeedbackForm } from '@/components/FeedbackForm';
import { SessionWriterHelper } from '@/components/SessionWriterHelper';
import { AiChatPanel } from '@/components/AiChatPanel';
import { DuplicateSessionModal } from '@/components/DuplicateSessionModal';
import type { Squad as SchemaSquad } from '@shared/schema';
import type { Coach as BackendCoach } from '@shared/schema';

interface SessionDetailProps {
  sessionId: string;
  locations: Location[];
  coaches: Coach[];
  swimmers: Swimmer[];
  coachId?: string;
  onBack: () => void;
  onNavigateToSession?: (sessionId: string) => void;
}

type TabType = 'detail' | 'session' | 'attendance' | 'feedback';
type AttendanceStatus = 'Present' | '1st half only' | '2nd half only' | 'Absent';
type AttendanceNote = '-' | 'Late' | 'Very Late';

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

function stripHtmlTags(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function SessionDetail({
  sessionId,
  locations,
  coaches,
  swimmers,
  coachId,
  onBack,
  onNavigateToSession,
}: SessionDetailProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  
  // Fetch session data
  const { data: backendSession, isLoading: sessionLoading } = useQuery<BackendSession>({
    queryKey: ['/api/sessions', sessionId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/sessions/${sessionId}`);
      return response.json();
    },
  });

  // Fetch squads data to find the squad for this session
  const { data: backendSquads = [], isLoading: squadsLoading } = useQuery<BackendSquad[]>({
    queryKey: ['/api/squads'],
  });

  // Fetch templates for paste from template feature
  const { data: templates = [] } = useQuery<SessionTemplate[]>({
    queryKey: ['/api/session-templates'],
  });

  // Fetch drills for displaying detected drills
  const { data: allDrills = [] } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  // Fetch session squads for multi-squad support
  const { data: sessionSquadRecords = [] } = useQuery<{ id: string; sessionId: string; squadId: string; recordStatus: string }[]>({
    queryKey: ['/api/session-squads', sessionId],
    enabled: !!sessionId,
  });

  // Fetch current coach for feedback form
  const { data: currentCoach } = useQuery<BackendCoach>({
    queryKey: ['/api/coaches/me'],
  });

  // Resolve the effective coach ID for training notes (prop takes precedence)
  const effectiveCoachId = coachId ?? currentCoach?.id;

  // Fetch handbook (training) notes for the current coach
  const { data: allCoachNotes = [] } = useQuery<any[]>({
    queryKey: ['/api/coach-notes', effectiveCoachId],
    queryFn: async () => {
      if (!effectiveCoachId) return [];
      const response = await fetch(`/api/coach-notes?coachId=${effectiveCoachId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!effectiveCoachId,
  });

  // Toggle a coach note item (mark complete/incomplete)
  const toggleNoteItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/coach-note-items/${itemId}`, { completed });
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/coach-notes', effectiveCoachId] });
    },
  });

  // Adapt backend data to frontend types
  const session = useMemo(
    () => backendSession ? adaptSession(backendSession) : null,
    [backendSession]
  );

  // Filter detected drills
  const detectedDrills = useMemo(() => {
    if (!backendSession?.detectedDrillIds || backendSession.detectedDrillIds.length === 0) {
      return [];
    }
    // Filter drills that match detected IDs and are still active
    return allDrills.filter(drill => 
      backendSession.detectedDrillIds?.includes(drill.id) && 
      drill.recordStatus === 'active'
    );
  }, [backendSession?.detectedDrillIds, allDrills]);

  const squads = useMemo(
    () => backendSquads.map(s => adaptSquad(s)),
    [backendSquads]
  );

  const activeSessionSquadIds = useMemo(() => {
    const ids = sessionSquadRecords
      .filter(ss => ss.recordStatus === 'active')
      .map(ss => ss.squadId);
    return ids.length > 0 ? ids : (session?.squadId ? [session.squadId] : []);
  }, [sessionSquadRecords, session?.squadId]);

  const sessionSquadsList = squads.filter(s => activeSessionSquadIds.includes(s.id));
  const squad = squads.find(s => s.id === session?.squadId);
  const location = locations.find(l => l.id === session?.locationId);

  // Open training notes for the session's squads from handbook
  const squadTrainingNotes = useMemo(() => {
    if (!activeSessionSquadIds.length) return [];
    return allCoachNotes.filter((note: any) => {
      if (note.status !== 'open') return false;
      const noteSquadIds: string[] = note.squadIds ?? [];
      return activeSessionSquadIds.some(id => noteSquadIds.includes(id));
    });
  }, [allCoachNotes, activeSessionSquadIds]);

  const [activeTab, setActiveTab] = useState<TabType>('detail');
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drillsSidebarOpen, setDrillsSidebarOpen] = useState(false);
  const [notesSidebarOpen, setNotesSidebarOpen] = useState(false);
  const [handbookNotesOpen, setHandbookNotesOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [editSquadIds, setEditSquadIds] = useState<string[]>([]);
  const [editSquadDropdownOpen, setEditSquadDropdownOpen] = useState(false);
  const editSquadDropdownRef = useRef<HTMLDivElement>(null);
  // Background calculation states - user can continue working while these are true
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [isCalculatingDrills, setIsCalculatingDrills] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const [aiChatPanelOpen, setAiChatPanelOpen] = useState(false);
  const [drillsLibrarySidebarOpen, setDrillsLibrarySidebarOpen] = useState(false);
  
  const formatSessionDate = (date: Date | string): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date && isValid(date)) {
      return format(date, 'yyyy-MM-dd');
    }
    return '';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editSquadDropdownRef.current && !editSquadDropdownRef.current.contains(event.target as Node)) {
        setEditSquadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleEditSquad = (squadId: string) => {
    setEditSquadIds(prev => {
      if (prev.includes(squadId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== squadId);
      }
      return [...prev, squadId];
    });
  };

  const [editFormData, setEditFormData] = useState({
    date: session ? formatSessionDate(session.date) : '',
    startTime: session?.startTime || '',
    endTime: session?.endTime || '',
    poolId: session?.locationId || '',
    focus: session?.focus || 'Aerobic capacity',
    leadCoachId: session?.leadCoachId || '',
    secondCoachId: session?.secondCoachId || '',
    helperId: session?.helperId || '',
    setWriterId: session?.setWriterId || '',
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    session?.attendance ||
      (session ? swimmers
        .filter((s) => s.squadId === session.squadId)
        .map((s) => ({
          swimmerId: s.id,
          status: 'Present' as AttendanceStatus,
          notes: '-' as AttendanceNote,
        })) : [])
  );

  const [sessionContent, setSessionContent] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // ALL MUTATIONS MUST BE DEFINED BEFORE ANY CONDITIONAL RETURNS
  const updateAttendanceMutation = useMutation({
    mutationFn: async (attendance: AttendanceRecord[]) => {
      return await apiRequest('POST', `/api/attendance/${sessionId}`, { attendance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      toast({
        title: 'Success',
        description: 'Attendance saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
        variant: 'destructive',
      });
    },
  });

  // Step 1: Save content immediately - also triggers drill detection on backend
  const saveContentMutation = useMutation({
    mutationFn: async (content: string) => {
      const plainText = stripHtmlTags(content);
      const notesHtml = sessionNotes
        ? `<p>${sessionNotes.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`
        : null;
      return await apiRequest('PUT', `/api/sessions/${sessionId}`, { 
        sessionContent: plainText,
        sessionContentHtml: content,
        sessionNotes: sessionNotes || null,
        sessionNotesHtml: notesHtml,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      setIsEditingSession(false);
      setHandbookNotesOpen(false);
    },
    onError: (error: Error) => {
      setIsCalculatingDrills(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save session content',
        variant: 'destructive',
      });
    },
  });

  // Step 2: Calculate distances in background (can take 30-60 seconds)
  const calculateDistancesMutation = useMutation({
    mutationFn: async (content: string) => {
      const plainText = stripHtmlTags(content);
      
      const parseResultResponse = await apiRequest('POST', '/api/sessions/parse-ai', { 
        sessionContent: plainText 
      });
      const parseResult = await parseResultResponse.json();
      
      return await apiRequest('PUT', `/api/sessions/${sessionId}`, { 
        totalFrontCrawlSwim: parseResult.totalFrontCrawlSwim || 0,
        totalFrontCrawlDrill: parseResult.totalFrontCrawlDrill || 0,
        totalFrontCrawlKick: parseResult.totalFrontCrawlKick || 0,
        totalFrontCrawlPull: parseResult.totalFrontCrawlPull || 0,
        totalBackstrokeSwim: parseResult.totalBackstrokeSwim || 0,
        totalBackstrokeDrill: parseResult.totalBackstrokeDrill || 0,
        totalBackstrokeKick: parseResult.totalBackstrokeKick || 0,
        totalBackstrokePull: parseResult.totalBackstrokePull || 0,
        totalBreaststrokeSwim: parseResult.totalBreaststrokeSwim || 0,
        totalBreaststrokeDrill: parseResult.totalBreaststrokeDrill || 0,
        totalBreaststrokeKick: parseResult.totalBreaststrokeKick || 0,
        totalBreaststrokePull: parseResult.totalBreaststrokePull || 0,
        totalButterflySwim: parseResult.totalButterflySwim || 0,
        totalButterflyDrill: parseResult.totalButterflyDrill || 0,
        totalButterflyKick: parseResult.totalButterflyKick || 0,
        totalButterflyPull: parseResult.totalButterflyPull || 0,
        totalIMSwim: parseResult.totalIMSwim || 0,
        totalIMDrill: parseResult.totalIMDrill || 0,
        totalIMKick: parseResult.totalIMKick || 0,
        totalIMPull: parseResult.totalIMPull || 0,
        totalNo1Swim: parseResult.totalNo1Swim || 0,
        totalNo1Drill: parseResult.totalNo1Drill || 0,
        totalNo1Kick: parseResult.totalNo1Kick || 0,
        totalNo1Pull: parseResult.totalNo1Pull || 0,
        totalDistance: parseResult.totalDistance || 0,
      });
    },
    onSuccess: () => {
      setIsCalculatingDistances(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      toast({
        title: 'Distance calculation complete',
        description: 'Session distances have been updated',
      });
    },
    onError: (error: Error) => {
      setIsCalculatingDistances(false);
      toast({
        title: 'Calculation error',
        description: error.message || 'Failed to calculate distances. You can try saving again.',
        variant: 'destructive',
      });
    },
  });

  // Step 3: Detect drills in background (separate AI call, independent of distances)
  const detectDrillsMutation = useMutation({
    mutationFn: async (content: string) => {
      const plainText = stripHtmlTags(content);
      return await apiRequest('POST', `/api/sessions/${sessionId}/detect-drills`, {
        sessionContent: plainText,
      });
    },
    onSuccess: () => {
      setIsCalculatingDrills(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
    },
    onError: () => {
      setIsCalculatingDrills(false);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/sessions/${sessionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/session-squads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/session-squads', sessionId] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update session',
        variant: 'destructive',
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.removeQueries({ queryKey: ['/api/sessions', sessionId] });
      setIsDeleteDialogOpen(false);
      toast({
        title: 'Session deleted',
        description: 'Returned to calendar.',
      });
      onBack();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete session',
        variant: 'destructive',
      });
    },
  });

  // Update state when session data loads
  useEffect(() => {
    if (session) {
      const htmlContent = session.contentHtml;
      if (htmlContent) {
        setSessionContent(htmlContent);
      } else {
        const content = session.content || '';
        if (content && !content.includes('<')) {
          setSessionContent(content.replace(/\n/g, '<br>'));
        } else {
          setSessionContent(content);
        }
      }
      
      setSessionNotes(session.sessionNotes || '');

      setEditFormData({
        date: formatSessionDate(session.date),
        startTime: session.startTime,
        endTime: session.endTime,
        poolId: session.locationId,
        focus: session.focus,
        leadCoachId: session.leadCoachId,
        secondCoachId: session.secondCoachId || '',
        helperId: session.helperId || '',
        setWriterId: session.setWriterId,
      });
      
      // Build attendance records by merging saved attendance with current squad swimmers
      const currentSquadSwimmers = swimmers.filter((s) => activeSessionSquadIds.includes(s.squadId));
      const savedAttendance = session.attendance || [];
      
      const mergedAttendance = currentSquadSwimmers.map((swimmer) => {
        // Check if this swimmer has saved attendance
        const saved = savedAttendance.find((a) => a.swimmerId === swimmer.id);
        
        if (saved) {
          // Use saved attendance for current squad members
          return saved;
        } else {
          // Use defaults for new squad members
          return {
            swimmerId: swimmer.id,
            status: 'Present' as AttendanceStatus,
            notes: '-' as AttendanceNote,
          };
        }
      });
      
      setAttendanceRecords(mergedAttendance);
    }
  }, [session, swimmers]);

  // Show loading state while data is being fetched
  if (sessionLoading || squadsLoading || !session) {
    return (
      <div className="flex flex-col h-full max-w-7xl mx-auto p-4 md:p-6" data-testid="view-session-detail">
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const leadCoach = coaches.find((c) => c.id === session.leadCoachId);
  const secondCoach = coaches.find((c) => c.id === session.secondCoachId);
  const helper = coaches.find((c) => c.id === session.helperId);
  const setWriter = coaches.find((c) => c.id === session.setWriterId);

  const squadSwimmers = swimmers.filter((s) => activeSessionSquadIds.includes(s.squadId));

  const getCoachName = (coachId?: string) => {
    if (!coachId) return null;
    const coach = coaches.find((c) => c.id === coachId);
    return coach ? coach.name : 'Unknown';
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 'Duration unavailable';
    try {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return 'Duration unavailable';
    }
  };

  const handleAttendanceChange = (
    swimmerId: string,
    field: 'status' | 'notes',
    value: string
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((record) => {
        if (record.swimmerId === swimmerId) {
          if (field === 'status') {
            if (value === 'Absent') {
              return { ...record, status: value as AttendanceStatus, notes: '-' as AttendanceNote };
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
    updateAttendanceMutation.mutate(attendanceRecords);
  };

  const handleSaveSession = () => {
    // Start background calculation states
    setIsCalculatingDistances(true);
    setIsCalculatingDrills(true);
    
    // Step 1: Save content immediately (user returns to view mode instantly)
    saveContentMutation.mutate(sessionContent);
    
    // Step 2: Calculate distances in background (separate AI call)
    calculateDistancesMutation.mutate(sessionContent);

    // Step 3: Detect drills in background (separate AI call, runs concurrently)
    detectDrillsMutation.mutate(sessionContent);
  };

  const handleOpenTemplateDialog = () => {
    setIsTemplateDialogOpen(true);
    setTemplateSearch('');
  };

  const handlePasteTemplate = (template: SessionTemplate) => {
    // Paste template content BELOW existing content with proper HTML block-level separation
    let separator = '';
    if (sessionContent.trim()) {
      // Use HTML block-level separation for proper rendering
      separator = '<br /><br />';
    }
    
    // Prefer HTML content, but wrap plain text in paragraph tags if needed
    let templateContent = template.sessionContentHtml || template.sessionContent;
    
    // If template has plain text but no HTML, wrap it in a paragraph for proper block rendering
    if (!template.sessionContentHtml && template.sessionContent) {
      // Check if plain text already has HTML tags
      const hasHtmlTags = /<[^>]+>/.test(template.sessionContent);
      if (!hasHtmlTags) {
        // Wrap plain text in paragraph to ensure block-level rendering
        templateContent = `<p>${template.sessionContent.replace(/\n/g, '<br />')}</p>`;
      }
    }
    
    const newContent = sessionContent + separator + templateContent;
    setSessionContent(newContent);
    setIsTemplateDialogOpen(false);
    toast({
      title: 'Template pasted',
      description: 'Template content added below existing session content',
    });
  };

  const handleEditClick = () => {
    setEditFormData({
      date: formatSessionDate(session.date),
      startTime: session.startTime,
      endTime: session.endTime,
      poolId: session.locationId,
      focus: session.focus,
      leadCoachId: session.leadCoachId,
      secondCoachId: session.secondCoachId || 'none',
      helperId: session.helperId || 'none',
      setWriterId: session.setWriterId,
    });
    setEditSquadIds([...activeSessionSquadIds]);
    setEditSquadDropdownOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editFormData.date || !editFormData.startTime || !editFormData.endTime || !editFormData.poolId || !editFormData.focus || !editFormData.leadCoachId || !editFormData.setWriterId || editSquadIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const sessionData: any = {
      date: new Date(editFormData.date),
      startTime: editFormData.startTime,
      endTime: editFormData.endTime,
      locationId: editFormData.poolId,
      focus: editFormData.focus as SessionFocus,
      leadCoachId: editFormData.leadCoachId,
      secondCoachId: editFormData.secondCoachId === 'none' ? null : editFormData.secondCoachId,
      helperId: editFormData.helperId === 'none' ? null : editFormData.helperId,
      setWriterId: editFormData.setWriterId,
      squadId: editSquadIds[0],
      squadIds: editSquadIds,
    };

    updateSessionMutation.mutate(sessionData);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteSessionMutation.isPending) return;
    deleteSessionMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto overflow-hidden" data-testid="view-session-detail">
      <div className="flex-shrink-0">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate">
                  {sessionSquadsList.length > 1
                    ? sessionSquadsList.map(s => s.name).join(' / ')
                    : squad?.name || 'Unknown Squad'} - {session.focus}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session.date && isValid(new Date(session.date)) ? format(session.date, 'EEEE, MMMM dd, yyyy') : 'Date unavailable'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="icon" onClick={() => setIsDuplicateModalOpen(true)} data-testid="button-duplicate-session">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} data-testid="button-delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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
              data-testid="tab-detail"
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
              data-testid="tab-session"
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
              data-testid="tab-attendance"
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
              data-testid="tab-feedback"
            >
              Feedback
              {activeTab === 'feedback' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scroll-container mt-4 md:mt-6">
        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2>Session Details</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditClick}
                data-testid="button-edit-session"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <h3 className="mb-4">Basic Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p>{session.date && isValid(new Date(session.date)) ? format(session.date, 'MMMM dd, yyyy') : 'Date unavailable'}</p>
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
                        <p>{location?.name || 'Unknown'} ({location?.poolType || 'Unknown'})</p>
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
                        <p>{secondCoach?.name || 'Unknown'}</p>
                      </div>
                    )}
                    {helper && (
                      <div>
                        <p className="text-sm text-muted-foreground">Helper</p>
                        <p>{helper?.name || 'Unknown'}</p>
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

        {activeTab === 'session' && (
          <div className="space-y-4">
            <div className="mb-4 space-y-2">
              {/* Row 1: Session Content heading + Save/Edit button */}
              <div className="flex items-center justify-between">
                <h2>Session Content</h2>
                {isEditingSession ? (
                  <Button 
                    size="sm" 
                    onClick={handleSaveSession}
                    data-testid="button-save-session"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsEditingSession(true);
                      setSidebarOpen(false);
                      setNotesSidebarOpen(false);
                      setDrillsSidebarOpen(false);
                    }}
                    disabled={sidebarOpen}
                    data-testid="button-edit-session"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
              
              {/* Row 2: Helper, Assistant, Template buttons (only when editing) */}
              {isEditingSession && (
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => setIsHelperOpen(true)}
                    data-testid="button-open-helper"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" style={{ color: 'var(--club-primary)' }} />
                    Helper
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => setAiChatPanelOpen(!aiChatPanelOpen)}
                    style={aiChatPanelOpen ? { backgroundColor: 'var(--club-primary-faint)', borderColor: 'var(--club-primary)' } : undefined}
                    data-testid="button-open-assistant"
                  >
                    <Sparkles className="h-4 w-4 mr-2" style={{ color: 'var(--club-primary)' }} />
                    Assistant
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handleOpenTemplateDialog}
                    data-testid="button-paste-template"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHandbookNotesOpen(!handbookNotesOpen)}
                    style={handbookNotesOpen ? { backgroundColor: 'var(--club-primary-faint)', borderColor: 'var(--club-primary)' } : undefined}
                    data-testid="button-open-handbook-notes"
                  >
                    <ListChecks className="h-4 w-4 mr-2" style={{ color: 'var(--club-primary)' }} />
                    Handbook Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDrillsLibrarySidebarOpen(!drillsLibrarySidebarOpen)}
                    style={drillsLibrarySidebarOpen ? { backgroundColor: 'var(--club-primary-faint)', borderColor: 'var(--club-primary)' } : undefined}
                    data-testid="button-open-drills-library"
                  >
                    <BookOpen className="h-4 w-4 mr-2" style={{ color: 'var(--club-primary)' }} />
                    Drills
                  </Button>
                </div>
              )}
            </div>

            <div className="relative">
              {isEditingSession ? (
                <>
                  <RichTextEditor
                    value={sessionContent}
                    onChange={setSessionContent}
                    placeholder="Enter session content..."
                  />
                  {/* Session Notes — only visible in edit mode */}
                  <div className="mt-4 border rounded-lg p-4 md:p-6 bg-card">
                    <div className="flex items-start gap-3 mb-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <h3 className="text-base font-semibold">Session Notes</h3>
                        <p className="text-sm text-muted-foreground">Add personal notes for this session (observations, reminders, etc.)</p>
                      </div>
                    </div>
                    <textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="e.g., Focus on technique, specific swimmer improvements, pool conditions..."
                      rows={4}
                      className="w-full text-sm resize-y rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 placeholder:text-muted-foreground"
                      data-testid="textarea-session-notes"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Notes are saved when you click Save above.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative border rounded-lg p-4 md:p-6 bg-card min-h-[400px]">
                    {sessionContent ? (
                      <div 
                        className="whitespace-pre-wrap font-sans text-sm"
                        dangerouslySetInnerHTML={{ __html: sessionContent }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No session content yet. Click Edit to add session details.</p>
                    )}
                    
                    {/* Distance Breakdown Toggle Button - show when content exists or calculating */}
                    {(session.distanceBreakdown || isCalculatingDistances || sessionContent) && (
                      <button
                        onClick={() => {
                          setSidebarOpen(!sidebarOpen);
                          setDrillsSidebarOpen(false);
                          setNotesSidebarOpen(false);
                        }}
                        className={cn(
                          "absolute top-4 md:top-6 border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                          sidebarOpen ? "right-[280px] md:right-80" : "right-0"
                        )}
                        data-testid="button-toggle-sidebar"
                        title="Distance Breakdown"
                      >
                        {isCalculatingDistances ? (
                          <Loader2 className={cn("h-4 w-4 text-primary animate-spin", sidebarOpen && "mr-1")} />
                        ) : (
                          <Target className={cn("h-4 w-4 text-primary", sidebarOpen && "mr-1")} />
                        )}
                        {sidebarOpen && <span className="text-xs hidden md:inline">Distance</span>}
                        <ChevronRight
                          className={cn(
                            "h-5 w-5 transition-transform",
                            sidebarOpen && "rotate-180"
                          )}
                        />
                      </button>
                    )}
                    
                    {/* Drills Toggle Button - show when content exists or calculating or drills detected */}
                    {(detectedDrills.length > 0 || isCalculatingDrills || sessionContent) && (
                      <button
                        onClick={() => {
                          setDrillsSidebarOpen(!drillsSidebarOpen);
                          setSidebarOpen(false);
                          setNotesSidebarOpen(false);
                        }}
                        className={cn(
                          "absolute border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                          (session.distanceBreakdown || isCalculatingDistances || sessionContent) ? "top-16 md:top-20" : "top-4 md:top-6",
                          drillsSidebarOpen ? "right-[280px] md:right-[30rem]" : "right-0"
                        )}
                        data-testid="button-toggle-drills-sidebar"
                        title="Session Drills"
                      >
                        {isCalculatingDrills ? (
                          <Loader2 className={cn("h-4 w-4 text-primary animate-spin", drillsSidebarOpen && "mr-1")} />
                        ) : (
                          <Play className={cn("h-4 w-4 text-primary", drillsSidebarOpen && "mr-1")} />
                        )}
                        {drillsSidebarOpen && <span className="text-xs hidden md:inline">Drills</span>}
                        <ChevronRight
                          className={cn(
                            "h-5 w-5 transition-transform",
                            drillsSidebarOpen && "rotate-180"
                          )}
                        />
                      </button>
                    )}

                    {/* Session Notes Toggle Button - only show in view mode when notes exist */}
                    {sessionNotes && (
                      <button
                        onClick={() => {
                          setNotesSidebarOpen(!notesSidebarOpen);
                          setSidebarOpen(false);
                          setDrillsSidebarOpen(false);
                        }}
                        className={cn(
                          "absolute border bg-card p-2 rounded-l-lg shadow-lg hover:bg-accent transition-all z-50 flex items-center gap-2",
                          (session.distanceBreakdown || isCalculatingDistances || sessionContent) && (detectedDrills.length > 0 || isCalculatingDrills || sessionContent)
                            ? "top-[7rem] md:top-[8.5rem]"
                            : (session.distanceBreakdown || isCalculatingDistances || sessionContent) || (detectedDrills.length > 0 || isCalculatingDrills || sessionContent)
                            ? "top-16 md:top-20"
                            : "top-4 md:top-6",
                          notesSidebarOpen ? "right-[280px] md:right-[30rem]" : "right-0"
                        )}
                        data-testid="button-toggle-notes-sidebar"
                        title="Session Notes"
                      >
                        <FileText className={cn("h-4 w-4 text-primary", notesSidebarOpen && "mr-1")} />
                        {notesSidebarOpen && <span className="text-xs hidden md:inline">Notes</span>}
                        <ChevronRight
                          className={cn(
                            "h-5 w-5 transition-transform",
                            notesSidebarOpen && "rotate-180"
                          )}
                        />
                      </button>
                    )}

                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2>Attendance Register</h2>
                <p className="text-sm text-muted-foreground">
                  {squadSwimmers.length} swimmers
                </p>
              </div>
              <Button onClick={handleSaveAttendance} size="sm" data-testid="button-save-attendance">
                <Save className="h-4 w-4 mr-2" />
                Save Attendance
              </Button>
            </div>

            <div className="border rounded-lg p-4 md:p-6 bg-card">
              <div className="space-y-1">
                {sessionSquadsList.map((sq, squadIndex) => {
                  const swimmersInSquad = squadSwimmers.filter(s => s.squadId === sq.id);
                  if (swimmersInSquad.length === 0) return null;
                  return (
                    <div key={sq.id}>
                      {squadIndex > 0 && <div className="border-t my-3" />}
                      <div className="flex items-center gap-2 mb-2 px-2 md:px-3 pt-1">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: sq.color }} />
                        <h3 className="text-sm font-semibold text-muted-foreground">{sq.name}</h3>
                        <span className="text-xs text-muted-foreground">({swimmersInSquad.length})</span>
                      </div>
                      <div className="space-y-1">
                        {swimmersInSquad.map((swimmer) => {
                          const record = attendanceRecords.find((r) => r.swimmerId === swimmer.id);
                          const status = record?.status || 'Present';
                          const notes = record?.notes || '-';
                          const isAbsent = status === 'Absent';

                          return (
                            <div
                              key={swimmer.id}
                              className="grid grid-cols-[1fr_100px_75px] md:grid-cols-[1fr_110px_80px] gap-2 md:gap-3 items-center p-2 md:p-3"
                              data-testid={`attendance-row-${swimmer.id}`}
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
                                    handleAttendanceChange(swimmer.id, 'status', value)
                                  }
                                >
                                  <SelectTrigger className="h-8 w-full text-xs md:text-sm [&>span]:truncate [&>svg]:hidden" data-testid={`select-status-${swimmer.id}`}>
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
                                    handleAttendanceChange(swimmer.id, 'notes', value)
                                  }
                                  disabled={isAbsent}
                                >
                                  <SelectTrigger disabled={isAbsent} className="h-8 w-full text-xs md:text-sm [&>span]:truncate [&>svg]:hidden" data-testid={`select-notes-${swimmer.id}`}>
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
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2>Session Feedback</h2>
              <p className="text-sm text-muted-foreground">
                Rate this session across 6 categories
              </p>
            </div>

            <div className="border rounded-lg p-4 md:p-6 bg-card">
              {currentCoach ? (
                <FeedbackForm sessionId={sessionId} coachId={currentCoach.id} />
              ) : (
                <p className="text-muted-foreground">You need to be linked to a coach profile to submit feedback.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile backdrop overlay - rendered outside scroll container for iOS Safari compatibility */}
      {activeTab === 'session' && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile backdrop for notes sidebar */}
      {activeTab === 'session' && notesSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setNotesSidebarOpen(false)}
        />
      )}


      {/* Distance breakdown sidebar - rendered outside scroll container for iOS Safari compatibility */}
      {activeTab === 'session' && (session.distanceBreakdown || isCalculatingDistances || sessionContent) && !isEditingSession && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 md:inset-y-auto md:top-[180px] md:bottom-4 md:right-4 border-l md:border md:rounded-lg bg-card overflow-y-auto transition-all duration-300 ease-in-out z-50",
            sidebarOpen ? "w-[280px] md:w-80 p-4 md:p-6" : "w-0 p-0 overflow-hidden"
          )}
        >
          {sidebarOpen && (
            <div className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2">
                  {isCalculatingDistances && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                  Distance Breakdown
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isCalculatingDistances ? 'Calculating distances...' : 'Stroke-by-stroke analysis'}
                </p>
              </div>

              {isCalculatingDistances ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <h4 className="text-muted-foreground mb-2">Calculating distances...</h4>
                  <p className="text-sm text-muted-foreground">
                    Analysing session content to calculate stroke distances
                  </p>
                </div>
              ) : !session.distanceBreakdown ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="text-muted-foreground mb-2">No distances calculated</h4>
                  <p className="text-sm text-muted-foreground">
                    Distance breakdown will appear after saving session content
                  </p>
                </div>
              ) : (
              <div className="space-y-3">
                {session.distanceBreakdown.frontCrawl > 0 && session.distanceBreakdown.frontCrawlBreakdown && (
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

                {session.distanceBreakdown.backstroke > 0 && session.distanceBreakdown.backstrokeBreakdown && (
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

                {session.distanceBreakdown.breaststroke > 0 && session.distanceBreakdown.breaststrokeBreakdown && (
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

                {session.distanceBreakdown.butterfly > 0 && session.distanceBreakdown.butterflyBreakdown && (
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

                {session.distanceBreakdown.individualMedley > 0 && session.distanceBreakdown.individualMedleyBreakdown && (
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

                {session.distanceBreakdown.no1 > 0 && session.distanceBreakdown.no1Breakdown && (
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="whitespace-nowrap">No 1</span>
                      <span className="text-primary whitespace-nowrap">{session.distanceBreakdown.no1}m</span>
                    </div>
                    <div className="pl-3 space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Swim</span>
                        <span>{session.distanceBreakdown.no1Breakdown.swim}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Drill</span>
                        <span>{session.distanceBreakdown.no1Breakdown.drill}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kick</span>
                        <span>{session.distanceBreakdown.no1Breakdown.kick}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pull</span>
                        <span>{session.distanceBreakdown.no1Breakdown.pull}m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Session Details</DialogTitle>
            <DialogDescription>
              Update the session information below
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  data-testid="input-edit-date"
                />
              </div>
              <div>
                <Label htmlFor="edit-focus">Focus *</Label>
                <Select
                  value={editFormData.focus}
                  onValueChange={(value) => setEditFormData({ ...editFormData, focus: value as SessionFocus })}
                >
                  <SelectTrigger id="edit-focus" data-testid="select-edit-focus">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startTime">Start Time *</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  data-testid="input-edit-start-time"
                />
              </div>
              <div>
                <Label htmlFor="edit-endTime">End Time *</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  data-testid="input-edit-end-time"
                />
              </div>
            </div>

            <div>
              <Label>Squad(s) *</Label>
              <div ref={editSquadDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setEditSquadDropdownOpen(!editSquadDropdownOpen)}
                  className="flex items-center justify-between w-full min-h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="select-edit-squad"
                >
                  <span className="text-muted-foreground">
                    {editSquadIds.length === 0
                      ? "Select squad(s)"
                      : `${editSquadIds.length} squad${editSquadIds.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </button>
                {editSquadDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                    {squads?.map((sq) => (
                      <button
                        key={sq.id}
                        type="button"
                        onClick={() => toggleEditSquad(sq.id)}
                        className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
                        data-testid={`option-edit-squad-${sq.id}`}
                      >
                        <div
                          className="h-4 w-4 rounded-sm border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: editSquadIds.includes(sq.id) ? sq.color : 'transparent',
                            borderColor: sq.color,
                          }}
                        >
                          {editSquadIds.includes(sq.id) && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: sq.color }} />
                        <span>{sq.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {editSquadIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {editSquadIds.map((sqId) => {
                    const sq = squads?.find(s => s.id === sqId);
                    if (!sq) return null;
                    return (
                      <Badge
                        key={sqId}
                        variant="secondary"
                        className="text-xs text-white"
                        style={{ backgroundColor: sq.color }}
                      >
                        {sq.name}
                        {editSquadIds.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleEditSquad(sqId); }}
                            className="ml-1"
                            data-testid={`remove-edit-squad-${sqId}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="edit-poolId">Location *</Label>
              <Select
                value={editFormData.poolId}
                onValueChange={(value) => setEditFormData({ ...editFormData, poolId: value })}
              >
                <SelectTrigger id="edit-poolId" data-testid="select-edit-pool">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.poolType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-leadCoachId">Lead Coach *</Label>
              <Select
                value={editFormData.leadCoachId}
                onValueChange={(value) => setEditFormData({ ...editFormData, leadCoachId: value })}
              >
                <SelectTrigger id="edit-leadCoachId" data-testid="select-edit-lead-coach">
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

            <div>
              <Label htmlFor="edit-secondCoachId">Second Coach</Label>
              <Select
                value={editFormData.secondCoachId}
                onValueChange={(value) => setEditFormData({ ...editFormData, secondCoachId: value })}
              >
                <SelectTrigger id="edit-secondCoachId" data-testid="select-edit-second-coach">
                  <SelectValue placeholder="Select second coach (optional)" />
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

            <div>
              <Label htmlFor="edit-helperId">Helper</Label>
              <Select
                value={editFormData.helperId}
                onValueChange={(value) => setEditFormData({ ...editFormData, helperId: value })}
              >
                <SelectTrigger id="edit-helperId" data-testid="select-edit-helper">
                  <SelectValue placeholder="Select helper (optional)" />
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

            <div>
              <Label htmlFor="edit-setWriterId">Set Writer *</Label>
              <Select
                value={editFormData.setWriterId}
                onValueChange={(value) => setEditFormData({ ...editFormData, setWriterId: value })}
              >
                <SelectTrigger id="edit-setWriterId" data-testid="select-edit-set-writer">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-save-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-template-selection">
          <DialogHeader>
            <DialogTitle>Select Template to Paste</DialogTitle>
            <DialogDescription>
              Choose a template to paste below your existing session content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              data-testid="input-search-templates-dialog"
            />

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {templates
                .filter(t => 
                  templateSearch === '' || 
                  t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  (t.templateDescription && t.templateDescription.toLowerCase().includes(templateSearch.toLowerCase()))
                )
                .map((template) => (
                  <Card 
                    key={template.id}
                    className="p-4 hover-elevate cursor-pointer"
                    onClick={() => handlePasteTemplate(template)}
                    data-testid={`card-template-select-${template.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">
                          {template.templateName}
                        </h3>
                        {template.templateDescription && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.templateDescription}
                          </p>
                        )}
                      </div>
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                  </Card>
                ))}

              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates available</p>
                  <p className="text-sm mt-1">Visit Session Library to create templates</p>
                </div>
              )}

              {templates.length > 0 && templates.filter(t => 
                templateSearch === '' || 
                t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) ||
                (t.templateDescription && t.templateDescription.toLowerCase().includes(templateSearch.toLowerCase()))
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates match your search</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsTemplateDialogOpen(false)}
              data-testid="button-cancel-template-selection"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-session">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this session ({session?.focus} - {session?.date && isValid(new Date(session.date)) ? format(session.date, 'MMM dd, yyyy') : 'Unknown date'})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteSessionMutation.isPending}
              data-testid="button-confirm-delete-session"
            >
              {deleteSessionMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drills Sidebar */}
      <DrillsSidebar 
        open={drillsSidebarOpen}
        onOpenChange={setDrillsSidebarOpen}
        detectedDrills={detectedDrills}
        isCalculating={isCalculatingDrills}
      />

      {/* Drills Library Sidebar - browse full drills library while editing */}
      <DrillsLibrarySidebar
        open={drillsLibrarySidebarOpen}
        onOpenChange={setDrillsLibrarySidebarOpen}
      />

      {/* Notes Sidebar - rendered outside scroll container for iOS Safari compatibility */}
      {activeTab === 'session' && sessionNotes && !isEditingSession && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 md:inset-y-auto md:top-[180px] md:bottom-4 md:right-4 border-l md:border md:rounded-lg bg-card overflow-y-auto transition-all duration-300 ease-in-out z-50",
            notesSidebarOpen ? "w-[280px] md:w-80 p-4 md:p-6" : "w-0 p-0 overflow-hidden"
          )}
        >
          {notesSidebarOpen && (
            <div className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Session Notes
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Coach notes for this session
                </p>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {sessionNotes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Handbook Notes Panel - slides in from right in edit mode */}
      {handbookNotesOpen && isEditingSession && activeTab === 'session' && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setHandbookNotesOpen(false)}
          />
          {/* Panel */}
          <div
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-background border-l shadow-xl z-50 flex flex-col"
            data-testid="panel-handbook-notes"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b shrink-0">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-base">
                  <ListChecks className="h-5 w-5" style={{ color: 'var(--club-primary)' }} />
                  Training Notes
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {squadTrainingNotes.length} active note{squadTrainingNotes.length !== 1 ? 's' : ''} for this squad
                </p>
              </div>
              <button
                onClick={() => setHandbookNotesOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                aria-label="Close handbook notes"
                data-testid="button-close-handbook-notes"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              {squadTrainingNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center gap-3 min-h-[300px]">
                  <div className="text-muted-foreground/40">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">No active notes</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                      No open notes found for this squad. Add notes in the Handbook section.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {squadTrainingNotes.map((note: any) => (
                    <div key={note.id} className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0" data-testid={`training-note-${note.id}`}>
                      <p className="font-medium text-sm leading-snug">{note.title}</p>
                      {note.type === 'text' && note.content && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{note.content}</p>
                      )}
                      {note.type === 'checklist' && note.items && note.items.length > 0 && (
                        <div className="space-y-2">
                          {note.items.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2.5">
                              <Checkbox
                                id={`hb-item-${item.id}`}
                                checked={item.completed}
                                onCheckedChange={(checked) => {
                                  toggleNoteItemMutation.mutate({ itemId: item.id, completed: !!checked });
                                }}
                                className="mt-0.5 shrink-0"
                                data-testid={`checkbox-note-item-${item.id}`}
                              />
                              <label
                                htmlFor={`hb-item-${item.id}`}
                                className={cn(
                                  "text-sm leading-snug cursor-pointer",
                                  item.completed && "line-through text-muted-foreground"
                                )}
                              >
                                {item.text}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}

      {/* Session Writer Helper */}
      <SessionWriterHelper
        isOpen={isHelperOpen}
        onClose={() => setIsHelperOpen(false)}
        squadId={session?.squadId}
        sessionFocus={session?.focus}
        squads={backendSquads as SchemaSquad[]}
      />

      {/* AI Assistant Panel */}
      {aiChatPanelOpen && isEditingSession && squad && (
        <AiChatPanel
          isOpen={aiChatPanelOpen}
          onClose={() => setAiChatPanelOpen(false)}
          sessionId={sessionId}
          sessionContext={{
            squad: squad,
            sessionDate: session.date,
            sessionDuration: undefined,
            poolLength: location?.poolType === '50m' ? 50 : 25,
            sessionFocus: session.focus,
            currentContent: sessionContent,
          }}
          onInsertContent={(content) => {
            const newContent = sessionContent 
              ? `${sessionContent}\n\n${content}`
              : content;
            setSessionContent(newContent);
          }}
        />
      )}

      {backendSession && (
        <DuplicateSessionModal
          session={backendSession}
          open={isDuplicateModalOpen}
          onOpenChange={setIsDuplicateModalOpen}
          onDuplicated={onNavigateToSession}
        />
      )}
    </div>
  );
}
