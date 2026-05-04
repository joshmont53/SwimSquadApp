import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Calendar, Clock, Users, AlertCircle, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { RecurringSession, Availability, CoverRequest, Coach, Squad, Location, Session } from '../types';
import { AvailabilityTab } from './AvailabilityTab';
import { MyCoverRequests } from './MyCoverRequests';
import { CoverOpportunities } from './CoverOpportunities';

interface AvailabilityCoverProps {
  currentCoach: Coach;
  recurringSessions: RecurringSession[];
  availabilities: Availability[];
  coverRequests: CoverRequest[];
  sessions: Session[];
  coaches: Coach[];
  squads: Squad[];
  locations: Location[];
  onUpdateAvailability: (availability: Availability) => void;
  onDeleteAvailability: (id: string) => void;
  onCreateCoverRequest: (request: CoverRequest) => void;
  onUpdateCoverRequest: (request: CoverRequest) => void;
  onDeleteCoverRequest: (id: string) => void;
  onUpdateSession: (session: Session) => void;
  onBack: () => void;
}

export function AvailabilityCover({
  currentCoach,
  recurringSessions,
  availabilities,
  coverRequests,
  sessions,
  coaches,
  squads,
  locations,
  onUpdateAvailability,
  onDeleteAvailability,
  onCreateCoverRequest,
  onUpdateCoverRequest,
  onDeleteCoverRequest,
  onUpdateSession,
  onBack
}: AvailabilityCoverProps) {
  const [activeTab, setActiveTab] = useState('availability');

  // Filter data for current coach
  const myAvailabilities = availabilities.filter(a => a.coachId === currentCoach.id);
  const myCoverRequests = coverRequests.filter(cr => cr.requestingCoachId === currentCoach.id);
  const coverOpportunities = coverRequests.filter(cr =>
    cr.requestingCoachId !== currentCoach.id && cr.status === 'open'
  );

  // Sessions where current coach is assigned
  const mySessions = sessions.filter(s =>
    s.leadCoachId === currentCoach.id ||
    s.secondCoachId === currentCoach.id ||
    s.helperId === currentCoach.id ||
    s.setWriterId === currentCoach.id
  );

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header and Tabs */}
      <div className="flex-shrink-0 bg-background border-b sticky top-0 z-10">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 md:py-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Availability & Cover</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 md:px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="availability" className="flex items-center gap-2 text-xs md:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Availability</span>
              <span className="sm:hidden">Avail</span>
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="flex items-center gap-2 text-xs md:text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">My Cover Requests</span>
              <span className="sm:hidden">Requests</span>
              {myCoverRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#4B9A4A] text-white rounded-full">
                  {myCoverRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2 text-xs md:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Cover Opportunities</span>
              <span className="sm:hidden">Opps</span>
              {coverOpportunities.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {coverOpportunities.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="availability" className="m-0 p-4 md:p-6">
            <AvailabilityTab
              currentCoach={currentCoach}
              availabilities={availabilities}
              onUpdateAvailability={onUpdateAvailability}
              onDeleteAvailability={onDeleteAvailability}
            />
          </TabsContent>

          <TabsContent value="my-requests" className="m-0 p-4 md:p-6">
            <MyCoverRequests
              currentCoach={currentCoach}
              coverRequests={myCoverRequests}
              sessions={mySessions}
              recurringSessions={recurringSessions}
              coaches={coaches}
              squads={squads}
              locations={locations}
              onCreateCoverRequest={onCreateCoverRequest}
              onUpdateCoverRequest={onUpdateCoverRequest}
              onDeleteCoverRequest={onDeleteCoverRequest}
              onUpdateSession={onUpdateSession}
            />
          </TabsContent>

          <TabsContent value="opportunities" className="m-0 p-4 md:p-6">
            <CoverOpportunities
              currentCoach={currentCoach}
              coverRequests={coverOpportunities}
              sessions={sessions}
              recurringSessions={recurringSessions}
              coaches={coaches}
              squads={squads}
              locations={locations}
              onUpdateCoverRequest={onUpdateCoverRequest}
              onUpdateSession={onUpdateSession}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}