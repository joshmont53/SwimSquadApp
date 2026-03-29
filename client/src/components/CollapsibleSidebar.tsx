import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { 
  CalendarDays, FileText, Target, Receipt, BarChart3, 
  UserCog, Users, Shield, MapPin, Trophy, LogOut, ChevronLeft, ChevronRight,
  Mail, PoundSterling, Home, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Session, Squad, Location, Coach, Swimmer } from '@/lib/typeAdapters';

type ManagementView = 'home' | 'calendar' | 'coaches' | 'squads' | 'swimmers' | 'locations' | 'invitations' | 'competitions' | 'addSession' | 'invoices' | 'coachingRates' | 'sessionLibrary' | 'drillsLibrary' | 'feedbackAnalytics' | 'swimmerProfiles' | 'swimmerProfile' | 'handbook';

interface CollapsibleSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  managementView: ManagementView;
  onNavigate: (view: ManagementView) => void;
  onLogout: () => void;
  currentCoach: Coach | undefined;
  sessions: Session[];
  sessionTemplatesCount: number;
  drillsCount: number;
  coaches: Coach[];
  squads: Squad[];
  swimmers: Swimmer[];
  locations: Location[];
  competitionsCount: number;
  isAdmin: boolean;
}

export function CollapsibleSidebar({
  collapsed,
  onToggleCollapse,
  managementView,
  onNavigate,
  onLogout,
  currentCoach,
  sessions,
  sessionTemplatesCount,
  drillsCount,
  coaches,
  squads,
  swimmers,
  locations,
  competitionsCount,
  isAdmin,
}: CollapsibleSidebarProps) {
  const isActive = (view: string) => managementView === view;
  
  const todaysSessions = sessions.filter(s => 
    format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;

  const initials = currentCoach 
    ? `${currentCoach.firstName[0]}${currentCoach.lastName[0]}`.toUpperCase()
    : 'SC';

  return (
    <aside 
      className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
      data-testid="sidebar-desktop"
    >
      {/* Profile Section */}
      <div className="p-4 border-b" style={{ borderBottomColor: '#4B9A4A' }}>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 cursor-pointer"
                style={{ backgroundColor: '#4B9A4A' }}
                data-testid="avatar-initials"
              >
                {initials}
              </div>
            </TooltipTrigger>
            {collapsed && currentCoach && (
              <TooltipContent side="right">
                <p>{currentCoach.firstName} {currentCoach.lastName}</p>
                <p className="text-xs text-muted-foreground">{currentCoach.level}</p>
              </TooltipContent>
            )}
          </Tooltip>
          
          {!collapsed && currentCoach && (
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate" data-testid="text-coach-name">
                {currentCoach.firstName} {currentCoach.lastName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0"
                  style={{ backgroundColor: '#4B9A4A20', color: '#4B9A4A' }}
                  data-testid="badge-coach-level"
                >
                  {currentCoach.level}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1" data-testid="text-sessions-today">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full py-2.5 relative transition-all duration-200",
                    collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                    isActive('home') && "bg-accent/50"
                  )}
                  onClick={() => onNavigate('home')}
                  data-testid="button-nav-home"
                >
                  {isActive('home') && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{ backgroundColor: '#4B9A4A' }}
                    />
                  )}
                  <Home 
                    className={cn(
                      "h-4 w-4 transition-colors",
                      collapsed ? "" : "mr-3 ml-2",
                      isActive('home') ? "text-[#4B9A4A]" : "text-muted-foreground"
                    )}
                  />
                  {!collapsed && <span className="flex-1 text-left">Home</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">Home</TooltipContent>
              )}
            </Tooltip>
          </div>

          {/* SESSIONS Section */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sessions
                </p>
              </div>
            )}
            <div className="space-y-1">
              {/* Calendar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('calendar') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('calendar')}
                    data-testid="button-nav-calendar"
                  >
                    {isActive('calendar') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <CalendarDays 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('calendar') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">Calendar</span>
                        {todaysSessions > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {todaysSessions}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Calendar
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Session Library */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('sessionLibrary') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('sessionLibrary')}
                    data-testid="button-nav-session-library"
                  >
                    {isActive('sessionLibrary') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <FileText 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('sessionLibrary') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">Session Library</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {sessionTemplatesCount}
                        </Badge>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Session Library ({sessionTemplatesCount})
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Drills Library */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('drillsLibrary') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('drillsLibrary')}
                    data-testid="button-nav-drills-library"
                  >
                    {isActive('drillsLibrary') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <Target 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('drillsLibrary') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">Drills Library</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {drillsCount}
                        </Badge>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Drills Library ({drillsCount})
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          {/* MANAGEMENT Section - Admin Only */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Management
                  </p>
                </div>
              )}
              {collapsed && <div className="h-px bg-border my-2" />}
              <div className="space-y-1">
                {/* Coaches */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('coaches') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('coaches')}
                      data-testid="button-nav-coaches"
                    >
                      {isActive('coaches') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <UserCog 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('coaches') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Coaches</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {coaches.length}
                          </Badge>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Coaches ({coaches.length})
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Squads */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('squads') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('squads')}
                      data-testid="button-nav-squads"
                    >
                      {isActive('squads') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <Shield 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('squads') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Squads</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {squads.length}
                          </Badge>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Squads ({squads.length})
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Swimmers */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('swimmers') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('swimmers')}
                      data-testid="button-nav-swimmers"
                    >
                      {isActive('swimmers') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <Users 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('swimmers') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Swimmers</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {swimmers.length}
                          </Badge>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Swimmers ({swimmers.length})
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Locations */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('locations') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('locations')}
                      data-testid="button-nav-locations"
                    >
                      {isActive('locations') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <MapPin 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('locations') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Locations</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {locations.length}
                          </Badge>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Locations ({locations.length})
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Competitions */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('competitions') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('competitions')}
                      data-testid="button-nav-competitions"
                    >
                      {isActive('competitions') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <Trophy 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('competitions') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Competitions</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {competitionsCount}
                          </Badge>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Competitions ({competitionsCount})
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Coach Invitations */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('invitations') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('invitations')}
                      data-testid="button-nav-invitations"
                    >
                      {isActive('invitations') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <Mail 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('invitations') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-left">Coach Invitations</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Coach Invitations
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Coaching Rates */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full py-2.5 relative transition-all duration-200",
                        collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                        isActive('coachingRates') && "bg-accent/50"
                      )}
                      onClick={() => onNavigate('coachingRates')}
                      data-testid="button-nav-coaching-rates"
                    >
                      {isActive('coachingRates') && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                          style={{ backgroundColor: '#4B9A4A' }}
                        />
                      )}
                      <PoundSterling 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          collapsed ? "" : "mr-3 ml-2",
                          isActive('coachingRates') ? "text-[#4B9A4A]" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-left">Coaching Rates</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      Coaching Rates
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          )}

          {/* MY TOOLS Section */}
          <div>
            {!collapsed && (
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  My Tools
                </p>
              </div>
            )}
            {collapsed && <div className="h-px bg-border my-2" />}
            <div className="space-y-1">
              {/* Invoice Tracker */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('invoices') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('invoices')}
                    data-testid="button-nav-invoices"
                  >
                    {isActive('invoices') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <Receipt 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('invoices') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">Invoice Tracker</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Invoice Tracker
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Feedback Analytics */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('feedbackAnalytics') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('feedbackAnalytics')}
                    data-testid="button-nav-feedback"
                  >
                    {isActive('feedbackAnalytics') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <BarChart3 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('feedbackAnalytics') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">Feedback Analytics</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Feedback Analytics
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Swimmer Profiles */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      (isActive('swimmerProfiles') || isActive('swimmerProfile')) && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('swimmerProfiles')}
                    data-testid="button-nav-swimmer-profiles"
                  >
                    {(isActive('swimmerProfiles') || isActive('swimmerProfile')) && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <UserCog 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        (isActive('swimmerProfiles') || isActive('swimmerProfile')) ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">Swimmer Profiles</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Swimmer Profiles
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Handbook */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]",
                      isActive('handbook') && "bg-accent/50"
                    )}
                    onClick={() => onNavigate('handbook')}
                    data-testid="button-nav-handbook"
                  >
                    {isActive('handbook') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <BookOpen 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('handbook') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">Handbook</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Handbook
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {/* Logout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full mb-3",
                collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
              )}
              onClick={onLogout}
              data-testid="button-logout-desktop"
            >
              <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
              {!collapsed && "Log out"}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              Log out
            </TooltipContent>
          )}
        </Tooltip>

        {/* Collapse/Expand Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mb-2 justify-center"
          onClick={onToggleCollapse}
          data-testid="button-toggle-collapse"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
        
        {/* Version and legal links */}
        {!collapsed && (
          <div className="text-xs text-center text-muted-foreground space-y-1.5" data-testid="text-version">
            <div>v2.1.0 &bull; Swim Squad</div>
            <div className="flex items-center justify-center gap-2">
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline underline-offset-2"
                data-testid="link-privacy-policy"
              >
                Privacy Policy
              </a>
              <span>&bull;</span>
              <a
                href="/privacy/swimmers"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline underline-offset-2"
                data-testid="link-swimmer-notice"
              >
                Swimmer Notice
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
