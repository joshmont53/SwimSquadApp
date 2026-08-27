import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { SessionFeedback, Coach } from '@shared/schema';

interface FeedbackCategory {
  key: 'engagement' | 'effortAndIntent' | 'enjoyment' | 'sessionClarity' | 'appropriatenessOfChallenge' | 'sessionFlow';
  name: string;
  whatItCaptures: string;
  whyItMatters: string;
  scoringGuide: { score: number; description: string }[];
}

const feedbackCategories: FeedbackCategory[] = [
  {
    key: 'engagement',
    name: 'Engagement',
    whatItCaptures: 'How actively and enthusiastically swimmers participated',
    whyItMatters: 'Engaged swimmers learn faster, retain more, and build positive training habits',
    scoringGuide: [
      { score: 10, description: 'Every swimmer fully engaged, asking questions, focused on learning' },
      { score: 7, description: 'Most swimmers engaged, some off-task moments' },
      { score: 4, description: 'Mixed engagement, frequent redirections needed' },
      { score: 1, description: 'Minimal engagement, swimmers disinterested' },
    ],
  },
  {
    key: 'effortAndIntent',
    name: 'Effort & Intent',
    whatItCaptures: 'How hard swimmers worked and their commitment to quality',
    whyItMatters: 'Consistent effort builds physical and mental resilience',
    scoringGuide: [
      { score: 10, description: 'Maximum effort on every rep, focused on hitting targets' },
      { score: 7, description: 'Good effort overall, occasional lapses' },
      { score: 4, description: 'Inconsistent effort, needs encouragement' },
      { score: 1, description: 'Low effort, not attempting targets' },
    ],
  },
  {
    key: 'enjoyment',
    name: 'Enjoyment',
    whatItCaptures: 'How much fun swimmers had while training',
    whyItMatters: 'Enjoyment sustains long-term participation and motivation',
    scoringGuide: [
      { score: 10, description: 'Swimmers clearly enjoying themselves, positive energy' },
      { score: 7, description: 'Generally positive mood, some enjoyment' },
      { score: 4, description: 'Neutral mood, no strong reactions' },
      { score: 1, description: 'Frustration or negativity from swimmers' },
    ],
  },
  {
    key: 'sessionClarity',
    name: 'Session Clarity',
    whatItCaptures: 'How clear the session instructions and explanations were',
    whyItMatters: 'Clear communication ensures swimmers understand what is expected',
    scoringGuide: [
      { score: 10, description: 'Crystal clear instructions, no confusion, swimmers knew exactly what to do' },
      { score: 7, description: 'Mostly clear, occasional clarifications needed' },
      { score: 4, description: 'Some confusion, multiple explanations required' },
      { score: 1, description: 'Significant confusion, swimmers unsure what to do' },
    ],
  },
  {
    key: 'appropriatenessOfChallenge',
    name: 'Appropriateness of Challenge',
    whatItCaptures: 'Whether the session difficulty was right for the group',
    whyItMatters: 'The right challenge level maximizes learning and development',
    scoringGuide: [
      { score: 10, description: 'Perfect challenge level - pushed swimmers without overwhelming' },
      { score: 7, description: 'Good challenge, minor adjustments could help' },
      { score: 4, description: 'Challenge level off - too easy or too hard for many' },
      { score: 1, description: 'Completely mismatched - session too easy or too difficult' },
    ],
  },
  {
    key: 'sessionFlow',
    name: 'Session Flow',
    whatItCaptures: 'How well the session ran logistically',
    whyItMatters: 'Good flow maximizes training time and keeps energy high',
    scoringGuide: [
      { score: 10, description: 'Perfect pacing, smooth transitions, time used efficiently' },
      { score: 7, description: 'Generally well-structured, minor timing issues' },
      { score: 4, description: 'Some structural problems, lost time' },
      { score: 1, description: 'Poorly structured, significant issues' },
    ],
  },
];

type FeedbackRatings = {
  engagement: number | null;
  effortAndIntent: number | null;
  enjoyment: number | null;
  sessionClarity: number | null;
  appropriatenessOfChallenge: number | null;
  sessionFlow: number | null;
};

interface FeedbackFormProps {
  sessionId: string;
  coachId: string;
}

