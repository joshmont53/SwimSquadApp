import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CoverRequest, Session, RecurringSession, Coach, Squad, Location } from '../types';
import { Users, CheckCircle, Clock, AlertCircle, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface CoverOpportunitiesProps {
  currentCoach: Coach;
  coverRequests: CoverRequest[];
  sessions: Session[];
  recurringSessions: RecurringSession[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  onUpdateCoverRequest: (request: CoverRequest) => void;
  onUpdateSession: (session: Session) => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function CoverOpportunities({
  currentCoach,
  coverRequests,
  sessions,
  recurringSessions,
  coaches,
  squads,
  locations,
  onUpdateCoverRequest,
  onUpdateSession
}: CoverOpportunitiesProps) {
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  const handleVolunteer = (request: CoverRequest) => {
    if (confirm(`Volunteer to cover this session?`)) {
      // Update the cover request
      onUpdateCoverRequest({
        ...request,
        status: 'covered',
        coveringCoachId: currentCoach.id,
        coveredAt: new Date()
      });

      // Update the session with the new coach
      if (request.sessionId) {
        const session = sessions.find(s => s.id === request.sessionId);
        if (session) {
          const updatedSession = { ...session };
          
          // Update the appropriate role based on who requested cover
          if (session.leadCoachId === request.requestingCoachId) {
            updatedSession.leadCoachId = currentCoach.id;
          } else if (session.secondCoachId === request.requestingCoachId) {
            updatedSession.secondCoachId = currentCoach.id;
          } else if (session.helperId === request.requestingCoachId) {
            updatedSession.helperId = currentCoach.id;
          }
          
          onUpdateSession(updatedSession);
        }
      }
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
                Help Out Your Fellow Coaches
              </p>
              <p className="text-xs text-blue-700">
                View open cover requests from other coaches and volunteer to help when you're available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cover Requests List */}
      {coverRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No open cover requests at the moment</p>
              <p className="text-sm mt-1">Check back later to help your colleagues</p>
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

            const requestingCoach = coaches.find(c => c.id === request.requestingCoachId);

            const isExpanded = expandedRequest === request.id;

            // Determine what role is needed
            let neededRole = 'Coach';
            if (session) {
              if (session.leadCoachId === request.requestingCoachId) neededRole = 'Lead Coach';
              else if (session.secondCoachId === request.requestingCoachId) neededRole = 'Assistant Coach';
              else if (session.helperId === request.requestingCoachId) neededRole = 'Helper';
              else if (session.setWriterId === request.requestingCoachId) neededRole = 'Set Writer';
            } else if (recurringSession) {
              if (recurringSession.leadCoachId === request.requestingCoachId) neededRole = 'Lead Coach';
              else if (recurringSession.assistantCoachId === request.requestingCoachId) neededRole = 'Assistant Coach';
              else if (recurringSession.helperId === request.requestingCoachId) neededRole = 'Helper';
              else if (recurringSession.setWriterId === request.requestingCoachId) neededRole = 'Set Writer';
            }

            return (
              <Card 
                key={request.id} 
                className="border-orange-200 hover:border-orange-300 transition-colors"
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-orange-500">Needs Cover</Badge>
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: squad?.color || '#4B9A4A' }}
                            >
                              {squad?.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {neededRole}
                            </Badge>
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
                        <Button
                          onClick={() => handleVolunteer(request)}
                          style={{ backgroundColor: '#4B9A4A', color: 'white' }}
                          size="sm"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Volunteer
                        </Button>
                      </div>

                      {/* Requesting Coach */}
                      <div className="mb-3 p-2 bg-muted rounded text-sm">
                        <span className="font-medium">Requested by: </span>
                        {requestingCoach?.firstName} {requestingCoach?.lastName}
                        {requestingCoach?.level && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({requestingCoach.level})
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <div className="mb-3 p-2 bg-orange-50 border border-orange-100 rounded text-sm">
                          <span className="font-medium">Reason: </span>
                          {request.reason}
                        </div>
                      )}

                      {/* Session Details Toggle */}
                      <button
                        onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                        className="text-xs text-[#4B9A4A] hover:underline mb-2"
                      >
                        {isExpanded ? 'Hide' : 'Show'} session details
                      </button>

                      {/* Expanded Session Details */}
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-gray-50 rounded text-sm space-y-2">
                          {session && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground">Lead Coach:</span>
                                  <p className="font-medium">
                                    {coaches.find(c => c.id === session.leadCoachId)?.firstName} {' '}
                                    {coaches.find(c => c.id === session.leadCoachId)?.lastName}
                                  </p>
                                </div>
                                {session.secondCoachId && (
                                  <div>
                                    <span className="text-muted-foreground">Assistant:</span>
                                    <p className="font-medium">
                                      {coaches.find(c => c.id === session.secondCoachId)?.firstName} {' '}
                                      {coaches.find(c => c.id === session.secondCoachId)?.lastName}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {session.helperId && (
                                <div>
                                  <span className="text-muted-foreground">Helper:</span>
                                  <p className="font-medium">
                                    {coaches.find(c => c.id === session.helperId)?.firstName} {' '}
                                    {coaches.find(c => c.id === session.helperId)?.lastName}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Set Writer:</span>
                                <p className="font-medium">
                                  {coaches.find(c => c.id === session.setWriterId)?.firstName} {' '}
                                  {coaches.find(c => c.id === session.setWriterId)?.lastName}
                                </p>
                              </div>
                            </>
                          )}
                          {recurringSession && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground">Lead Coach:</span>
                                  <p className="font-medium">
                                    {coaches.find(c => c.id === recurringSession.leadCoachId)?.firstName} {' '}
                                    {coaches.find(c => c.id === recurringSession.leadCoachId)?.lastName}
                                  </p>
                                </div>
                                {recurringSession.assistantCoachId && (
                                  <div>
                                    <span className="text-muted-foreground">Assistant:</span>
                                    <p className="font-medium">
                                      {coaches.find(c => c.id === recurringSession.assistantCoachId)?.firstName} {' '}
                                      {coaches.find(c => c.id === recurringSession.assistantCoachId)?.lastName}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {recurringSession.helperId && (
                                <div>
                                  <span className="text-muted-foreground">Helper:</span>
                                  <p className="font-medium">
                                    {coaches.find(c => c.id === recurringSession.helperId)?.firstName} {' '}
                                    {coaches.find(c => c.id === recurringSession.helperId)?.lastName}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Set Writer:</span>
                                <p className="font-medium">
                                  {coaches.find(c => c.id === recurringSession.setWriterId)?.firstName} {' '}
                                  {coaches.find(c => c.id === recurringSession.setWriterId)?.lastName}
                                </p>
                              </div>
                            </>
                          )}
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