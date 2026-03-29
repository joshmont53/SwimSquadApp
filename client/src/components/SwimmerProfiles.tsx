import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Search, User, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Swimmer, Session, Squad, Coach } from '@/lib/typeAdapters';
import type { Attendance } from '@shared/schema';
import { isPast } from 'date-fns';

interface SwimmerProfilesProps {
  swimmers: Swimmer[];
  sessions: Session[];
  squads: Squad[];
  coach: Coach;
  attendance: Attendance[];
  onSelectSwimmer: (swimmer: Swimmer) => void;
  onBack: () => void;
}

export function SwimmerProfiles({ 
  swimmers, 
  sessions, 
  squads, 
  coach,
  attendance,
  onSelectSwimmer,
  onBack
}: SwimmerProfilesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSquad, setSelectedSquad] = useState<string>('all');

  // Filter swimmers by squad and search term
  const filteredSwimmers = useMemo(() => {
    let filtered = swimmers;

    // Filter by squad if selected
    if (selectedSquad !== 'all') {
      filtered = filtered.filter(s => s.squadId === selectedSquad);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(swimmer =>
        swimmer.firstName.toLowerCase().includes(term) ||
        swimmer.lastName.toLowerCase().includes(term) ||
        `${swimmer.firstName} ${swimmer.lastName}`.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [swimmers, selectedSquad, searchTerm]);

  // Calculate attendance for each swimmer using real data
  const swimmersWithStats = useMemo(() => {
    return filteredSwimmers.map(swimmer => {
      // Get attendance records for this swimmer (sessions where coach recorded attendance)
      const swimmerAttendance = attendance.filter(a => a.swimmerId === swimmer.id);
      
      // Count attended sessions (status is "Present" - case insensitive)
      const attended = swimmerAttendance.filter(a => 
        a.status?.toLowerCase() === 'present'
      ).length;
      
      // Total = all attendance records (sessions where coach completed register)
      const total = swimmerAttendance.length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      
      return {
        swimmer,
        percentage,
        attended,
        total
      };
    });
  }, [filteredSwimmers, sessions, attendance]);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-background z-20 pb-4">
        {/* Compact Inline Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            data-testid="button-back-swimmers"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">Swimmer Profiles</h1>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search swimmers by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-swimmers"
            />
          </div>
          <Select value={selectedSquad} onValueChange={setSelectedSquad}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-squad-filter">
              <SelectValue placeholder="Filter by squad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Squads</SelectItem>
              {squads.map(squad => (
                <SelectItem key={squad.id} value={squad.id}>
                  {squad.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground pt-3">
          {swimmersWithStats.length} swimmer{swimmersWithStats.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Swimmers Grid - Scrollable */}
      <div className="flex-1 overflow-auto pt-4">
        {swimmersWithStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
            {swimmersWithStats.map(({ swimmer, percentage, attended, total }) => {
              const squad = squads.find(s => s.id === swimmer.squadId);
              const initials = `${swimmer.firstName[0]}${swimmer.lastName[0]}`.toUpperCase();
              
              return (
                <Card
                  key={swimmer.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => onSelectSwimmer(swimmer)}
                  data-testid={`card-swimmer-${swimmer.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback 
                          className="text-white font-bold"
                          style={{ backgroundColor: 'var(--club-primary)' }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {swimmer.firstName} {swimmer.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {squad?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline"
                            style={
                              percentage >= 90 ? {
                                backgroundColor: 'var(--club-primary-faint)',
                                color: 'var(--club-primary)',
                                borderColor: 'var(--club-primary)'
                              } : percentage >= 75 ? {
                                backgroundColor: '#fbbf2415',
                                color: '#f59e0b',
                                borderColor: '#f59e0b40'
                              } : {
                                backgroundColor: '#ef444415',
                                color: '#ef4444',
                                borderColor: '#ef444440'
                              }
                            }
                            className="text-xs"
                          >
                            {percentage}% attendance
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {attended}/{total} sessions attended
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No swimmers found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No swimmers available in your squads'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