export function FeedbackForm({ sessionId, coachId }: FeedbackFormProps) {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<FeedbackRatings>({
    engagement: null,
    effortAndIntent: null,
    enjoyment: null,
    sessionClarity: null,
    appropriatenessOfChallenge: null,
    sessionFlow: null,
  });
  const [notes, setNotes] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { data: existingFeedback, isLoading } = useQuery<SessionFeedback>({
    queryKey: ['/api/feedback/session', sessionId],
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (existingFeedback) {
      setRatings({
        engagement: existingFeedback.engagement,
        effortAndIntent: existingFeedback.effortAndIntent,
        enjoyment: existingFeedback.enjoyment,
        sessionClarity: existingFeedback.sessionClarity,
        appropriatenessOfChallenge: existingFeedback.appropriatenessOfChallenge,
        sessionFlow: existingFeedback.sessionFlow,
      });
      setNotes(existingFeedback.notes || '');
      setIsPrivate(existingFeedback.isPrivate);
      setIsSaved(true);
    }
  }, [existingFeedback]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/feedback', {
        sessionId,
        coachId,
        isPrivate,
        ...ratings,
        notes: notes.trim() || null,
      });
      return await response.json() as SessionFeedback;
    },
    onSuccess: async (savedFeedback) => {
      // Update both feedback queries immediately so the Home dashboard reflects
      // the saved record as soon as the coach returns from this session.
      queryClient.setQueryData<SessionFeedback>(
        ['/api/feedback/session', sessionId],
        savedFeedback,
      );
      queryClient.setQueryData<SessionFeedback[]>(
        ['/api/feedback'],
        (currentFeedback = []) => {
          const existingIndex = currentFeedback.findIndex(
            feedback => feedback.sessionId === savedFeedback.sessionId,
          );

          if (existingIndex === -1) {
            return [...currentFeedback, savedFeedback];
          }

          return currentFeedback.map((feedback, index) =>
            index === existingIndex ? savedFeedback : feedback,
          );
        },
      );

      // Confirm the optimistic cache update with the server response. This is
      // awaited so navigation cannot beat the dashboard refresh.
      await queryClient.refetchQueries({ queryKey: ['/api/feedback'] });
      setIsSaved(true);
      toast({
        title: 'Success',
        description: 'Feedback saved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save feedback',
        variant: 'destructive',
      });
    },
  });

  const handleRatingChange = (key: keyof FeedbackRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const validRatings = Object.values(ratings).filter((val): val is number => val !== null);
  const allRatingsComplete = validRatings.length === 6;
  const averageRating = allRatingsComplete 
    ? validRatings.reduce((sum, val) => sum + val, 0) / validRatings.length 
    : null;

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading feedback...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Session Feedback</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Rate the session across key coaching metrics
          </p>
        </div>
        {isSaved && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800">
            <Check className="h-4 w-4" />
            <span className="text-sm">Saved</span>
          </div>
        )}
      </div>

      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Average Rating</span>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {averageRating !== null ? averageRating.toFixed(1) : '-'}
            </div>
            <span className="text-sm text-muted-foreground">/ 10</span>
          </div>
        </div>
        {!allRatingsComplete && (
          <p className="text-xs text-muted-foreground mt-2">
            Complete all 6 ratings to see average
          </p>
        )}
      </Card>

      <div className="space-y-3">
        {feedbackCategories.map((category) => (
          <Card
            key={category.key}
            className={cn(
              'overflow-visible transition-all',
              isSaved && 'bg-green-50/30 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{category.name}</h4>
                    {isSaved && <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category.whatItCaptures}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpandedCategory(expandedCategory === category.key ? null : category.key)}
                  className="h-7 w-7"
                  data-testid={`button-expand-${category.key}`}
                >
                  {expandedCategory === category.key ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-10 gap-1.5 mb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleRatingChange(category.key, num)}
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-all',
                      ratings[category.key] === num
                        ? 'bg-green-600 text-white shadow-md scale-110'
                        : 'bg-muted hover-elevate'
                    )}
                    data-testid={`button-rating-${category.key}-${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="text-center">
                <span className="text-xs text-muted-foreground">
                  Current: <span className="text-green-600 dark:text-green-500 font-medium">
                    {ratings[category.key] !== null ? `${ratings[category.key]}/10` : 'Not selected'}
                  </span>
                </span>
              </div>

              {expandedCategory === category.key && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Why it matters:</strong> {category.whyItMatters}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">Scoring Guide:</p>
                    <div className="space-y-2">
                      {category.scoringGuide.map((guide) => (
                        <div key={guide.score} className="flex gap-2 text-xs">
                          <span
                            className={cn(
                              'flex-shrink-0 w-8 h-6 rounded flex items-center justify-center text-white font-medium',
                              guide.score >= 7 ? 'bg-green-500' : guide.score >= 4 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                          >
                            {guide.score}
                          </span>
                          <span className="text-muted-foreground">{guide.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-notes">Additional Notes (Optional)</Label>
        <Textarea
          id="feedback-notes"
          placeholder="Add any additional observations, patterns, or insights about the session..."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setIsSaved(false);
          }}
          rows={4}
          className={cn(isSaved && 'bg-green-50/30 dark:bg-green-950/30 border-green-200 dark:border-green-800')}
          data-testid="textarea-feedback-notes"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="privacy-toggle">Keep Feedback Private</Label>
          <p className="text-xs text-muted-foreground">
            Private feedback is only visible to you. Uncheck to share with the session writer.
          </p>
        </div>
        <Switch
          id="privacy-toggle"
          checked={isPrivate}
          onCheckedChange={(checked) => {
            setIsPrivate(checked);
            setIsSaved(false);
          }}
          data-testid="switch-privacy"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaved || saveMutation.isPending || !allRatingsComplete}
          data-testid="button-save-feedback"
        >
          {saveMutation.isPending ? 'Saving...' : isSaved ? 'Saved' : !allRatingsComplete ? 'Rate All Categories to Save' : 'Save Feedback'}
        </Button>
      </div>
    </div>
  );
}
