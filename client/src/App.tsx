import { useState, useEffect, useMemo } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Route, Switch, useLocation } from "wouter";
import LoadingScreen from "@/components/LoadingScreen";
import LoginPage from "@/pages/login-page";
import RegistrationPage from "@/pages/registration-page";
import RegisterClubPage from "@/pages/register-club-page";
import { MonthCalendarView } from '@/pages/month-calendar-view';
import { DayCalendarView } from '@/pages/day-calendar-view';
import { DayListView } from '@/pages/day-list-view';
import { SessionDetail } from '@/pages/session-detail-view';
import { AddSession } from '@/pages/add-session';
import { ManageCoaches } from '@/pages/manage-coaches';
import { ManageSquads } from '@/pages/manage-squads';
import { ManageSwimmers } from '@/pages/manage-swimmers';
import { ManageLocations } from '@/pages/manage-locations';
import { ManageInvitations } from '@/pages/manage-invitations';
import { ManageCompetitions } from '@/pages/manage-competitions';
import { InvoiceTracker } from '@/pages/invoice-tracker';
import { ManageCoachingRates } from '@/pages/manage-coaching-rates';
import { SessionLibrary } from '@/pages/session-library';
import { DrillsLibrary } from '@/pages/drills-library';
import { FeedbackAnalytics } from '@/pages/feedback-analytics';
import { Handbook } from '@/pages/handbook';
import { CompetitionDetailModal } from '@/components/CompetitionDetailModal';
import { HomePage } from '@/components/HomePage';
import { SwimmerProfiles } from '@/components/SwimmerProfiles';
import { SwimmerProfilePage } from '@/components/SwimmerProfilePage';
import { SessionSearch } from '@/components/SessionSearch';
import { Button } from './components/ui/button';
import { Switch as ToggleSwitch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Users,
  MapPin,
  UserCog,
  Plus,
  LogOut,
  Menu,
  CalendarDays,
  List,
  Mail,
  Trophy,
  FileText,
  PoundSterling,
  Target,
  BarChart3,
  Shield,
  Receipt,
  Home,
  Search,
  X,
  BookOpen,
  Settings,
} from 'lucide-react';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { Badge } from './components/ui/badge';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { cn } from './lib/utils';
import type { Session, Squad, Location, Coach, Swimmer } from './lib/typeAdapters';
import { 
  adaptSession, 
  adaptSquad, 
  adaptLocation, 
  adaptCoach, 
  adaptSwimmer,
  adaptSessionToBackend
} from './lib/typeAdapters';
import type {
  SwimmingSession as BackendSession,
  Squad as BackendSquad,
  Location as BackendLocation,
  Coach as BackendCoach,
  Swimmer as BackendSwimmer,
  Competition,
  CompetitionCoaching,
  Attendance,
  SessionFeedback,
  SessionSquad,
} from '@shared/schema';

type View = 'month' | 'day';
type MobileView = 'calendar' | 'list' | 'search';
type ManagementView = 'home' | 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'invitations' | 'competitions' | 'addSession' | 'invoices' | 'coachingRates' | 'sessionLibrary' | 'drillsLibrary' | 'feedbackAnalytics' | 'swimmerProfiles' | 'swimmerProfile' | 'handbook' | 'clubSettings';

// Global storage for pending session ID from notification deep link
// This is set before CalendarApp mounts and read when it does
let pendingDeepLinkSessionId: string | null = null;

export function getPendingSessionId(): string | null {
  const id = pendingDeepLinkSessionId;
  pendingDeepLinkSessionId = null; // Clear after reading
  return id;
}

export function setPendingSessionId(sessionId: string): void {
  pendingDeepLinkSessionId = sessionId;
  console.log('[DeepLink] Stored pending session ID:', sessionId);
}

