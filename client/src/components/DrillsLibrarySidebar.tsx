import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Drill } from '@shared/schema';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { ChevronDown, ChevronRight, Play, BookOpen, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DrillsLibrarySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StrokeType = 'Freestyle' | 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'Starts' | 'Turns';

const strokeTypes: StrokeType[] = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Starts', 'Turns'];

const strokeLabels: Record<StrokeType, string> = {
  Freestyle: 'Freestyle',
  Backstroke: 'Backstroke',
  Breaststroke: 'Breaststroke',
  Butterfly: 'Butterfly',
  Starts: 'Starts',
  Turns: 'Turns',
};

const strokeBadgeColors: Record<StrokeType, string> = {
  Freestyle: 'bg-blue-500',
  Backstroke: 'bg-purple-500',
  Breaststroke: 'bg-green-500',
  Butterfly: 'bg-orange-500',
  Starts: 'bg-red-500',
  Turns: 'bg-teal-500',
};

const getEmbedUrl = (videoUrl: string) => {
  try {
    if (videoUrl.includes('youtube.com/watch?v=')) {
      const url = new URL(videoUrl);
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
    }
    if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;
    }
    return videoUrl;
  } catch {
    return videoUrl;
  }
};

export function DrillsLibrarySidebar({ open, onOpenChange }: DrillsLibrarySidebarProps) {
  const [expandedStrokes, setExpandedStrokes] = useState<Set<string>>(new Set());
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);

  const { data: allDrills = [], isLoading } = useQuery<Drill[]>({
    queryKey: ['/api/drills'],
  });

  const activeDrills = allDrills.filter(d => d.recordStatus === 'active');

  const drillsByStroke = strokeTypes.reduce<Record<StrokeType, Drill[]>>((acc, stroke) => {
    acc[stroke] = activeDrills.filter(d => d.strokeType === stroke);
    return acc;
  }, {} as Record<StrokeType, Drill[]>);

  const toggleStroke = (stroke: string) => {
    setExpandedStrokes(prev => {
      const next = new Set(prev);
      if (next.has(stroke)) {
        next.delete(stroke);
      } else {
        next.add(stroke);
      }
      return next;
    });
  };

  const toggleDrill = (drillId: string) => {
    setExpandedDrillId(expandedDrillId === drillId ? null : drillId);
  };

  const totalDrills = activeDrills.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[30rem] sm:max-w-[30rem] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Drills Library
          </SheetTitle>
          <SheetDescription>
            {isLoading
              ? 'Loading drills...'
              : `${totalDrills} drill${totalDrills !== 1 ? 's' : ''} across all strokes`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Loading drills library...</p>
            </div>
          ) : totalDrills === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-muted-foreground mb-2">No drills yet</h3>
              <p className="text-sm text-muted-foreground">
                Add drills to your library to browse them here while writing sessions.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {strokeTypes.map(stroke => {
                const drills = drillsByStroke[stroke];
                const isStrokeExpanded = expandedStrokes.has(stroke);

                return (
                  <div key={stroke} className="border rounded-md overflow-hidden" data-testid={`stroke-group-${stroke.toLowerCase()}`}>
                    <button
                      onClick={() => toggleStroke(stroke)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      data-testid={`button-toggle-stroke-${stroke.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={cn(strokeBadgeColors[stroke], 'text-white text-xs')}>
                          {strokeLabels[stroke]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {drills.length} {drills.length === 1 ? 'drill' : 'drills'}
                        </span>
                      </div>
                      {isStrokeExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isStrokeExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {drills.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-muted-foreground italic">
                              No drills for this stroke yet.
                            </div>
                          ) : (
                            <div className="divide-y">
                              {drills.map(drill => (
                                <div key={drill.id} data-testid={`drill-library-card-${drill.id}`}>
                                  <button
                                    onClick={() => toggleDrill(drill.id)}
                                    className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                                    data-testid={`button-toggle-library-drill-${drill.id}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm truncate">{drill.drillName}</span>
                                        {drill.videoUrl && (
                                          <Play className="h-3 w-3 text-primary flex-shrink-0" />
                                        )}
                                      </div>
                                      {expandedDrillId === drill.id ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      )}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {expandedDrillId === drill.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-4 space-y-3">
                                          {drill.drillDescription && (
                                            <p className="text-sm text-muted-foreground">
                                              {drill.drillDescription}
                                            </p>
                                          )}
                                          {drill.videoUrl && (
                                            <motion.div
                                              initial={{ scale: 0.95, opacity: 0 }}
                                              animate={{ scale: 1, opacity: 1 }}
                                              transition={{ delay: 0.1 }}
                                              className="aspect-video bg-black rounded-md overflow-hidden"
                                            >
                                              <iframe
                                                src={getEmbedUrl(drill.videoUrl)}
                                                className="w-full h-full"
                                                allowFullScreen
                                                title={drill.drillName}
                                                loading="lazy"
                                              />
                                            </motion.div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
