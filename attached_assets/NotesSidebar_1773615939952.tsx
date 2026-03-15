import { useState, useEffect } from 'react';
import { CoachNote, NoteItem, Squad } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ChevronDown, ChevronUp, ListChecks, FileText, CheckSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './ui/utils';
import { Checkbox } from './ui/checkbox';

interface NotesSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadId: string;
  squads: Squad[];
}

export function NotesSidebar({ open, onOpenChange, squadId, squads }: NotesSidebarProps) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());

  // Load notes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('coach_notes');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotes(parsed.map((note: any) => ({
        ...note,
        createdDate: new Date(note.createdDate),
        updatedDate: new Date(note.updatedDate),
      })));
    }
  }, [open]); // Reload when sidebar opens

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('coach_notes', JSON.stringify(notes));
  }, [notes]);

  // Filter notes for current squad and only open ones
  const relevantNotes = notes.filter(note => 
    note.squadIds.includes(squadId) && note.status === 'open'
  );

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const toggleItemCompletion = (noteId: string, itemId: string) => {
    setNotes(prev => prev.map(note => {
      if (note.id === noteId && note.items) {
        const updatedItems = note.items.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        
        // Auto-close note if all items are completed
        const allCompleted = updatedItems.every(item => item.completed);
        
        return {
          ...note,
          items: updatedItems,
          status: allCompleted ? 'closed' : note.status,
          updatedDate: new Date(),
        };
      }
      return note;
    }));
  };

  const markNoteAsComplete = (noteId: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId
        ? { ...note, status: 'closed', updatedDate: new Date() }
        : note
    ));
  };

  const getCompletionStats = (note: CoachNote) => {
    if (note.type !== 'checklist' || !note.items) return null;
    const completed = note.items.filter(item => item.completed).length;
    const total = note.items.length;
    return { completed, total };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[30rem] sm:max-w-[30rem] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Training Notes
              </SheetTitle>
              <SheetDescription>
                {relevantNotes.length} active note{relevantNotes.length !== 1 ? 's' : ''} for this squad
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {relevantNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-muted-foreground mb-2">No active notes</h3>
              <p className="text-sm text-muted-foreground">
                No open notes found for this squad. Add notes in the Handbook section.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {relevantNotes.map((note) => {
                const isExpanded = expandedNoteIds.has(note.id);
                const stats = getCompletionStats(note);
                const squad = squads.find(s => note.squadIds.includes(s.id));
                
                return (
                  <motion.div
                    key={note.id}
                    layout
                    className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                  >
                    <div
                      onClick={() => toggleNoteExpansion(note.id)}
                      className="w-full p-4 flex items-start gap-3 text-left hover:bg-accent/5 transition-colors cursor-pointer"
                    >
                      <div className="mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium">{note.title}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNoteAsComplete(note.id);
                            }}
                            title="Mark as complete"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {note.type === 'checklist' ? (
                              <>
                                <CheckSquare className="h-3 w-3 mr-1" />
                                Checklist
                              </>
                            ) : (
                              <>
                                <FileText className="h-3 w-3 mr-1" />
                                Note
                              </>
                            )}
                          </Badge>
                          
                          {stats && (
                            <span className="text-xs text-muted-foreground">
                              {stats.completed}/{stats.total} completed
                            </span>
                          )}
                          
                          {note.squadIds.length > 1 && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                            >
                              +{note.squadIds.length - 1} more squad{note.squadIds.length > 2 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-4 pb-4 border-t bg-muted/20">
                            <div className="pt-4 space-y-3">
                              {/* Text content */}
                              {note.type === 'text' && note.content && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {note.content}
                                </div>
                              )}
                              
                              {/* Checklist items */}
                              {note.type === 'checklist' && note.items && note.items.length > 0 && (
                                <div className="space-y-2">
                                  {note.items.map(item => (
                                    <div 
                                      key={item.id} 
                                      className="flex items-start gap-2 p-2 rounded hover:bg-accent/50 transition-colors"
                                    >
                                      <Checkbox
                                        checked={item.completed}
                                        onCheckedChange={() => toggleItemCompletion(note.id, item.id)}
                                        className="mt-0.5"
                                      />
                                      <span className={cn(
                                        "text-sm flex-1",
                                        item.completed && "line-through text-muted-foreground"
                                      )}>
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Squad badges */}
                              <div className="flex flex-wrap gap-2 pt-2 border-t">
                                {note.squadIds.map(sId => {
                                  const s = squads.find(sq => sq.id === sId);
                                  return s ? (
                                    <Badge 
                                      key={sId}
                                      variant="secondary" 
                                      className="text-xs"
                                      style={{ backgroundColor: `${s.color}20`, color: s.color }}
                                    >
                                      {s.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}