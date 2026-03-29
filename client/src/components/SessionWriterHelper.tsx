import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Squad } from '@shared/schema';

interface SessionWriterHelperProps {
  isOpen: boolean;
  onClose: () => void;
  squadId?: string;
  sessionFocus?: string;
  squads?: Squad[];
}

interface HelperData {
  sessionCount: number;
  averages: {
    engagement: number;
    effortAndIntent: number;
    enjoyment: number;
    sessionClarity: number;
    appropriatenessOfChallenge: number;
    sessionFlow: number;
  } | null;
  trends: {
    engagement: 'up' | 'down' | 'stable';
    effortAndIntent: 'up' | 'down' | 'stable';
    enjoyment: 'up' | 'down' | 'stable';
    sessionClarity: 'up' | 'down' | 'stable';
    appropriatenessOfChallenge: 'up' | 'down' | 'stable';
    sessionFlow: 'up' | 'down' | 'stable';
  } | null;
  lowestCategory: string | null;
  highestCategory: string | null;
  usingFallback?: boolean;
}

interface AIInsights {
  whatsWorking: string[];
  areasToAddress: string[];
  focusTips: string[];
  generatedAt?: string;
}

const categoryLabels: Record<string, string> = {
  engagement: 'Engagement',
  effortAndIntent: 'Effort & Intent',
  enjoyment: 'Enjoyment',
  sessionClarity: 'Session Clarity',
  appropriatenessOfChallenge: 'Challenge',
  sessionFlow: 'Session Flow',
};

