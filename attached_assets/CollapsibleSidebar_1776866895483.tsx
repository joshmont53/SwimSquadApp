import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { 
  CalendarDays, FileText, Target, Receipt, BarChart3, 
  UserCog, Users, Shield, MapPin, Trophy, LogOut, ChevronLeft, ChevronRight, Home, BookOpen, TrendingUp
} from 'lucide-react';
import { cn } from './ui/utils';
import { format } from 'date-fns';

interface CollapsibleSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  managementView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  currentCoach: any;
  sessionsList: any[];
  sessionTemplates: any[];
  drills: any[];
  coaches: any[];
  squads: any[];
  swimmers: any[];
  locations: any[];
  competitions: any[];
}

export function CollapsibleSidebar({
  collapsed,
  onToggleCollapse,
  managementView,
  onNavigate,
  onLogout,
  currentCoach,
  sessionsList,
  sessionTemplates,
  drills,
  coaches,
  squads,
  swimmers,
  locations,
  competitions,
}: CollapsibleSidebarProps) {
  const isActive = (view: string) => managementView === view;
  
  const todaysSessions = sessionsList.filter(s => 
    format(s.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
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
    >
      {/* Enhanced Profile Section */}
      <div className="p-4 border-b" style={{ borderBottomColor: '#4B9A4A' }}>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          {/* Initials Circle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 cursor-pointer border-0"
                style={{ backgroundColor: '#4B9A4A' }}
              >
                {initials}
              </button>
            </TooltipTrigger>
            {collapsed && currentCoach && (
              <TooltipContent side="right">
                <p>{currentCoach.firstName} {currentCoach.lastName}</p>
                <p className="text-xs text-muted-foreground">{currentCoach.level}</p>
              </TooltipContent>
            )}
          </Tooltip>
          
          {/* Coach Info - Hidden when collapsed */}
          {!collapsed && currentCoach && (
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full py-2.5 relative transition-all duration-200",
                    collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                  )}
                  onClick={() => onNavigate('home')}
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
                  {!collapsed && (
                    <span className="flex-1 text-left">Home</span>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  Home
                </TooltipContent>
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('calendar')}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('sessionLibrary')}
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
                          {sessionTemplates.length}
                        </Badge>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Session Library ({sessionTemplates.length})
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('drillsLibrary')}
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
                          {drills.length}
                        </Badge>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Drills Library ({drills.length})
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

          {/* MANAGEMENT Section */}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('coaches')}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('squads')}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('swimmers')}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('locations')}
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('competitions')}
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
                          {competitions.length}
                        </Badge>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Competitions ({competitions.length})
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>

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
              {/* Swimmer Profiles */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('swimmerProfiles')}
                  >
                    {isActive('swimmerProfiles') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <Users 
                      className={cn(
                        "h-4 w-4 transition-colors shrink-0",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('swimmerProfiles') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && <span className="flex-1 text-left">Swimmer Profiles</span>}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Swimmer Profiles
                  </TooltipContent>
                )}
              </Tooltip>
              
              {/* Invoice Tracker */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('invoiceTracker')}
                  >
                    {isActive('invoiceTracker') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <Receipt 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('invoiceTracker') ? "text-[#4B9A4A]" : "text-muted-foreground"
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
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('feedbackAnalytics')}
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

              {/* Handbook */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('handbook')}
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

              {/* Analysis */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full py-2.5 relative transition-all duration-200",
                      collapsed ? "justify-center px-0" : "justify-start hover:scale-[1.02]"
                    )}
                    onClick={() => onNavigate('attendanceAnalysis')}
                  >
                    {isActive('attendanceAnalysis') && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                        style={{ backgroundColor: '#4B9A4A' }}
                      />
                    )}
                    <TrendingUp 
                      className={cn(
                        "h-4 w-4 transition-colors",
                        collapsed ? "" : "mr-3 ml-2",
                        isActive('attendanceAnalysis') ? "text-[#4B9A4A]" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">Attendance Analysis</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    Attendance Analysis
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer with Logout, Toggle, and Version */}
      <div className="p-4 border-t" style={{ borderBottomColor: '#4B9A4A' }}>
        {/* Logout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full mb-3",
                collapsed ? "justify-center px-0" : "justify-start"
              )}
              onClick={onLogout}
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
          className={cn(
            "w-full mb-2",
            collapsed ? "justify-center px-0" : "justify-center"
          )}
          onClick={onToggleCollapse}
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
        
        {/* Version */}
        {!collapsed && (
          <div className="text-xs text-center text-muted-foreground">
            v2.1.0 • Hart SC
          </div>
        )}
      </div>
    </aside>
  );
}