import React, { useMemo, useRef, useState } from 'react';
import { X, LayoutList, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { INITIAL_PLAN, PERFORMANCE_ELITE_PLAN, SeasonPlan, SeasonPlanRow, formatSessionTime } from './SeasonPlanner';

const ALL_PLANS: SeasonPlan[] = [INITIAL_PLAN, PERFORMANCE_ELITE_PLAN];

interface SquadEntry {
  id: string;
  name: string;
}

interface SeasonPlannerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  squads: SquadEntry[];
  sessionDate: Date;
  startTime: string;
  endTime: string;
}

function phaseStyle(phase: string): string {
  switch (phase) {
    case 'General Prep':  return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Build':         return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Race Prep':     return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Race Week':     return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Recovery':      return 'bg-green-50 text-green-700 border-green-200';
    case 'Maintenance':   return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'Speed':         return 'bg-purple-50 text-purple-700 border-purple-200';
    default:              return 'bg-muted text-muted-foreground border-border';
  }
}

function SquadResult({ squad, row }: { squad: SquadEntry; row: SeasonPlanRow | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b">
        <div className="w-2 h-2 rounded-full bg-[#4B9A4A]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{squad.name}</span>
      </div>

      {row ? (
        <div className="space-y-3 pl-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Training Week">
              <p className="text-sm font-medium">Week {row.trainingWeek}</p>
            </Field>
            <Field label="Training Phase">
              {row.trainingPhase ? (
                <span className={cn('inline-block text-xs font-semibold px-2 py-0.5 rounded border', phaseStyle(row.trainingPhase))}>
                  {row.trainingPhase}
                </span>
              ) : <span className="text-sm text-muted-foreground">—</span>}
            </Field>
          </div>

          <Field label="Intensity">
            <p className="text-sm">{row.intensity || '—'}</p>
          </Field>

          <Field label="Main Focus">
            <p className="text-sm font-medium leading-snug">{row.mainFocus || '—'}</p>
          </Field>

          <Field label="Secondary Focus / Set Type">
            <p className="text-sm text-muted-foreground leading-snug">{row.secondaryFocus || '—'}</p>
          </Field>

          <Field label="Test Set?">
            {row.testSet ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" />
                Yes — include a test set
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No</span>
            )}
          </Field>

          {row.notes && (
            <Field label="Notes / Adjustments">
              <p className="text-sm text-muted-foreground leading-relaxed">{row.notes}</p>
            </Field>
          )}

          {row.isInHoliday && (
            <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              School holiday period
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pl-1 pb-1 italic">No plan entry for this date and time.</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function SeasonPlannerSidebar({
  isOpen, onClose, squads, sessionDate, startTime, endTime,
}: SeasonPlannerSidebarProps) {
  const [mobileHeight, setMobileHeight] = useState(72);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(72);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = mobileHeight;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    setMobileHeight(Math.max(20, Math.min(92, dragStartHeight.current - (dy / window.innerHeight) * 100)));
  };
  const handleTouchEnd = () => {
    if (mobileHeight < 30) { onClose(); setMobileHeight(72); }
    dragStartY.current = null;
  };

  const results = useMemo(() => {
    if (!isOpen || squads.length === 0) return [];
    const targetTime = formatSessionTime(startTime, endTime);
    return squads.map(squad => {
      for (const plan of ALL_PLANS) {
        if (!plan.squadIds.includes(squad.id)) continue;
        const row = plan.rows.find(r =>
          !r.removed &&
          r.date.toDateString() === sessionDate.toDateString() &&
          r.sessionTime === targetTime
        );
        if (row) return { squad, row };
      }
      return { squad, row: null };
    });
  }, [isOpen, squads, sessionDate, startTime, endTime]);

  const anyMatch = results.some(r => r.row !== null);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-40 lg:hidden" onClick={onClose} />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl',
          'lg:static lg:z-auto lg:rounded-none',
          'lg:w-72 lg:shrink-0 lg:self-stretch',
          'bg-card border-t lg:border-t-0 lg:border-r',
          'flex flex-col transition-[height] duration-200 ease-out',
        )}
        style={{ height: isMobile ? `${mobileHeight}vh` : undefined }}
      >
        {/* Drag handle — mobile only */}
        <div
          className="lg:hidden flex justify-center items-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-[#4B9A4A]" />
            <span className="text-sm font-semibold">Season Planner</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <LayoutList className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No squad assigned to this session.</p>
            </div>
          ) : anyMatch ? (
            <div className="space-y-5">
              {results.map(({ squad, row }) => (
                <SquadResult key={squad.id} squad={squad} row={row} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <LayoutList className="h-8 w-8 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No plan data found</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  No season plan entry matches this squad, date, and session time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
