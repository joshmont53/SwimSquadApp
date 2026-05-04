import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CoverRequest, Session, RecurringSession, Coach, Squad, Location } from '../types';
import { Plus, Trash2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';

interface MyCoverRequestsProps {
  currentCoach: Coach;
  coverRequests: CoverRequest[];
  sessions: Session[];
  recurringSessions: RecurringSession[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  onCreateCoverRequest: (request: CoverRequest) => void;
  onUpdateCoverRequest: (request: CoverRequest) => void;
  onDeleteCoverRequest: (id: string) => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MyCoverRequests({
  currentCoach,
  coverRequests,
  sessions,
  recurringSessions,
  coaches,
  squads,
  locations,
  onCreateCoverRequest,
  onUpdateCoverRequest,
  onDeleteCoverRequest
}: MyCoverRequestsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [requestType, setRequestType] = useState<'specific' | 'recurring'>('specific');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedRecurring, setSelectedRecurring] = useState('');
  const [reason, setReason] = useState('');
  const [specificDate, setSpecificDate] = useState('');

  // Get my future sessions
  const myFutureSessions = sessions.filter(s => {
    const isMySession = s.leadCoachId === currentCoach.id ||
                        s.secondCoachId === currentCoach.id ||
                        s.helperId === currentCoach.id;
    const isFuture = s.date >= new Date();
    return isMySession && isFuture;
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Get my recurring sessions (only where I'm poolside - not set writer)
  const myRecurringSessions = recurringSessions.filter(rs =>
    rs.leadCoachId === currentCoach.id ||
    rs.assistantCoachId === currentCoach.id ||
    rs.helperId === currentCoach.id
  );

  const handleSubmit = () => {
    if (requestType === 'specific' && !selectedSession) {
      alert('Please select a session');
      return;
    }
    if (requestType === 'recurring' && !selectedRecurring) {
      alert('Please select a recurring session');
      return;
    }
    if (requestType === 'recurring' && !specificDate) {
      alert('Please select a specific date for the recurring session');
      return;
    }

    const newRequest: CoverRequest = {
      id: `cover-${Date.now()}`,
      requestingCoachId: currentCoach.id,
      sessionId: requestType === 'specific' ? selectedSession : undefined,
      recurringSessionId: requestType === 'recurring' ? selectedRecurring : undefined,
      specificDate: requestType === 'recurring' ? new Date(specificDate) : undefined,
      reason: reason || undefined,
      status: 'open',
      createdAt: new Date()
    };

    onCreateCoverRequest(newRequest);

    // Reset form
    setSelectedSession('');
    setSelectedRecurring('');
    setReason('');
    setSpecificDate('');
    setShowAddForm(false);
  };

  const handleCancel = (requestId: string) => {
    if (confirm('Are you sure you want to cancel this cover request?')) {
      onDeleteCoverRequest(requestId);
    }
  };

  const getStatusBadge = (status: CoverRequest['status']) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-orange-500">Open</Badge>;
      case 'covered':
        return <Badge className="bg-green-600">Covered</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-500">Cancelled</Badge>;
    }
  };

  const getStatusIcon = (status: CoverRequest['status']) => {
    switch (status) {
      case 'open':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'covered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Request Cover for Your Sessions
              </p>
              <p className="text-xs text-blue-700">
                Create cover requests for sessions you can't attend. Other coaches will be notified and can volunteer to cover.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Request Button */}
      {!showAddForm && (
        <Button 
          onClick={() => setShowAddForm(true)}
          style={{ backgroundColor: '#4B9A4A', color: 'white' }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Request Cover
        </Button>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-[#4B9A4A]">
          <CardHeader>
            <CardTitle className="text-lg">Create Cover Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Request Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRequestType('specific')}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    requestType === 'specific'
                      ? 'border-[#4B9A4A] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Specific Session</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Request cover for a single scheduled session
                  </div>
                </button>
                <button
                  onClick={() => setRequestType('recurring')}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    requestType === 'recurring'
                      ? 'border-[#4B9A4A] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Recurring Session</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Request cover for a recurring session on a specific date
                  </div>
                </button>
              </div>
            </div>

            {/* Session Selection - Specific */}
            {requestType === 'specific' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {myFutureSessions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No upcoming sessions</div>
                    ) : (
                      myFutureSessions.map(session => {
                        const squad = squads.find(s => s.id === session.squadId);
                        const location = locations.find(l => l.id === session.locationId);
                        return (
                          <SelectItem key={session.id} value={session.id}>
                            {format(session.date, 'EEE, dd MMM yyyy')} - {session.startTime} - {squad?.name} ({location?.name})
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Session Selection - Recurring */}
            {requestType === 'recurring' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Recurring Session</label>
                  <Select value={selectedRecurring} onValueChange={setSelectedRecurring}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a recurring session" />
                    </SelectTrigger>
                    <SelectContent>
                      {myRecurringSessions.map(session => {
                        const squad = squads.find(s => s.id === session.squadId);
                        const location = locations.find(l => l.id === session.venueId);
                        return (
                          <SelectItem key={session.id} value={session.id}>
                            {dayNames[session.dayOfWeek]} {session.startTime} - {squad?.name} ({location?.name})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specific Date</label>
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Holiday, Personal commitment, Training course..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedSession('');
                  setSelectedRecurring('');
                  setReason('');
                  setSpecificDate('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                style={{ backgroundColor: '#4B9A4A', color: 'white' }}
              >
                Create Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Requests List */}
      {coverRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>You haven't created any cover requests yet</p>
              <p className="text-sm mt-1">Click "Request Cover" to create your first request</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {coverRequests.map(request => {
            const session = request.sessionId 
              ? sessions.find(s => s.id === request.sessionId)
              : null;
            const recurringSession = request.recurringSessionId
              ? recurringSessions.find(rs => rs.id === request.recurringSessionId)
              : null;
            
            const squad = session 
              ? squads.find(s => s.id === session.squadId)
              : recurringSession
              ? squads.find(s => s.id === recurringSession.squadId)
              : null;

            const location = session
              ? locations.find(l => l.id === session.locationId)
              : recurringSession
              ? locations.find(l => l.id === recurringSession.venueId)
              : null;

            const coveringCoach = request.coveringCoachId
              ? coaches.find(c => c.id === request.coveringCoachId)
              : null;

            return (
              <Card key={request.id} className={request.status === 'covered' ? 'border-green-200' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(request.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(request.status)}
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                            >
                              {squad?.name}
                            </span>
                          </div>
                          <p className="font-medium">
                            {session 
                              ? format(session.date, 'EEE, dd MMM yyyy')
                              : request.specificDate 
                              ? format(request.specificDate, 'EEE, dd MMM yyyy')
                              : 'Unknown date'
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session
                              ? `${session.startTime} - ${session.endTime}`
                              : recurringSession
                              ? `${recurringSession.startTime} - ${recurringSession.endTime}`
                              : 'Unknown time'
                            } • {location?.name}
                          </p>
                        </div>
                        {request.status === 'open' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(request.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <div className="mb-3 p-2 bg-muted rounded text-sm">
                          <span className="font-medium">Reason: </span>
                          {request.reason}
                        </div>
                      )}

                      {/* Cover Info */}
                      {request.status === 'covered' && coveringCoach && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            Covered by <span className="font-medium">{coveringCoach.firstName} {coveringCoach.lastName}</span>
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground mt-3">
                        Requested on {format(request.createdAt, 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}