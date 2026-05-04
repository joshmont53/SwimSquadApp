import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Availability, Coach } from '../types';
import { CalendarOff, Plus, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AvailabilityTabProps {
  currentCoach: Coach;
  availabilities: Availability[];
  onUpdateAvailability: (availability: Availability) => void;
  onDeleteAvailability: (id: string) => void;
}

export function AvailabilityTab({
  currentCoach,
  availabilities,
  onUpdateAvailability,
  onDeleteAvailability
}: AvailabilityTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');

  // Get coach's absences (sorted by start date, upcoming first)
  const myAbsences = availabilities
    .filter(a => a.coachId === currentCoach.id && a.status === 'active')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Separate into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingAbsences = myAbsences.filter(a => new Date(a.endDate) >= today);
  const pastAbsences = myAbsences.filter(a => new Date(a.endDate) < today);

  const handleAddAbsence = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    if (!isFullDay && (!startTime || !endTime)) {
      alert('Please select both start and end times');
      return;
    }

    const newAvailability: Availability = {
      id: `av-${Date.now()}`,
      coachId: currentCoach.id,
      startDate,
      endDate,
      isFullDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      reason: reason || 'Not specified',
      status: 'active'
    };

    onUpdateAvailability(newAvailability);
    
    // Reset form
    setStartDate('');
    setEndDate('');
    setIsFullDay(true);
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
    setShowAddDialog(false);
  };

  const handleDeleteAbsence = (id: string) => {
    if (confirm('Delete this absence period?')) {
      onDeleteAvailability(id);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (start === end) {
      return format(startDate, 'EEE, MMM d, yyyy');
    }
    
    return `${format(startDate, 'EEE, MMM d')} - ${format(endDate, 'EEE, MMM d, yyyy')}`;
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
                Log Your Absences
              </p>
              <p className="text-xs text-blue-700">
                Record periods when you'll be unavailable to coach (holidays, training, personal time). When sessions are generated during these periods, cover requests will automatically be created.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Absence Button */}
      {!showAddDialog && (
        <Button 
          onClick={() => setShowAddDialog(true)}
          style={{ backgroundColor: '#4B9A4A', color: 'white' }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Absence Period
        </Button>
      )}

      {/* Add Form */}
      {showAddDialog && (
        <Card className="border-[#4B9A4A]">
          <CardHeader>
            <CardTitle className="text-lg">Log Absence Period</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add a period when you won't be available to coach
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>

            {/* Full Day or Time Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Absence Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsFullDay(true)}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    isFullDay
                      ? 'border-[#4B9A4A] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">All Day</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Unavailable for the entire day(s)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullDay(false)}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    !isFullDay
                      ? 'border-[#4B9A4A] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">Specific Times</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Unavailable during specific hours
                  </div>
                </button>
              </div>
            </div>

            {/* Time Range Inputs */}
            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Holiday, Training course, Personal appointment..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setStartDate('');
                  setEndDate('');
                  setIsFullDay(true);
                  setStartTime('09:00');
                  setEndTime('17:00');
                  setReason('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddAbsence}
                style={{ backgroundColor: '#4B9A4A', color: 'white' }}
              >
                Log Absence
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Absences */}
      {upcomingAbsences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Upcoming Absences
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {upcomingAbsences.length} absence period{upcomingAbsences.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAbsences.map(absence => (
                <div 
                  key={absence.id}
                  className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-orange-600">
                          {absence.isFullDay ? 'All Day' : 'Partial Day'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatDateRange(absence.startDate, absence.endDate)}
                        </span>
                      </div>
                      
                      {!absence.isFullDay && absence.startTime && absence.endTime && (
                        <p className="text-sm text-muted-foreground">
                          {absence.startTime} - {absence.endTime}
                        </p>
                      )}
                      
                      {absence.reason && (
                        <p className="text-sm">
                          <span className="font-medium">Reason:</span> {absence.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAbsence(absence.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Absences */}
      {pastAbsences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Past Absences
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {pastAbsences.length} past absence period{pastAbsences.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastAbsences.map(absence => (
                <div 
                  key={absence.id}
                  className="p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2 opacity-60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {absence.isFullDay ? 'All Day' : 'Partial Day'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatDateRange(absence.startDate, absence.endDate)}
                        </span>
                      </div>
                      
                      {!absence.isFullDay && absence.startTime && absence.endTime && (
                        <p className="text-sm text-muted-foreground">
                          {absence.startTime} - {absence.endTime}
                        </p>
                      )}
                      
                      {absence.reason && (
                        <p className="text-sm">
                          <span className="font-medium">Reason:</span> {absence.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAbsence(absence.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {myAbsences.length === 0 && !showAddDialog && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No absences recorded</p>
              <p className="text-sm mt-1">
                Click "Log Absence Period" above to record when you'll be unavailable
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
