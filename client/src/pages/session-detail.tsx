import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Calendar, Clock, Target, Trash2, Save, Edit, MessageSquare, Copy, ChevronRight, FileText, Ruler } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import type { SwimmingSession, Coach, Squad, Location, Swimmer, Attendance } from "@shared/schema";
import { FeedbackForm } from "@/components/FeedbackForm";
import { DuplicateSessionModal } from "@/components/DuplicateSessionModal";

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sessionId = params?.id;

  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string, notes: string | null }>>({});
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [distanceSheetOpen, setDistanceSheetOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);

  const { data: session, isLoading } = useQuery<SwimmingSession>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: coaches } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const { data: squads } = useQuery<Squad[]>({ queryKey: ["/api/squads"] });
  const { data: locations } = useQuery<Location[]>({ queryKey: ["/api/locations"] });
  const { data: swimmers } = useQuery<Swimmer[]>({ queryKey: ["/api/swimmers"] });
  const { data: attendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", sessionId],
    enabled: !!sessionId,
  });
  const { data: sessionSquads } = useQuery<{ id: string; sessionId: string; squadId: string; recordStatus: string }[]>({
    queryKey: ["/api/session-squads", sessionId],
    enabled: !!sessionId,
  });
  const { data: currentCoach } = useQuery<Coach>({
    queryKey: ["/api/coaches/me"],
  });

  useEffect(() => {
    if (attendance && attendance.length > 0) {
      const initialData: Record<string, { status: string, notes: string | null }> = {};
      attendance.forEach(record => {
        initialData[record.swimmerId] = {
          status: record.status,
          notes: record.notes || null,
        };
      });
      setAttendanceData(initialData);
    }
  }, [attendance]);

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete session",
        variant: "destructive",
      });
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: { swimmerId: string; status: string; notes: string | null }[]) => {
      await apiRequest("POST", `/api/attendance/${sessionId}`, { attendance: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", sessionId] });
      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    },
  });

  const handleSaveAttendance = () => {
    const attendanceRecords = squadSwimmers.map((swimmer) => {
      const data = attendanceData[swimmer.id] ?? { status: "Present", notes: null };
      return {
        swimmerId: swimmer.id,
        status: data.status,
        notes: data.status === "Absent" ? null : data.notes,
      };
    });

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card p-4">
          <Skeleton className="h-8 w-48" />
        </header>
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const getCoachName = (coachId: string | null) => {
    if (!coachId || !coaches) return "N/A";
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : "N/A";
  };

  const getSquadName = (squadId: string) => {
    if (!squads) return "Loading...";
    const squad = squads.find(s => s.id === squadId);
    return squad?.squadName || "Unknown Squad";
  };

  const getLocationName = (poolId: string) => {
    if (!locations) return "Loading...";
    const location = locations.find(l => l.id === poolId);
    return location ? `${location.poolName} (${location.poolType})` : "Unknown Pool";
  };

  const activeSessionSquadIds = sessionSquads
    ?.filter(ss => ss.recordStatus === 'active')
    .map(ss => ss.squadId) || [];
  const allSquadIds = activeSessionSquadIds.length > 0
    ? activeSessionSquadIds
    : session?.squadId ? [session.squadId] : [];
  const squadSwimmers = swimmers?.filter(s => allSquadIds.includes(s.squadId)) || [];

  const strokeData = [
    {
      name: "Front Crawl",
      swim: session.totalFrontCrawlSwim,
      drill: session.totalFrontCrawlDrill,
      kick: session.totalFrontCrawlKick,
      pull: session.totalFrontCrawlPull,
    },
    {
      name: "Backstroke",
      swim: session.totalBackstrokeSwim,
      drill: session.totalBackstrokeDrill,
      kick: session.totalBackstrokeKick,
      pull: session.totalBackstrokePull,
    },
    {
      name: "Breaststroke",
      swim: session.totalBreaststrokeSwim,
      drill: session.totalBreaststrokeDrill,
      kick: session.totalBreaststrokeKick,
      pull: session.totalBreaststrokePull,
    },
    {
      name: "Butterfly",
      swim: session.totalButterflySwim,
      drill: session.totalButterflyDrill,
      kick: session.totalButterflyKick,
      pull: session.totalButterflyPull,
    },
    {
      name: "IM",
      swim: session.totalIMSwim,
      drill: session.totalIMDrill,
      kick: session.totalIMKick,
      pull: session.totalIMPull,
    },
    {
      name: "No1 (Best Stroke)",
      swim: session.totalNo1Swim,
      drill: session.totalNo1Drill,
      kick: session.totalNo1Kick,
      pull: session.totalNo1Pull,
    },
  ].filter(stroke => stroke.swim + stroke.drill + stroke.kick + stroke.pull > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {allSquadIds.length > 1
                    ? allSquadIds.map(id => getSquadName(id)).join(' / ')
                    : getSquadName(session.squadId)}
                  {session.focus ? ` - ${session.focus}` : ''}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(session.sessionDate), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDuplicateModalOpen(true)}
                data-testid="button-duplicate-session"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this session?")) {
                    deleteSessionMutation.mutate();
                  }
                }}
                disabled={deleteSessionMutation.isPending}
                data-testid="button-delete-session"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="session" data-testid="tab-session">Session</TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <CardTitle className="text-xl">Session Details</CardTitle>
                  <Link href={`/sessions/${sessionId}/edit`}>
                    <Button
                      variant="outline"
                      size="default"
                      data-testid="button-edit-session"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold text-base" data-testid="text-basic-info-heading">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{format(parseISO(session.sessionDate), "MMMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Time</p>
                      <p className="font-medium">{session.startTime} - {session.endTime} ({session.duration}h)</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Lead Coach</p>
                    <p className="font-medium">{getCoachName(session.leadCoachId)}</p>
                  </div>
                  {session.secondCoachId && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Second Coach</p>
                      <p className="font-medium">{getCoachName(session.secondCoachId)}</p>
                    </div>
                  )}
                  {session.helperId && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Helper</p>
                      <p className="font-medium">{getCoachName(session.helperId)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Set Writer</p>
                    <p className="font-medium">{getCoachName(session.setWriterId)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Distance</p>
                      <p className="text-2xl font-bold text-primary">{session.totalDistance}m</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stroke Breakdown */}
            {strokeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distance Breakdown</CardTitle>
                  <CardDescription>Stroke-by-stroke training distances</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {strokeData.map((stroke, index) => {
                      const total = stroke.swim + stroke.drill + stroke.kick + stroke.pull;
                      return (
                        <AccordionItem key={index} value={`stroke-${index}`}>
                          <AccordionTrigger className="text-base font-medium">
                            <div className="flex items-center justify-between w-full pr-4">
                              <span>{stroke.name}</span>
                              <span className="text-primary">{total}m</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Swim</p>
                                <p className="text-lg font-semibold">{stroke.swim}m</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Drill</p>
                                <p className="text-lg font-semibold">{stroke.drill}m</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Kick</p>
                                <p className="text-lg font-semibold">{stroke.kick}m</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Pull</p>
                                <p className="text-lg font-semibold">{stroke.pull}m</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="session" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <CardTitle>Session Content</CardTitle>
                  <Link href={`/sessions/${sessionId}/edit`}>
                    <Button variant="outline" size="default" data-testid="button-edit-session-content">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {/* Session text */}
                  <div className="flex-1 min-w-0">
                    {(session as any).sessionContentHtml ? (
                      <div
                        className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: (session as any).sessionContentHtml }}
                      />
                    ) : (session as any).sessionContent ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {(session as any).sessionContent}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No session content yet. Click Edit to add content.</p>
                    )}
                  </div>

                  {/* Sidebar action buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {session.totalDistance > 0 && (
                      <button
                        onClick={() => setDistanceSheetOpen(true)}
                        className="flex items-center gap-1 rounded-md border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground hover-elevate transition-colors"
                        data-testid="button-open-distance-sheet"
                        title="View distance breakdown"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {(session as any).sessionNotes && (
                      <button
                        onClick={() => setNotesSheetOpen(true)}
                        className="flex items-center gap-1 rounded-md border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground hover-elevate transition-colors"
                        data-testid="button-open-notes-sheet"
                        title="View session notes"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            {/* Attendance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Attendance</CardTitle>
                    <CardDescription>
                      {squadSwimmers.length} swimmers in {allSquadIds.length > 1
                        ? allSquadIds.map(id => getSquadName(id)).join(' / ')
                        : getSquadName(session.squadId)}
                    </CardDescription>
                  </div>
                  <Button
                    size="default"
                    onClick={handleSaveAttendance}
                    disabled={saveAttendanceMutation.isPending}
                    data-testid="button-save-attendance"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {squadSwimmers.map((swimmer) => {
                    const existingAttendance = attendance?.find(a => a.swimmerId === swimmer.id);
                    const data = attendanceData[swimmer.id] ?? {
                      status: existingAttendance?.status ?? "Present",
                      notes: existingAttendance?.notes ?? null,
                    };
                    const isAbsent = data.status === "Absent";

                    return (
                      <div
                        key={swimmer.id}
                        className="flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm sm:text-base font-medium truncate">
                              {swimmer.firstName} {swimmer.lastName}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">ASA: {swimmer.asaNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <Select
                            value={data.status}
                            onValueChange={(value) => {
                              setAttendanceData(prev => ({
                                ...prev,
                                [swimmer.id]: {
                                  status: value,
                                  notes: value === "Absent" ? null : (prev[swimmer.id]?.notes ?? null),
                                },
                              }));
                            }}
                          >
                            <SelectTrigger className="w-[95px] sm:w-[140px] h-8 text-xs sm:text-sm" data-testid={`select-status-${swimmer.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="First Half Only">First Half Only</SelectItem>
                              <SelectItem value="Second Half Only">Second Half Only</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={data.notes ?? "none"}
                            onValueChange={(value) => {
                              setAttendanceData(prev => ({
                                ...prev,
                                [swimmer.id]: {
                                  status: prev[swimmer.id]?.status ?? "Present",
                                  notes: value === "none" ? null : value,
                                },
                              }));
                            }}
                            disabled={isAbsent}
                          >
                            <SelectTrigger className="w-[75px] sm:w-[100px] h-8 text-xs sm:text-sm" data-testid={`select-notes-${swimmer.id}`}>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="Late">Late</SelectItem>
                              <SelectItem value="Very Late">Very Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            {/* Feedback Form */}
            <Card>
              <CardContent className="pt-6">
                {currentCoach ? (
                  <FeedbackForm sessionId={sessionId!} coachId={currentCoach.id} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You need to be linked to a coach profile to submit feedback.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DuplicateSessionModal
        session={session}
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
      />

      {/* Distance Breakdown Sheet */}
      <Sheet open={distanceSheetOpen} onOpenChange={setDistanceSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[30rem] sm:max-w-[30rem] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              Distance Breakdown
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-primary">{session.totalDistance}m</span>
            </p>
          </SheetHeader>
          <ScrollArea className="flex-1 p-6">
            {strokeData.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {strokeData.map((stroke, index) => {
                  const total = stroke.swim + stroke.drill + stroke.kick + stroke.pull;
                  return (
                    <AccordionItem key={index} value={`stroke-${index}`}>
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>{stroke.name}</span>
                          <span className="text-primary">{total}m</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {stroke.swim > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Swim</p>
                              <p className="font-semibold">{stroke.swim}m</p>
                            </div>
                          )}
                          {stroke.drill > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Drill</p>
                              <p className="font-semibold">{stroke.drill}m</p>
                            </div>
                          )}
                          {stroke.kick > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Kick</p>
                              <p className="font-semibold">{stroke.kick}m</p>
                            </div>
                          )}
                          {stroke.pull > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Pull</p>
                              <p className="font-semibold">{stroke.pull}m</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Ruler className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distance data recorded for this session.</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Session Notes Sheet */}
      <Sheet open={notesSheetOpen} onOpenChange={setNotesSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[30rem] sm:max-w-[30rem] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Session Notes
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 p-6">
            {(session as any).sessionNotesHtml ? (
              <div
                className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: (session as any).sessionNotesHtml }}
              />
            ) : (session as any).sessionNotes ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {(session as any).sessionNotes}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No notes for this session.</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
