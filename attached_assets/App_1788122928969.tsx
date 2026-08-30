import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './components/ui/sheet';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './components/ui/tooltip';
import { Menu, CalendarDays, List, Plus, FileText, Target, Receipt, BarChart3, UserCog, Users, Shield, MapPin, Trophy, LogOut, ChevronLeft, ChevronRight, Home, Search, BookOpen, TrendingUp, UserCheck, LayoutList } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { MonthCalendarView } from './components/MonthCalendarView';
import { DayCalendarView } from './components/DayCalendarView';
import { DayListView } from './components/DayListView';
import { SessionDetail } from './components/SessionDetail';
import { CompetitionDetail } from './components/CompetitionDetail';
import { AddSession } from './components/AddSession';
import { ManageCoaches } from './components/ManageCoaches';
import { ManageSquads } from './components/ManageSquads';
import { ManageSwimmers } from './components/ManageSwimmers';
import { ManageLocations } from './components/ManageLocations';
import { ManageCompetitions } from './components/ManageCompetitions';
import { SessionLibrary } from './components/SessionLibrary';
import { DrillsLibrary } from './components/DrillsLibrary';
import { InvoiceTracker } from './components/InvoiceTracker';
import { FeedbackAnalytics } from './components/FeedbackAnalytics';
import { HomePage } from './components/HomePage';
import { SwimmerProfiles } from './components/SwimmerProfiles';
import { SwimmerProfilePage } from './components/SwimmerProfilePage';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { SessionSearch } from './components/SessionSearch';
import { Handbook } from './components/Handbook';
import { AttendanceAnalysis } from './components/AttendanceAnalysis';
import { ScheduleManager } from './components/ScheduleManager';
import { SeasonPlanner } from './components/SeasonPlanner';
import { AvailabilityCover } from './components/AvailabilityCover';
import { PerformanceAnalysis } from './components/PerformanceAnalysis';
import { sessions, squads, locations, coaches, swimmers } from './lib/mockData';
import { sessionsWithAttendance, allSessionsWithAttendance } from './lib/mockDataAttendance';
import { sessionTemplates, drills, competitions, sessionFeedback } from './lib/mockDataExtensions';
import { Session, Competition, QualificationLevel, RecurringSession, CoverRequest, Availability, Swimmer } from './types';
import { cn } from './components/ui/utils';
import { Toaster } from './components/ui/sonner';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Badge } from './components/ui/badge';
import { X } from 'lucide-react';

type View = 'month' | 'day';
type MobileView = 'calendar' | 'list' | 'search';
type ManagementView = 'home' | 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'competitions' | 'addSession' | 'sessionLibrary' | 'drillsLibrary' | 'invoiceTracker' | 'feedbackAnalytics' | 'swimmerProfiles' | 'swimmerProfile' | 'handbook' | 'attendanceAnalysis' | 'scheduleManager' | 'availabilityCover' | 'performanceAnalysis' | 'seasonPlanner';

