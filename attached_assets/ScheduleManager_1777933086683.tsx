import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RecurringSession, Squad, Location, Coach, Session, CoverRequest, Availability, FloatSession } from '../types';
import { StandardSchedule } from './StandardSchedule';
import { GenerateSessions } from './GenerateSessions';
import { ScheduleAlerts } from './ScheduleAlerts';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';

interface ScheduleManagerProps {
  recurringSessions: RecurringSession[];
  onUpdateRecurringSessions: (sessions: RecurringSession[]) => void;
  squads: Squad[];
  locations: Location[];
  coaches: Coach[];
  sessions: Session[];
  onAddSessions: (sessions: Session[]) => void;
  onAddFloatSessions: (floatSessions: FloatSession[]) => void;
  coverRequests: CoverRequest[];
  availabilities: Availability[];
  onCreateCoverRequest: (request: CoverRequest) => void;
  onBack: () => void;
}

export function ScheduleManager({
  recurringSessions,
  onUpdateRecurringSessions,
  squads,
  locations,
  coaches,
  sessions,
  onAddSessions,
  onAddFloatSessions,
  coverRequests,
  availabilities,
  onCreateCoverRequest,
  onBack
}: ScheduleManagerProps) {
  const [activeTab, setActiveTab] = useState('standard');

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
          <h1 className="text-xl md:text-2xl font-bold">Schedule Manager</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 md:px-6">
          <TabsList className="grid w-full grid-cols-3 md:max-w-[600px]">
            <TabsTrigger value="standard" className="text-xs md:text-sm px-2 md:px-4">
              <span className="hidden md:inline">Standard Schedule</span>
              <span className="md:hidden">Standard</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-xs md:text-sm px-2 md:px-4">
              <span className="hidden md:inline">Generate Sessions</span>
              <span className="md:hidden">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs md:text-sm px-2 md:px-4">
              Alerts
              {coverRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1 md:ml-2 inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs font-bold text-white bg-red-500 rounded-full">
                  {coverRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="standard" className="m-0 p-4 md:p-6">
            <StandardSchedule
              recurringSessions={recurringSessions}
              onUpdateRecurringSessions={onUpdateRecurringSessions}
              squads={squads}
              locations={locations}
              coaches={coaches}
            />
          </TabsContent>

          <TabsContent value="generate" className="m-0 p-4 md:p-6">
            <GenerateSessions
              recurringSessions={recurringSessions}
              squads={squads}
              locations={locations}
              coaches={coaches}
              sessions={sessions}
              onAddSessions={onAddSessions}
              onAddFloatSessions={onAddFloatSessions}
              availabilities={availabilities}
              onCreateCoverRequest={onCreateCoverRequest}
            />
          </TabsContent>

          <TabsContent value="alerts" className="m-0 p-4 md:p-6">
            <ScheduleAlerts
              coverRequests={coverRequests}
              sessions={sessions}
              coaches={coaches}
              squads={squads}
              locations={locations}
              availabilities={availabilities}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}