export function SessionWriterHelper({ isOpen, onClose, squadId, sessionFocus, squads }: SessionWriterHelperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insightsCacheRef = useRef<Map<string, AIInsights>>(new Map());

  const squadName = squads?.find(s => s.id === squadId)?.squadName || 'Unknown Squad';
  const cacheKey = `${squadId || ''}-${sessionFocus || ''}`;

  const { data: helperData, isLoading: dataLoading } = useQuery<HelperData>({
    queryKey: ['/api/feedback/session-helper', squadId, sessionFocus],
    enabled: isOpen && !!squadId,
  });

  const hasEnoughData = helperData && helperData.sessionCount >= 3;
  const cachedInsights = insightsCacheRef.current.get(cacheKey);

  const { data: aiInsights, isLoading: aiLoading, refetch: refetchAI, isFetching } = useQuery<AIInsights>({
    queryKey: ['/api/feedback/session-helper/insights', squadId, sessionFocus],
    enabled: isOpen && !!squadId && hasEnoughData && !cachedInsights,
  });

  useEffect(() => {
    if (aiInsights && aiInsights.whatsWorking?.length > 0) {
      insightsCacheRef.current.set(cacheKey, aiInsights);
    }
  }, [aiInsights, cacheKey]);

  const handleRefreshAI = async () => {
    setIsRefreshing(true);
    insightsCacheRef.current.delete(cacheKey);
    await refetchAI();
    setIsRefreshing(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-amber-600';
    return 'text-red-600';
  };

  const displayInsights = cachedInsights || aiInsights;
  const isAILoading = (aiLoading || isFetching || isRefreshing) && !displayInsights;

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full bg-background border-l shadow-2xl transition-all duration-300 z-50',
        isOpen ? 'w-80 translate-x-0' : 'w-80 translate-x-full'
      )}
      data-testid="panel-session-writer-helper"
      aria-hidden={!isOpen}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: 'var(--club-primary)' }} />
            <div>
              <h3 className="text-sm font-medium">Session Writer Helper</h3>
              <p className="text-[10px] text-muted-foreground">Data-driven insights</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7" data-testid="button-close-helper">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Session Context - Compact Card */}
            <Card className="p-2.5 bg-muted/50">
              <div className="flex justify-between text-xs gap-2">
                <div>
                  <span className="text-muted-foreground">Squad:</span>
                  <span className="ml-1 font-medium">{squadName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Focus:</span>
                  <span className="ml-1 font-medium">{sessionFocus || 'Not set'}</span>
                </div>
              </div>
              {helperData && helperData.sessionCount > 0 && (
                <div className="mt-1.5 pt-1.5 border-t">
                  <p className="text-[10px] text-muted-foreground">
                    Based on {helperData.sessionCount} session{helperData.sessionCount !== 1 ? 's' : ''} with feedback
                  </p>
                  {helperData.usingFallback && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                      Showing all squad data (not enough {sessionFocus} sessions)
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Loading State for Data */}
            {dataLoading && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {/* Recent Averages - Compact Grid */}
            {helperData && helperData.averages && helperData.trends && (
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <h4 className="text-xs font-medium text-muted-foreground">Recent Averages</h4>
                  {helperData.highestCategory && helperData.lowestCategory && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-green-600">High: {categoryLabels[helperData.highestCategory]}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-amber-600">Low: {categoryLabels[helperData.lowestCategory]}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(helperData.averages).map(([key, value]) => (
                    <div 
                      key={key} 
                      className={cn(
                        "flex items-center justify-between p-1.5 rounded text-[10px] bg-muted/30",
                        key === helperData.lowestCategory && "bg-amber-50 dark:bg-amber-950/20"
                      )}
                    >
                      <span className="text-muted-foreground truncate">{categoryLabels[key]?.replace('Session ', '')}</span>
                      <div className="flex items-center gap-0.5">
                        <span className={cn('font-medium', getRatingColor(value))}>{value.toFixed(1)}</span>
                        {helperData.trends && getTrendIcon(helperData.trends[key as keyof typeof helperData.trends])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Data State - Less than 3 sessions */}
            {!dataLoading && helperData && helperData.sessionCount > 0 && helperData.sessionCount < 3 && (
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground text-center">
                  Need at least 3 sessions with feedback to generate AI insights. 
                  Currently have {helperData.sessionCount}.
                </p>
              </Card>
            )}

            {/* No Data State - No sessions at all */}
            {!dataLoading && helperData && helperData.sessionCount === 0 && (
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground text-center">
                  No feedback data available for this squad yet. Complete the feedback form after sessions to see insights here.
                </p>
              </Card>
            )}

            {/* Detailed Recommendations Section */}
            {hasEnoughData && (
              <div className="space-y-3">
                {/* Detailed Recommendations Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--club-primary)' }} />
                    <h4 className="text-xs font-medium">Detailed Recommendations</h4>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRefreshAI}
                    disabled={isRefreshing || isFetching}
                    className="h-6 px-2 text-xs"
                    data-testid="button-refresh-ai"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1", (isRefreshing || isFetching) && "animate-spin")} />
                    Refresh
                  </Button>
                </div>

                {/* Loading State */}
                {isAILoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                {/* Detailed Insights */}
                {displayInsights && (
                  <div className="space-y-3">
                    {/* What's Working */}
                    {displayInsights.whatsWorking && displayInsights.whatsWorking.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <h5 className="text-[11px] font-medium">What's Working</h5>
                        </div>
                        <div className="space-y-1.5">
                          {displayInsights.whatsWorking.map((item, idx) => (
                            <Card key={idx} className="p-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                              <p className="text-[11px] text-foreground leading-relaxed">{item}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Areas to Address */}
                    {displayInsights.areasToAddress && displayInsights.areasToAddress.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <h5 className="text-[11px] font-medium">Areas to Address</h5>
                        </div>
                        <div className="space-y-1.5">
                          {displayInsights.areasToAddress.map((item, idx) => (
                            <Card key={idx} className="p-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                              <p className="text-[11px] text-foreground leading-relaxed">{item}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Focus-Specific Tips */}
                    {displayInsights.focusTips && displayInsights.focusTips.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Target className="h-3.5 w-3.5" style={{ color: 'var(--club-primary)' }} />
                          <h5 className="text-[11px] font-medium">{sessionFocus || 'Session'} Tips</h5>
                        </div>
                        <div className="space-y-1.5">
                          {displayInsights.focusTips.map((item, idx) => (
                            <Card key={idx} className="p-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                              <p className="text-[11px] text-foreground leading-relaxed">{item}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty state when no squad selected */}
            {!squadId && (
              <Card className="p-4 bg-muted/50">
                <p className="text-xs text-muted-foreground text-center">
                  Select a squad to see personalized insights based on past feedback.
                </p>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
