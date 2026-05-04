import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RecurringSession, Squad, Location, Coach } from '../types';
import { Plus, Calendar, Table as TableIcon } from 'lucide-react';
import { RecurringSessionModal } from './RecurringSessionModal';

interface StandardScheduleProps {
  recurringSessions: RecurringSession[];
  onUpdateRecurringSessions: (sessions: RecurringSession[]) => void;
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
}

type ViewMode = 'grid' | 'table';

export function StandardSchedule({
  recurringSessions,
  onUpdateRecurringSessions,
  squads,
  locations,
  coaches
}: StandardScheduleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<RecurringSession | null>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group sessions by day and time
  const sessionsByDay = useMemo(() => {
    const grouped: Record<number, RecurringSession[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    
    recurringSessions.forEach(session => {
      grouped[session.dayOfWeek].push(session);
    });
    
    // Sort by time within each day
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    return grouped;
  }, [recurringSessions]);

  const handleAddSession = (session: RecurringSession) => {
    onUpdateRecurringSessions([...recurringSessions, session]);
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleEditSession = (session: RecurringSession) => {
    const updated = recurringSessions.map(s => s.id === session.id ? session : s);
    onUpdateRecurringSessions(updated);
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    onUpdateRecurringSessions(recurringSessions.filter(s => s.id !== sessionId));
  };

  const handleDuplicateSession = (session: RecurringSession) => {
    const duplicate: RecurringSession = {
      ...session,
      id: `recurring-${Date.now()}-${Math.random()}`
    };
    setEditingSession(duplicate);
    setIsModalOpen(true);
  };

  const openEditModal = (session: RecurringSession) => {
    setEditingSession(session);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingSession(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold">Standard Weekly Schedule</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Define your recurring weekly sessions. These will be used to generate future sessions.
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle - Desktop only */}
          <div className="hidden md:flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table
            </Button>
          </div>

          <Button onClick={openAddModal} style={{ backgroundColor: '#4B9A4A', color: 'white' }} className="text-sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Recurring Session</span>
            <span className="sm:hidden">Add Session</span>
          </Button>
        </div>
      </div>

      {/* Mobile Day List View */}
      <div className="md:hidden space-y-4">
        {dayNames.map((dayName, dayIndex) => {
          const sessions = sessionsByDay[dayIndex];
          if (sessions.length === 0) return null;

          return (
            <Card key={dayIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">{dayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessions.map(session => {
                  const squad = squads.find(s => s.id === session.squadId);
                  const location = locations.find(l => l.id === session.venueId);
                  const leadCoach = coaches.find(c => c.id === session.leadCoachId);
                  const assistantCoach = session.assistantCoachId
                    ? coaches.find(c => c.id === session.assistantCoachId)
                    : null;
                  const helper = session.helperId
                    ? coaches.find(c => c.id === session.helperId)
                    : null;
                  const setWriter = coaches.find(c => c.id === session.setWriterId);

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg border cursor-pointer hover:border-gray-400 transition-colors"
                      style={{ borderLeftWidth: '4px', borderLeftColor: squad?.color || '#4B9A4A' }}
                      onClick={() => openEditModal(session)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{session.startTime} - {session.endTime}</p>
                          <span
                            className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                          >
                            {squad?.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{location?.name}</p>
                        <div className="pt-1 space-y-1 text-xs">
                          <p>
                            <span className="font-medium">Lead:</span> {leadCoach ? `${leadCoach.firstName} ${leadCoach.lastName}` : '-'}
                          </p>
                          {assistantCoach && (
                            <p>
                              <span className="font-medium">Asst:</span> {`${assistantCoach.firstName} ${assistantCoach.lastName}`}
                            </p>
                          )}
                          {helper && (
                            <p>
                              <span className="font-medium">Helper:</span> {`${helper.firstName} ${helper.lastName}`}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Writer:</span> {setWriter ? `${setWriter.firstName} ${setWriter.lastName}` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {recurringSessions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground text-sm">
              No recurring sessions yet. Click "Add Session" to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Grid View */}
      {viewMode === 'grid' && (
        <div className="hidden md:grid grid-cols-7 gap-4">
          {dayNames.map((dayName, dayIndex) => (
            <Card key={dayIndex} className="min-h-[400px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{dayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessionsByDay[dayIndex].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No sessions</p>
                ) : (
                  sessionsByDay[dayIndex].map(session => {
                    const squad = squads.find(s => s.id === session.squadId);
                    const location = locations.find(l => l.id === session.venueId);
                    const leadCoach = coaches.find(c => c.id === session.leadCoachId);
                    const assistantCoach = session.assistantCoachId
                      ? coaches.find(c => c.id === session.assistantCoachId)
                      : null;
                    const helper = session.helperId
                      ? coaches.find(c => c.id === session.helperId)
                      : null;
                    const setWriter = coaches.find(c => c.id === session.setWriterId);

                    return (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg border cursor-pointer hover:border-gray-400 transition-colors"
                        style={{ borderLeftWidth: '4px', borderLeftColor: squad?.color || '#4B9A4A' }}
                        onClick={() => openEditModal(session)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">{session.startTime} - {session.endTime}</p>
                          </div>
                          <p className="text-sm font-medium">{squad?.name}</p>
                          <p className="text-xs text-muted-foreground">{location?.name}</p>
                          <div className="pt-2 space-y-1">
                            <p className="text-xs">
                              <span className="font-medium">Lead:</span> {leadCoach ? `${leadCoach.firstName} ${leadCoach.lastName}` : '-'}
                            </p>
                            {assistantCoach && (
                              <p className="text-xs">
                                <span className="font-medium">Asst:</span> {`${assistantCoach.firstName} ${assistantCoach.lastName}`}
                              </p>
                            )}
                            {helper && (
                              <p className="text-xs">
                                <span className="font-medium">Helper:</span> {`${helper.firstName} ${helper.lastName}`}
                              </p>
                            )}
                            <p className="text-xs">
                              <span className="font-medium">Writer:</span> {setWriter ? `${setWriter.firstName} ${setWriter.lastName}` : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {viewMode === 'table' && (
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Day</th>
                    <th className="text-left p-3 text-sm font-medium">Time</th>
                    <th className="text-left p-3 text-sm font-medium">Squad</th>
                    <th className="text-left p-3 text-sm font-medium">Venue</th>
                    <th className="text-left p-3 text-sm font-medium">Lead Coach</th>
                    <th className="text-left p-3 text-sm font-medium">Assistant</th>
                    <th className="text-left p-3 text-sm font-medium">Helper</th>
                    <th className="text-left p-3 text-sm font-medium">Set Writer</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-muted-foreground">
                        No recurring sessions yet. Click "Add Recurring Session" to get started.
                      </td>
                    </tr>
                  ) : (
                    recurringSessions
                      .sort((a, b) => {
                        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                        return a.startTime.localeCompare(b.startTime);
                      })
                      .map(session => {
                        const squad = squads.find(s => s.id === session.squadId);
                        const location = locations.find(l => l.id === session.venueId);
                        const leadCoach = coaches.find(c => c.id === session.leadCoachId);
                        const assistantCoach = session.assistantCoachId 
                          ? coaches.find(c => c.id === session.assistantCoachId)
                          : null;
                        const helper = session.helperId 
                          ? coaches.find(c => c.id === session.helperId)
                          : null;
                        const setWriter = coaches.find(c => c.id === session.setWriterId);

                        return (
                          <tr key={session.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 text-sm">{dayNames[session.dayOfWeek]}</td>
                            <td className="p-3 text-sm">{session.startTime} - {session.endTime}</td>
                            <td className="p-3 text-sm">
                              <span 
                                className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                              >
                                {squad?.name || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-sm">{location?.name || '-'}</td>
                            <td className="p-3 text-sm">
                              {leadCoach ? (
                                <div>
                                  {leadCoach.firstName} {leadCoach.lastName}
                                  {leadCoach.level === 'Level 2' && (
                                    <span className="ml-1 text-xs text-green-600">(L2)</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-red-500">Missing</span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {assistantCoach ? (
                                <div>
                                  {assistantCoach.firstName} {assistantCoach.lastName}
                                  {assistantCoach.level === 'Level 2' && (
                                    <span className="ml-1 text-xs text-green-600">(L2)</span>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {helper ? (
                                <div>
                                  {helper.firstName} {helper.lastName}
                                  {helper.level === 'Level 2' && (
                                    <span className="ml-1 text-xs text-green-600">(L2)</span>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {setWriter ? `${setWriter.firstName} ${setWriter.lastName}` : <span className="text-red-500">Missing</span>}
                            </td>
                            <td className="p-3 text-sm">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(session)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateSession(session)}
                                >
                                  Duplicate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <RecurringSessionModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSession(null);
        }}
        onSave={editingSession?.id && recurringSessions.find(s => s.id === editingSession.id) ? handleEditSession : handleAddSession}
        session={editingSession}
        squads={squads}
        locations={locations}
        coaches={coaches}
      />
    </div>
  );
}