export default function App() {
  const [isAppLaunched, setIsAppLaunched] = useState(true); // Changed to true - app starts launched
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [selectedSwimmer, setSelectedSwimmer] = useState<Swimmer | null>(null);
  const [view, setView] = useState<View>('month');
  const [mobileView, setMobileView] = useState<MobileView>('calendar');
  const [managementView, setManagementView] = useState<ManagementView>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMySessionsOnly, setShowMySessionsOnly] = useState(false);
  const [sessionsList, setSessionsList] = useState<Session[]>(allSessionsWithAttendance);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // For desktop sidebar collapse
  const [showDesktopSearch, setShowDesktopSearch] = useState(false); // Desktop search state
  
  // Schedule Manager state — pre-populated with Skills Advanced sessions for testing
  const [recurringSessions, setRecurringSessions] = useState<RecurringSession[]>([
    { id: 'rs-sa-1', dayOfWeek: 1, startTime: '18:00', endTime: '20:00', venueId: '1', squadId: '1', leadCoachId: '1', setWriterId: '1' },
    { id: 'rs-sa-2', dayOfWeek: 4, startTime: '18:00', endTime: '20:00', venueId: '1', squadId: '1', leadCoachId: '1', setWriterId: '1' },
    { id: 'rs-sa-3', dayOfWeek: 5, startTime: '18:00', endTime: '20:00', venueId: '1', squadId: '1', leadCoachId: '1', setWriterId: '1' },
    { id: 'rs-sa-4', dayOfWeek: 6, startTime: '08:00', endTime: '10:00', venueId: '1', squadId: '1', leadCoachId: '1', setWriterId: '1' },
  ]);
  const [coverRequests, setCoverRequests] = useState<CoverRequest[]>([
    {
      id: 'cover-demo-1',
      requestingCoachId: '4', // David Brown
      sessionId: '15', // Elite session on Sunday 26th April
      status: 'open',
      reason: 'Family commitment',
      createdAt: new Date(2026, 3, 20) // Created on April 20th
    }
  ]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  
  // Mock current logged-in coach (in a real app, this would come from authentication)
  const currentCoachId = '1'; // Sarah Johnson
  const currentCoach = coaches.find(c => c.id === currentCoachId);
  
  // Check for saved credentials on mount (only after app is launched)
  useEffect(() => {
    if (isAppLaunched) {
      const savedCredentials = localStorage.getItem('hartsc_credentials');
      if (savedCredentials) {
        setAutoLogin(true);
        // Auto-login after showing loading screen
        setTimeout(() => {
          setIsAuthenticated(true);
          setIsInitializing(false);
        }, 2000);
      } else {
        setIsInitializing(false);
      }
    }
  }, [isAppLaunched]);
  
  // Filter sessions based on toggle
  const filteredSessions = useMemo(() => {
    if (showMySessionsOnly) {
      return sessionsList.filter(session => 
        session.leadCoachId === currentCoachId || 
        session.secondCoachId === currentCoachId ||
        session.helperId === currentCoachId
      );
    }
    return sessionsList;
  }, [showMySessionsOnly, sessionsList]);
  
  // Filter competitions based on toggle
  const filteredCompetitions = useMemo(() => {
    if (showMySessionsOnly) {
      return competitions.filter(competition => 
        competition.coachAssignments.some(assignment => 
          assignment.coachId === currentCoachId
        )
      );
    }
    return competitions;
  }, [showMySessionsOnly]);
  
  const handleLogin = (email: string, password: string) => {
    // Save credentials to localStorage
    localStorage.setItem('hartsc_credentials', JSON.stringify({ email, password }));
    setIsAuthenticated(true);
    setIsInitializing(false);
  };

  const handleLogout = () => {
    // Clear saved credentials
    localStorage.removeItem('hartsc_credentials');
    setIsAuthenticated(false);
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
    setManagementView(viewType);
    setSidebarOpen(false);
    setSelectedSession(null);
    setSelectedCompetition(null);
  };
  
  const handleBackToCalendar = () => {
    setManagementView('calendar');
  };

  const handleBackToHome = () => {
    setManagementView('home');
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleBackFromSession = () => {
    setSelectedSession(null);
  };

  const handleAddSession = () => {
    setManagementView('addSession');
  };

  const handleSaveNewSession = (sessionData: Omit<Session, 'id'>) => {
    // Generate a new ID (in a real app, this would come from the backend)
    const newId = String(Math.max(...sessionsList.map(s => parseInt(s.id))) + 1);
    const newSession: Session = {
      ...sessionData,
      id: newId,
    };
    
    setSessionsList([...sessionsList, newSession]);
    setSelectedSession(newSession);
    setManagementView('calendar');
  };

  const handleDuplicateSession = (sessionData: Omit<Session, 'id'>) => {
    // Generate a new ID (in a real app, this would come from the backend)
    const newId = String(Math.max(...sessionsList.map(s => parseInt(s.id))) + 1);
    const newSession: Session = {
      ...sessionData,
      id: newId,
    };
    
    setSessionsList([...sessionsList, newSession]);
    setSelectedSession(newSession); // Open the newly duplicated session
  };

  const handleCancelAddSession = () => {
    setManagementView('calendar');
  };

  // Mobile sidebar content (full width, no collapse)
  const SidebarContent = () => {
    const todaysSessions = sessionsList.filter(s => 
      format(s.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;

    const initials = currentCoach 
      ? `${currentCoach.firstName[0]}${currentCoach.lastName[0]}`.toUpperCase()
      : 'SC';

    const isActive = (view: string) => managementView === view;

    return (
      <div className="flex flex-col h-full">
        {/* Enhanced Profile Section */}
        <div className="p-4 border-b" style={{ borderBottomColor: '#4B9A4A' }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ backgroundColor: '#4B9A4A' }}
            >
              {initials}
            </div>
            {currentCoach && (
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {currentCoach.firstName} {currentCoach.lastName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-1.5 py-0"
                    style={{ backgroundColor: '#4B9A4A20', color: '#4B9A4A' }}
                  >
                    {currentCoach.level}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
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
                  "w-full justify-start py-2.5 relative transition-all duration-200",
                  isActive('home') && "bg-accent/50"
                )}
                onClick={() => handleManagementClick('home')}
              >
                {isActive('home') && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: '#4B9A4A' }}
                  />
                )}
                <Home 
                  className={cn(
                    "h-4 w-4 mr-3 ml-2 transition-colors",
                    isActive('home') ? "text-[#4B9A4A]" : "text-muted-foreground"
                  )}
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
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('calendar') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('calendar')}
                >
                  {isActive('calendar') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <CalendarDays 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('calendar') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
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
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('sessionLibrary') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('sessionLibrary')}
                >
                  {isActive('sessionLibrary') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <FileText 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('sessionLibrary') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Session Library</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {sessionTemplates.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('drillsLibrary') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('drillsLibrary')}
                >
                  {isActive('drillsLibrary') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Target 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('drillsLibrary') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Drills Library</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {drills.length}
                  </Badge>
                </Button>
              </div>
            </div>

            {/* MANAGEMENT Section */}
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
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('coaches') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('coaches')}
                >
                  {isActive('coaches') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <UserCog 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('coaches') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Coaches</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {coaches.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('squads') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('squads')}
                >
                  {isActive('squads') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Shield 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('squads') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Squads</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {squads.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('swimmers') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('swimmers')}
                >
                  {isActive('swimmers') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Users 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('swimmers') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Swimmers</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {swimmers.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('locations') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('locations')}
                >
                  {isActive('locations') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <MapPin 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('locations') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Locations</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {locations.length}
                  </Badge>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('competitions') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('competitions')}
                >
                  {isActive('competitions') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Trophy 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('competitions') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Competitions</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {competitions.length}
                  </Badge>
                </Button>
              </div>
            </div>

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
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('swimmerProfiles') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('swimmerProfiles')}
                >
                  {isActive('swimmerProfiles') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Users 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('swimmerProfiles') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Swimmer Profiles</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('invoiceTracker') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('invoiceTracker')}
                >
                  {isActive('invoiceTracker') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Receipt 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('invoiceTracker') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Invoice Tracker</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('feedbackAnalytics') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('feedbackAnalytics')}
                >
                  {isActive('feedbackAnalytics') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <BarChart3 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('feedbackAnalytics') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Feedback Analytics</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('handbook') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('handbook')}
                >
                  {isActive('handbook') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <BookOpen 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('handbook') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Handbook</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('attendanceAnalysis') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('attendanceAnalysis')}
                >
                  {isActive('attendanceAnalysis') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <TrendingUp 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('attendanceAnalysis') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Attendance Analysis</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('performanceAnalysis') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('performanceAnalysis')}
                >
                  {isActive('performanceAnalysis') && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ backgroundColor: '#4B9A4A' }} />
                  )}
                  <Trophy
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('performanceAnalysis') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Performance Analysis</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('availabilityCover') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('availabilityCover')}
                >
                  {isActive('availabilityCover') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <UserCheck 
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('availabilityCover') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Availability & Cover</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('scheduleManager') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('scheduleManager')}
                >
                  {isActive('scheduleManager') && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <CalendarDays
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('scheduleManager') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Schedule Manager</span>
                </Button>

                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start py-2.5 relative transition-all duration-200",
                    isActive('seasonPlanner') && "bg-accent/50"
                  )}
                  onClick={() => handleManagementClick('seasonPlanner')}
                >
                  {isActive('seasonPlanner') && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <LayoutList
                    className={cn(
                      "h-4 w-4 mr-3 ml-2 transition-colors",
                      isActive('seasonPlanner') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1 text-left">Season Planner</span>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Footer with Logout and Version */}
        <div className="p-4 border-t" style={{ borderTopColor: '#4B9A4A' }}>
          <Button
            variant="outline"
            className="w-full justify-start mb-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
          <div className="text-xs text-center text-muted-foreground">
            v2.1.0 • Hart SC
          </div>
        </div>
      </div>
    );
  };

  // App content
  const appContent = (
    <TooltipProvider>
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} autoLogin={autoLogin} />
      ) : (
        <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar - Collapsible */}
      <CollapsibleSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        managementView={managementView}
        onNavigate={handleManagementClick}
        onLogout={handleLogout}
        currentCoach={currentCoach}
        sessionsList={sessionsList}
        sessionTemplates={sessionTemplates}
        drills={drills}
        coaches={coaches}
        squads={squads}
        swimmers={swimmers}
        locations={locations}
        competitions={competitions}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Always visible on mobile, only visible on desktop for home/calendar */}
        <header 
          className={cn(
            "bg-card p-4 border-b",
            // Mobile: always show border and header
            // Desktop: hide by default
            "lg:hidden",
            // Desktop: show for home and calendar views
            (managementView === 'home' || managementView === 'calendar') && "lg:block lg:border-b",
            // Desktop: remove border for non-calendar pages when visible
            (managementView === 'home' && !selectedSession && !selectedCompetition) && "lg:border-0 lg:p-2"
          )}
          style={{ 
            borderBottomColor: '#4B9A4A'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile Sidebar */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
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
                  {/* My Sessions Toggle */}
                  <div 
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors relative z-10"
                    onClick={() => setShowMySessionsOnly(!showMySessionsOnly)}
                  >
                    <Label htmlFor="my-sessions-toggle" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap pointer-events-none">
                      My Sessions
                    </Label>
                    <Switch
                      id="my-sessions-toggle"
                      checked={showMySessionsOnly}
                      onCheckedChange={setShowMySessionsOnly}
                      className="pointer-events-none"
                    />
                  </div>
                  
                  {/* Add Session Button */}
                  <Button onClick={handleAddSession} size="default">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Session
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {managementView === 'calendar' && (
            <div className="mt-3 flex items-center justify-between gap-4">
              {/* Mobile Calendar/List Toggle */}
              <div className="lg:hidden">
                <Tabs value={mobileView} onValueChange={(v) => setMobileView(v as MobileView)}>
                  <TabsList>
                    <TabsTrigger value="calendar" className="gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-1.5">
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                    <TabsTrigger value="search" className="gap-1.5">
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Search</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Session and Competition Count */}
              {showMySessionsOnly && (
                <div className="text-xs sm:text-sm text-muted-foreground ml-auto">
                  <span className="text-primary">
                    {filteredSessions.length} of {sessions.length} sessions
                    {filteredCompetitions.length > 0 && ` • ${filteredCompetitions.length} of ${competitions.length} competitions`}
                  </span>
                </div>
              )}
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          selectedSession || selectedCompetition ? "p-0" : "p-4 md:p-6"
        )}>
          {selectedCompetition ? (
            <CompetitionDetail
              competition={selectedCompetition}
              coaches={coaches}
              locations={locations}
              onClose={() => setSelectedCompetition(null)}
            />
          ) : selectedSession ? (
            <div className="h-full p-4 md:p-6">
              <SessionDetail
                session={selectedSession}
                squad={squads.find(s => s.id === selectedSession.squadId)!}
                location={locations.find(l => l.id === selectedSession.locationId)!}
                coaches={coaches}
                swimmers={swimmers}
                templates={sessionTemplates}
                drills={drills}
                feedbackData={sessionFeedback.filter(f => f.sessionId === selectedSession.id)}
                onBack={handleBackFromSession}
                onDuplicate={handleDuplicateSession}
                squads={squads}
                locations={locations}
              />
            </div>
          ) : managementView === 'addSession' ? (
            <AddSession
              squads={squads}
              locations={locations}
              coaches={coaches}
              onSave={handleSaveNewSession}
              onCancel={handleCancelAddSession}
            />
          ) : managementView === 'sessionLibrary' ? (
            <SessionLibrary
              templates={sessionTemplates}
              coaches={coaches}
              currentCoachId={currentCoachId}
              onBack={handleBackToHome}
            />
          ) : managementView === 'drillsLibrary' ? (
            <DrillsLibrary
              drills={drills}
              coaches={coaches}
              currentCoachId={currentCoachId}
              onBack={handleBackToHome}
            />
          ) : managementView === 'invoiceTracker' ? (
            currentCoach && (
              <InvoiceTracker
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                onBack={handleBackToHome}
              />
            )
          ) : managementView === 'feedbackAnalytics' ? (
            currentCoach && (
              <FeedbackAnalytics
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                onBack={handleBackToHome}
              />
            )
          ) : managementView === 'coaches' ? (
            <ManageCoaches coaches={coaches} onBack={handleBackToHome} />
          ) : managementView === 'squads' ? (
            <ManageSquads squads={squads} coaches={coaches} onBack={handleBackToHome} />
          ) : managementView === 'swimmers' ? (
            <ManageSwimmers swimmers={swimmers} squads={squads} onBack={handleBackToHome} />
          ) : managementView === 'locations' ? (
            <ManageLocations locations={locations} onBack={handleBackToHome} />
          ) : managementView === 'competitions' ? (
            <ManageCompetitions onBack={handleBackToHome} />
          ) : managementView === 'home' ? (
            currentCoach && (
              <HomePage
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                swimmers={swimmers}
                locations={locations}
                onNavigateToSession={(session) => {
                  setSelectedSession(session);
                }}
                onNavigateToCalendar={() => {
                  setManagementView('calendar');
                }}
                onNavigateToSwimmerProfile={(swimmer) => {
                  setSelectedSwimmer(swimmer);
                  setManagementView('swimmerProfile');
                }}
              />
            )
          ) : managementView === 'swimmerProfiles' ? (
            currentCoach && (
              <SwimmerProfiles
                swimmers={swimmers}
                sessions={sessionsList}
                squads={squads}
                coach={currentCoach}
                onSelectSwimmer={(swimmer) => {
                  setSelectedSwimmer(swimmer);
                  setManagementView('swimmerProfile');
                }}
                onBack={() => setManagementView('home')}
              />
            )
          ) : managementView === 'swimmerProfile' && selectedSwimmer ? (
            <SwimmerProfilePage
              swimmer={selectedSwimmer}
              sessions={sessionsList}
              squads={squads}
              onBack={() => {
                setSelectedSwimmer(null);
                setManagementView('swimmerProfiles');
              }}
            />
          ) : managementView === 'handbook' ? (
            currentCoach && (
              <Handbook
                coach={currentCoach}
                squads={squads}
                onBack={handleBackToHome}
              />
            )
          ) : managementView === 'attendanceAnalysis' ? (
            currentCoach && (
              <AttendanceAnalysis
                coach={currentCoach}
                sessions={sessionsList}
                squads={squads}
                swimmers={swimmers}
                onBack={handleBackToHome}
              />
            )
          ) : managementView === 'performanceAnalysis' ? (
            <PerformanceAnalysis
              swimmers={swimmers}
              squads={squads}
              sessions={sessionsList}
              onBack={handleBackToHome}
              onNavigateToSwimmerProfile={(swimmer: Swimmer) => {
                setSelectedSwimmer(swimmer);
                setManagementView('swimmerProfile');
              }}
            />
          ) : managementView === 'scheduleManager' ? (
            <ScheduleManager
              recurringSessions={recurringSessions}
              onUpdateRecurringSessions={setRecurringSessions}
              squads={squads}
              locations={locations}
              coaches={coaches}
              sessions={sessionsList}
              onAddSessions={(newSessions) => setSessionsList([...sessionsList, ...newSessions])}
              coverRequests={coverRequests}
              availabilities={availabilities}
              onCreateCoverRequest={(request) => setCoverRequests([...coverRequests, request])}
            />
          ) : managementView === 'availabilityCover' ? (
            <AvailabilityCover
              currentCoach={currentCoach!}
              recurringSessions={recurringSessions}
              availabilities={availabilities}
              coverRequests={coverRequests}
              sessions={sessionsList}
              coaches={coaches}
              squads={squads}
              locations={locations}
              onUpdateAvailability={(availability) => setAvailabilities([...availabilities, availability])}
              onDeleteAvailability={(id) => setAvailabilities(availabilities.filter(a => a.id !== id))}
              onCreateCoverRequest={(request) => setCoverRequests([...coverRequests, request])}
              onUpdateCoverRequest={(request) => setCoverRequests(coverRequests.map(cr => cr.id === request.id ? request : cr))}
              onDeleteCoverRequest={(id) => setCoverRequests(coverRequests.filter(cr => cr.id !== id))}
              onUpdateSession={(session) => setSessionsList(sessionsList.map(s => s.id === session.id ? session : s))}
            />
          ) : managementView === 'seasonPlanner' ? (
            <SeasonPlanner
              squads={squads}
              recurringSessions={recurringSessions}
              locations={locations}
            />
          ) : view === 'month' ? (
            <>
              {/* Desktop and Mobile Calendar View */}
              <div className={cn(
                mobileView === 'calendar' ? 'block' : 'hidden lg:block',
                showDesktopSearch && 'hidden lg:hidden'
              )}>
                <MonthCalendarView
                  sessions={filteredSessions}
                  squads={squads}
                  competitions={filteredCompetitions}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                  onCompetitionClick={(competition) => {
                    setSelectedCompetition(competition);
                  }}
                  onSearchClick={() => setShowDesktopSearch(true)}
                  showSearch={showDesktopSearch}
                  onCloseSearch={() => setShowDesktopSearch(false)}
                />
              </div>
              
              {/* Desktop Search View */}
              <div className={cn(
                'hidden lg:block h-full',
                !showDesktopSearch && 'lg:hidden'
              )}>
                <div className="flex items-center justify-between mb-6 px-2">
                  <h2>Search Sessions</h2>
                  <Button onClick={() => setShowDesktopSearch(false)} variant="outline" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <SessionSearch
                  sessions={sessionsList}
                  squads={squads}
                  coaches={coaches}
                  locations={locations}
                  onSessionClick={(session) => {
                    handleSessionClick(session);
                    setShowDesktopSearch(false);
                  }}
                  showResultsOnly={false}
                />
              </div>
              
              {/* Mobile List View */}
              <div className={mobileView === 'list' ? 'block lg:hidden' : 'hidden'}>
                <DayListView
                  sessions={filteredSessions}
                  squads={squads}
                  locations={locations}
                  coaches={coaches}
                  competitions={filteredCompetitions}
                  currentDate={currentDate}
                  onSessionClick={handleSessionClick}
                  onCompetitionClick={(competition) => {
                    setSelectedCompetition(competition);
                  }}
                />
              </div>
              
              {/* Mobile Search View */}
              <div className={mobileView === 'search' ? 'block lg:hidden h-full' : 'hidden'}>
                <SessionSearch
                  sessions={sessionsList}
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
                squads={squads}
                locations={locations}
                competitions={filteredCompetitions}
                selectedDate={selectedDate}
                onBack={handleBackToMonth}
                onSessionClick={handleSessionClick}
                onCompetitionClick={(competition) => {
                    setSelectedCompetition(competition);
                  }}
              />
            )
          )}
        </main>
      </div>
        </div>
      )}
    </TooltipProvider>
  );

  return (
    <>
      {appContent}
      <Toaster />
    </>
  );
}