// ── Club colour derivation ─────────────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function applyClubColours(hex: string) {
  document.documentElement.style.setProperty('--club-primary', hex);
  document.documentElement.style.setProperty('--club-primary-faint', hex + '20');

  const [h, , l] = hexToHsl(hex);
  const baseL = Math.max(35, Math.min(50, l));
  const sat = 70;

  // Four card gradient pairs — hue offsets mirror the green→emerald→teal/lime spread
  const cards = [
    { hOff: 22,  lStart: baseL + 2, lEnd: baseL - 5  }, // attendance   (~green)
    { hOff: 40,  lStart: baseL - 2, lEnd: baseL - 9  }, // distance     (~emerald)
    { hOff: 65,  lStart: baseL - 5, lEnd: baseL - 13 }, // training     (~teal)
    { hOff: -36, lStart: baseL + 2, lEnd: baseL - 5  }, // competitions (~lime)
  ];

  cards.forEach(({ hOff, lStart, lEnd }, i) => {
    const hue = ((h + hOff) % 360 + 360) % 360;
    document.documentElement.style.setProperty(
      `--club-card-${i + 1}-start`,
      `hsl(${hue.toFixed(0)}, ${sat}%, ${lStart.toFixed(0)}%)`
    );
    document.documentElement.style.setProperty(
      `--club-card-${i + 1}-end`,
      `hsl(${hue.toFixed(0)}, ${sat}%, ${lEnd.toFixed(0)}%)`
    );
  });
}

// Club Settings View component (admin only)
function ClubSettingsView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [colour, setColour] = useState(user?.clubColor || '#4B9A4A');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiRequest('PATCH', '/api/club/settings', { clubColor: colour });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
      applyClubColours(colour);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      toast({ title: 'Club colour saved', description: 'The brand colour has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 p-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-club-settings">
          <Settings className="h-4 w-4 mr-2" />
          Club Settings
        </Button>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Club Branding</h2>
        <p className="text-sm text-muted-foreground">Choose a brand colour that represents your club. This colour appears throughout the app.</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="club-colour-picker">Brand Colour</label>
            <input
              id="club-colour-picker"
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-md border border-input"
              data-testid="input-club-colour"
            />
          </div>
          <div
            className="h-10 flex-1 rounded-md border border-border flex items-center justify-center text-sm font-mono"
            style={{ backgroundColor: colour + '20', color: colour, borderColor: colour + '60' }}
          >
            {colour.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: colour }}
          >
            SC
          </div>
          <div className="text-sm text-muted-foreground">Preview of how your colour appears on avatars and accents</div>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} data-testid="button-save-club-colour">
        {saving ? 'Saving…' : 'Save colour'}
      </Button>
    </div>
  );
}

// Landing page with loading screen logic - ONLY for "/" route
function LandingPage() {
  const [redirectAfterDelay, setRedirectAfterDelay] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading screen for 2 seconds, then enable redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirectAfterDelay(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // After 2s delay AND auth check completes, redirect based on auth status
  useEffect(() => {
    if (redirectAfterDelay && !isLoading) {
      if (isAuthenticated) {
        setLocation('/app');
      } else {
        setLocation('/login');
      }
    }
  }, [redirectAfterDelay, isLoading, isAuthenticated, setLocation]);

  // Always show loading screen (this component is ONLY rendered on "/" route)
  return <LoadingScreen />;
}

function CalendarApp() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Inject CSS variables for club colour whenever the user/club colour changes
  useEffect(() => {
    applyClubColours(user?.clubColor || '#4B9A4A');
  }, [user?.clubColor]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [selectedSwimmerId, setSelectedSwimmerId] = useState<string | null>(null);
  const [view, setView] = useState<View>('month');
  const [mobileView, setMobileView] = useState<MobileView>('calendar');
  const [managementView, setManagementView] = useState<ManagementView>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);
  const [desktopSearchActive, setDesktopSearchActive] = useState(false);
  const [desktopSearchQuery, setDesktopSearchQuery] = useState('');

  // iOS Push Notification Device Token Bridge
  useEffect(() => {
    // Define handler for receiving device token from Swift
    (window as any).registerDeviceToken = async (token: string) => {
      try {
        const response = await fetch('/api/device-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ deviceToken: token, platform: 'ios' })
        });
        if (response.ok) {
          console.log('Device token registered successfully');
        } else {
          console.error('Failed to register device token:', response.status);
        }
      } catch (error) {
        console.error('Error registering device token:', error);
      }
    };

    return () => {
      delete (window as any).registerDeviceToken;
    };
  }, []);

  // Check for pending deep link session ID (from notification tap) on mount
  useEffect(() => {
    // Check global pending session ID first (set by window.openSession before this component mounted)
    const pendingId = getPendingSessionId();
    if (pendingId) {
      console.log('[DeepLink] Found pending session ID on mount:', pendingId);
      setSelectedSessionId(pendingId);
      setManagementView('calendar');
      return;
    }

    // Also check URL parameters (backup method)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    if (sessionId) {
      console.log('[DeepLink] Found session ID in URL:', sessionId);
      setSelectedSessionId(sessionId);
      setManagementView('calendar');
      // Clean up URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen for openSessionEvent - handles case when window.openSession is called
  // AFTER this component has already mounted (warm start from notification tap)
  useEffect(() => {
    const handleOpenSessionEvent = (event: CustomEvent<{ sessionId: string }>) => {
      const { sessionId } = event.detail;
      console.log('[DeepLink] Received openSessionEvent:', sessionId);
      setSelectedSessionId(sessionId);
      setManagementView('calendar');
    };

    window.addEventListener('openSessionEvent', handleOpenSessionEvent as EventListener);
    
    return () => {
      window.removeEventListener('openSessionEvent', handleOpenSessionEvent as EventListener);
    };
  }, []);

  // Fetch all data from backend APIs
  const { data: backendSessions = [] } = useQuery<BackendSession[]>({ 
    queryKey: ['/api/sessions'],
  });
  
  const { data: backendSquads = [] } = useQuery<BackendSquad[]>({ 
    queryKey: ['/api/squads'],
  });
  
  const { data: backendLocations = [] } = useQuery<BackendLocation[]>({ 
    queryKey: ['/api/locations'],
  });
  
  const { data: backendCoaches = [] } = useQuery<BackendCoach[]>({ 
    queryKey: ['/api/coaches'],
  });
  
  const { data: backendSwimmers = [] } = useQuery<BackendSwimmer[]>({ 
    queryKey: ['/api/swimmers'],
  });

  // Fetch competitions
  const { data: competitions = [] } = useQuery<Competition[]>({ 
    queryKey: ['/api/competitions'],
  });

  // Fetch all competition coaching assignments
  const { data: competitionCoaching = [] } = useQuery<CompetitionCoaching[]>({ 
    queryKey: ['/api/competitions/coaching/all'],
  });

  // Fetch session templates count for sidebar
  const { data: sessionTemplates = [] } = useQuery<{ id: string }[]>({ 
    queryKey: ['/api/session-templates'],
  });

  // Fetch drills count for sidebar
  const { data: drills = [] } = useQuery<{ id: string }[]>({ 
    queryKey: ['/api/drills'],
  });

  // Fetch attendance for home dashboard
  const { data: allAttendance = [] } = useQuery<Attendance[]>({ 
    queryKey: ['/api/attendance'],
  });

  // Fetch session feedback for home dashboard
  const { data: sessionFeedback = [] } = useQuery<SessionFeedback[]>({ 
    queryKey: ['/api/feedback'],
  });

  // Fetch all session-squad mappings for multi-squad display
  const { data: allSessionSquads = [] } = useQuery<SessionSquad[]>({
    queryKey: ['/api/session-squads'],
  });

  // Build a lookup: sessionId -> squadId[]
  const sessionSquadMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ss of allSessionSquads) {
      if (!map[ss.sessionId]) map[ss.sessionId] = [];
      map[ss.sessionId].push(ss.squadId);
    }
    return map;
  }, [allSessionSquads]);

  // Adapt backend data to frontend types
  const sessions = useMemo(
    () => backendSessions.map(s => adaptSession(s)),
    [backendSessions]
  );
  
  const squads = useMemo(
    () => backendSquads.map(s => adaptSquad(s)),
    [backendSquads]
  );
  
  const locations = useMemo(
    () => backendLocations.map(l => adaptLocation(l)),
    [backendLocations]
  );
  
  const coaches = useMemo(
    () => backendCoaches.map(c => adaptCoach(c)),
    [backendCoaches]
  );
  
  const swimmers = useMemo(
    () => backendSwimmers.map(s => adaptSwimmer(s)),
    [backendSwimmers]
  );

  // Find current coach based on authenticated user
  const currentCoachId = coaches.find(c => c.userId === user?.id)?.id;
  
  const currentCoach = coaches.find(c => c.id === currentCoachId);
  
  // Filter sessions based on toggle
  const filteredSessions = useMemo(() => {
    if (showMySessionsOnly && currentCoachId) {
      return sessions.filter(session => 
        session.leadCoachId === currentCoachId || 
        session.secondCoachId === currentCoachId ||
        session.helperId === currentCoachId
      );
    }
    return sessions;
  }, [showMySessionsOnly, sessions, currentCoachId]);

  // Filter competitions based on toggle
  const filteredCompetitions = useMemo(() => {
    if (showMySessionsOnly && currentCoachId) {
      // Get all competition IDs where current coach has a coaching assignment
      const myCompetitionIds = new Set(
        competitionCoaching
          .filter(cc => cc.coachId === currentCoachId)
          .map(cc => cc.competitionId)
      );
      return competitions.filter(comp => myCompetitionIds.has(comp.id));
    }
    return competitions;
  }, [showMySessionsOnly, competitions, competitionCoaching, currentCoachId]);
  
  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await apiRequest('POST', '/api/auth/logout', {});
      
      // Invalidate auth cache to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the request fails, try to clear local state and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      window.location.href = '/login';
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToMonth = () => {
    setView('month');
    setSelectedDate(null);
  };

  const handleManagementClick = (viewType: ManagementView) => {
    setSelectedSessionId(null);
    setManagementView(viewType);
    setSidebarOpen(false);
  };
  
  const handleBackToCalendar = () => {
    setManagementView('calendar');
  };

  const handleBackToHome = () => {
    setManagementView('home');
  };

  const handleNavigateToSwimmerProfile = (swimmer: Swimmer) => {
    setSelectedSwimmerId(swimmer.id);
    setManagementView('swimmerProfile');
  };

  const handleBackFromSwimmerProfile = () => {
    setSelectedSwimmerId(null);
    setManagementView('swimmerProfiles');
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSessionId(session.id);
  };

  const handleBackFromSession = () => {
    setSelectedSessionId(null);
  };

  const handleCompetitionClick = (competition: Competition) => {
    setSelectedCompetitionId(competition.id);
  };

  const handleCloseCompetitionModal = () => {
    setSelectedCompetitionId(null);
  };

  const handleAddSession = () => {
    setManagementView('addSession');
  };

  const handleCancelAddSession = () => {
    setManagementView('calendar');
  };

  const createSessionMutation = useMutation({
    mutationFn: async (session: Omit<Session, 'id'>) => {
      const backendSession = adaptSessionToBackend(session);
      const response = await apiRequest('POST', '/api/sessions', backendSession);
      return response.json();
    },
    onSuccess: async (backendSession: BackendSession) => {
      // Refetch all data to ensure cache is up to date
      await queryClient.refetchQueries({ queryKey: ['/api/sessions'] });
      
      // Set the newly created session as selected
      setSelectedSessionId(backendSession.id);
      setManagementView('calendar');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveSession = (session: Omit<Session, 'id'>) => {
    createSessionMutation.mutate(session);
  };

  const isActive = (view: string) => managementView === view;
  
  const todaysSessions = sessions.filter(s => 
    format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;

  const initials = currentCoach 
    ? `${currentCoach.firstName[0]}${currentCoach.lastName[0]}`.toUpperCase()
    : 'SC';

  const isAdmin = user?.role === 'admin';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Profile Section */}
      <div className="p-4 border-b" style={{ borderBottomColor: 'var(--club-primary)' }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{ backgroundColor: 'var(--club-primary)' }}
            data-testid="avatar-initials-mobile"
          >
            {initials}
          </div>
          {currentCoach && (
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate" data-testid="text-coach-name-mobile">
                {currentCoach.firstName} {currentCoach.lastName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0"
                  style={{ backgroundColor: 'var(--club-primary-faint)', color: 'var(--club-primary)' }}
                  data-testid="badge-coach-level-mobile"
                >
                  {currentCoach.level}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1" data-testid="text-sessions-today-mobile">
                {todaysSessions} session{todaysSessions !== 1 ? 's' : ''} today
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* HOME Section */}
          <div>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                isActive('home') && "bg-accent/50"
              )}
              onClick={() => handleManagementClick('home')}
              data-testid="button-nav-home-mobile"
            >
              {isActive('home') && (
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                  style={{ backgroundColor: 'var(--club-primary)' }}
                />
              )}
              <Home 
                className={cn(
                  "h-4 w-4 mr-3 ml-2 transition-colors",
                  "text-muted-foreground"
                )}
                style={{ color: isActive('home') ? 'var(--club-primary)' : undefined }}
              />
              <span className="flex-1 text-left">Home</span>
            </Button>
          </div>

          {/* SESSIONS Section */}
          <div>
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sessions
              </p>
            </div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('calendar') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('calendar')}
                data-testid="button-nav-calendar-mobile"
              >
                {isActive('calendar') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <CalendarDays 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('calendar') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Calendar</span>
                {todaysSessions > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {todaysSessions}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('sessionLibrary') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('sessionLibrary')}
                data-testid="button-session-library"
              >
                {isActive('sessionLibrary') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <FileText 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('sessionLibrary') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Session Library</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {sessionTemplates.length}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('drillsLibrary') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('drillsLibrary')}
                data-testid="button-drills-library"
              >
                {isActive('drillsLibrary') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <Target 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('drillsLibrary') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Drills Library</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {drills.length}
                </Badge>
              </Button>
            </div>
          </div>

          {/* MANAGEMENT Section - Admin Only */}
          {isAdmin && (
            <div>
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Management
                </p>
              </div>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('coaches') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('coaches')}
                  data-testid="button-manage-coaches"
                >
                  {isActive('coaches') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <UserCog 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('coaches') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Coaches</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {coaches.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('squads') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('squads')}
                  data-testid="button-manage-squads"
                >
                  {isActive('squads') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <Shield 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('squads') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Squads</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {squads.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('swimmers') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('swimmers')}
                  data-testid="button-manage-swimmers"
                >
                  {isActive('swimmers') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <Users 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('swimmers') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Swimmers</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {swimmers.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('locations') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('locations')}
                  data-testid="button-manage-locations"
                >
                  {isActive('locations') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <MapPin 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('locations') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Locations</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {locations.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('competitions') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('competitions')}
                  data-testid="button-manage-competitions"
                >
                  {isActive('competitions') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <Trophy 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('competitions') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Competitions</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {competitions.length}
                  </Badge>
                </Button>

                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('invitations') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('invitations')}
                  data-testid="button-manage-invitations"
                >
                  {isActive('invitations') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <Mail 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('invitations') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Coach Invitations</span>
                </Button>

                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('coachingRates') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('coachingRates')}
                  data-testid="button-coaching-rates"
                >
                  {isActive('coachingRates') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <PoundSterling 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('coachingRates') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Coaching Rates</span>
                </Button>

                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                    isActive('clubSettings') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('clubSettings')}
                  data-testid="button-club-settings-mobile"
                >
                  {isActive('clubSettings') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: 'var(--club-primary)' }}
                    />
                  )}
                  <Settings 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      "text-muted-foreground"
                    )}
                    style={{ color: isActive('clubSettings') ? 'var(--club-primary)' : undefined }}
                  />
                  <span className="flex-1 text-left">Club Settings</span>
                </Button>
              </div>
            </div>
          )}

          {/* MY TOOLS Section */}
          <div>
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Tools
              </p>
            </div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('invoices') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('invoices')}
                data-testid="button-invoices"
              >
                {isActive('invoices') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <Receipt 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('invoices') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Invoice Tracker</span>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('feedbackAnalytics') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('feedbackAnalytics')}
                data-testid="button-feedback-analytics"
              >
                {isActive('feedbackAnalytics') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <BarChart3 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('feedbackAnalytics') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Feedback Analytics</span>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  (isActive('swimmerProfiles') || isActive('swimmerProfile')) && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('swimmerProfiles')}
                data-testid="button-swimmer-profiles-mobile"
              >
                {(isActive('swimmerProfiles') || isActive('swimmerProfile')) && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <UserCog 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: (isActive('swimmerProfiles') || isActive('swimmerProfile')) ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Swimmer Profiles</span>
              </Button>

              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-2.5 relative transition-all duration-200 hover:scale-[1.02]",
                  isActive('handbook') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('handbook')}
                data-testid="button-handbook-mobile"
              >
                {isActive('handbook') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: 'var(--club-primary)' }}
                  />
                )}
                <BookOpen 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    "text-muted-foreground"
                  )}
                  style={{ color: isActive('handbook') ? 'var(--club-primary)' : undefined }}
                />
                <span className="flex-1 text-left">Handbook</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start mb-3"
          onClick={handleLogout}
          data-testid="button-logout-sidebar"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
        <div className="text-xs text-center text-muted-foreground" data-testid="text-version-mobile">
          v2.1.0 • Hart SC
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex overflow-hidden bg-background">
      <CollapsibleSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        managementView={managementView}
        onNavigate={handleManagementClick}
        onLogout={handleLogout}
        currentCoach={currentCoach}
        sessions={sessions}
        sessionTemplatesCount={sessionTemplates.length}
        drillsCount={drills.length}
        coaches={coaches}
        squads={squads}
        swimmers={swimmers}
        locations={locations}
        competitionsCount={competitions.length}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card p-4" style={{ borderBottom: '1px solid var(--club-primary)' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-sidebar-toggle"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">Access management options for coaches, squads, swimmers, and locations</SheetDescription>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {managementView === 'calendar' && (
                <>
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-lg bg-muted/50">
                    <Label htmlFor="my-sessions-toggle" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                      My Sessions
                    </Label>
                    <ToggleSwitch
                      id="my-sessions-toggle"
                      checked={showMySessionsOnly}
                      onCheckedChange={setShowMySessionsOnly}
                      data-testid="switch-my-sessions"
                    />
                  </div>
                  
                  <Button onClick={handleAddSession} size="default" data-testid="button-add-session">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {managementView === 'calendar' && (
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5" data-testid="tab-calendar">
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5" data-testid="tab-list">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                    <TabsTrigger value="search" className="gap-1.5" data-testid="tab-search">
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Search</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
        </header>

        <main className={cn(
          "flex-1 overflow-auto scroll-container",
          selectedSessionId ? "p-0" : "p-4 md:p-6"
        )}>
          {selectedSessionId ? (
            <div className="h-full p-4 md:p-6">
              <SessionDetail
                sessionId={selectedSessionId}
                locations={locations}
                coaches={coaches}
                swimmers={swimmers}
                coachId={currentCoach?.id}
                onBack={handleBackFromSession}
                onNavigateToSession={setSelectedSessionId}
              />
            </div>
          ) : managementView === 'addSession' ? (
            <AddSession
              squads={squads}
              locations={locations}
              coaches={coaches}
              onSave={handleSaveSession}
              onCancel={handleCancelAddSession}
            />
          ) : managementView === 'coaches' ? (
            <ManageCoaches coaches={coaches} onBack={handleBackToHome} />
          ) : managementView === 'squads' ? (
            <ManageSquads squads={squads} coaches={coaches} onBack={handleBackToHome} />
          ) : managementView === 'swimmers' ? (
            <ManageSwimmers swimmers={swimmers} squads={squads} onBack={handleBackToHome} />
          ) : managementView === 'locations' ? (
            <ManageLocations locations={locations} onBack={handleBackToHome} />
          ) : managementView === 'invitations' ? (
            <ManageInvitations onBack={handleBackToHome} />
          ) : managementView === 'competitions' ? (
            <ManageCompetitions onBack={handleBackToHome} />
          ) : managementView === 'invoices' ? (
            <InvoiceTracker onBack={handleBackToHome} />
          ) : managementView === 'coachingRates' ? (
            <ManageCoachingRates onBack={handleBackToHome} />
          ) : managementView === 'sessionLibrary' ? (
            <SessionLibrary onBack={handleBackToHome} />
          ) : managementView === 'drillsLibrary' ? (
            <DrillsLibrary onBack={handleBackToHome} />
          ) : managementView === 'feedbackAnalytics' ? (
            <FeedbackAnalytics onBack={handleBackToHome} />
          ) : managementView === 'handbook' ? (
            currentCoach ? (
              <Handbook coach={currentCoach} squads={squads} onBack={handleBackToHome} />
            ) : null
          ) : managementView === 'swimmerProfiles' ? (
            currentCoach ? (
              <SwimmerProfiles
                swimmers={swimmers}
                sessions={sessions}
                squads={squads}
                coach={currentCoach}
                attendance={allAttendance}
                onSelectSwimmer={handleNavigateToSwimmerProfile}
                onBack={handleBackToHome}
              />
            ) : null
          ) : managementView === 'swimmerProfile' && selectedSwimmerId ? (
            <SwimmerProfilePage
              swimmer={swimmers.find(s => s.id === selectedSwimmerId)!}
              sessions={sessions}
              squads={squads}
              attendance={allAttendance}
              onBack={handleBackFromSwimmerProfile}
            />
          ) : managementView === 'clubSettings' ? (
            <ClubSettingsView onBack={handleBackToHome} />
          ) : managementView === 'home' ? (
            currentCoach ? (
              <div className="px-2 pt-2 pb-4 overflow-y-auto">
                <HomePage
                  coach={currentCoach}
                  sessions={sessions}
                  squads={squads}
                  swimmers={swimmers}
                  locations={locations}
                  competitions={competitions}
                  competitionCoaching={competitionCoaching}
                  attendance={allAttendance}
                  sessionFeedback={sessionFeedback}
                  sessionSquadMap={sessionSquadMap}
                  onNavigateToSession={(session) => {
                    setSelectedSessionId(session.id);
                    setManagementView('calendar');
                  }}
                  onNavigateToCalendar={() => setManagementView('calendar')}
                  onAddSession={handleAddSession}
                  onNavigateToSwimmerProfile={handleNavigateToSwimmerProfile}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-lg">Loading...</p>
              </div>
            )
          ) : view === 'month' ? (
            <>
              {/* Desktop: Inline search bar when search is active */}
              {desktopSearchActive && (
                <div className="hidden lg:block px-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search sessions by squad, coach, location, focus, or content..."
                      value={desktopSearchQuery}
                      onChange={(e) => setDesktopSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      data-testid="input-desktop-search"
                    />
                    {desktopSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDesktopSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover-elevate"
                        data-testid="button-clear-search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop: Show search results when there's a query */}
              {desktopSearchActive && desktopSearchQuery.trim() && (
                <div className="hidden lg:block h-full overflow-auto">
                  <SessionSearch
                    sessions={sessions}
                    squads={squads}
                    coaches={coaches}
                    locations={locations}
                    onSessionClick={(session) => {
                      handleSessionClick(session);
                      setDesktopSearchActive(false);
                      setDesktopSearchQuery('');
                    }}
                    externalSearchQuery={desktopSearchQuery}
                  />
                </div>
              )}

              {/* Calendar: Always visible on mobile when mobileView='calendar', visible on desktop when search has no query */}
              <div className={`${mobileView === 'calendar' ? 'block' : 'hidden lg:block'} ${desktopSearchActive && desktopSearchQuery.trim() ? 'lg:hidden' : ''}`}>
                <MonthCalendarView
                  sessions={filteredSessions}
                  competitions={filteredCompetitions}
                  competitionCoaching={competitionCoaching}
                  squads={squads}
                  sessionSquadMap={sessionSquadMap}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                  onCompetitionClick={handleCompetitionClick}
                  showMySessionsOnly={showMySessionsOnly}
                  currentCoachId={currentCoachId}
                  onSearchClick={() => setDesktopSearchActive(!desktopSearchActive)}
                  isSearchActive={desktopSearchActive}
                />
              </div>
              
              <div className={mobileView === 'list' ? 'block lg:hidden' : 'hidden'}>
                <DayListView
                  sessions={filteredSessions}
                  competitions={filteredCompetitions}
                  competitionCoaching={competitionCoaching}
                  squads={squads}
                  sessionSquadMap={sessionSquadMap}
                  locations={locations}
                  coaches={coaches}
                  currentDate={currentDate}
                  onSessionClick={handleSessionClick}
                  onCompetitionClick={handleCompetitionClick}
                  showMySessionsOnly={showMySessionsOnly}
                  currentCoachId={currentCoachId}
                />
              </div>

              <div className={mobileView === 'search' ? 'block lg:hidden h-full' : 'hidden'}>
                <SessionSearch
                  sessions={sessions}
                  squads={squads}
                  coaches={coaches}
                  locations={locations}
                  onSessionClick={handleSessionClick}
                />
              </div>
            </>
          ) : (
            selectedDate && (
              <DayCalendarView
                sessions={filteredSessions}
                competitions={filteredCompetitions}
                competitionCoaching={competitionCoaching}
                squads={squads}
                sessionSquadMap={sessionSquadMap}
                locations={locations}
                selectedDate={selectedDate}
                onBack={handleBackToMonth}
                onSessionClick={handleSessionClick}
                onCompetitionClick={handleCompetitionClick}
                showMySessionsOnly={showMySessionsOnly}
                currentCoachId={currentCoachId}
              />
            )
          )}
        </main>
      </div>

      {/* Competition Detail Modal */}
      <CompetitionDetailModal
        competition={competitions.find(c => c.id === selectedCompetitionId) || null}
        competitionCoaching={competitionCoaching}
        locations={backendLocations}
        coaches={backendCoaches}
        open={!!selectedCompetitionId}
        onClose={handleCloseCompetitionModal}
      />

    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Longer paths MUST come first to avoid "/" prefix matching */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegistrationPage} />
      <Route path="/register-club" component={RegisterClubPage} />
      <Route path="/app">
        <ProtectedRoute>
          <CalendarApp />
        </ProtectedRoute>
      </Route>
      {/* Root path at the end - only matches exact "/" */}
      <Route path="/" component={LandingPage} />
      {/* 404 fallback - no path prop means it matches anything not already matched */}
      <Route>
        <LandingPage />
      </Route>
    </Switch>
  );
}

export default function App() {
  // Define global window.openSession handler at root level
  // This ensures it exists before CalendarApp mounts
  useEffect(() => {
    (window as any).openSession = (sessionId: string) => {
      console.log('[DeepLink] window.openSession called with:', sessionId);
      
      // Store pending ID for cold start scenario (CalendarApp not mounted yet)
      setPendingSessionId(sessionId);
      
      // Dispatch custom event for warm scenario (CalendarApp already mounted)
      // This allows CalendarApp to receive the session ID even after its initial useEffect ran
      console.log('[DeepLink] Dispatching openSessionEvent');
      window.dispatchEvent(new CustomEvent('openSessionEvent', { 
        detail: { sessionId } 
      }));
      
      // If we're not on /app, navigate there with sessionId param as backup
      if (!window.location.pathname.includes('/app')) {
        window.location.href = `/app?sessionId=${sessionId}`;
      }
    };

    // Also check URL params at root level for initial load
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    if (sessionId) {
      console.log('[DeepLink] Found session ID in URL at root:', sessionId);
      setPendingSessionId(sessionId);
    }

    return () => {
      delete (window as any).openSession;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
