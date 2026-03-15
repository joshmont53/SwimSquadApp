import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { 
  Plus,
  FileText, 
  CheckSquare,
  Trash2, 
  Edit2,
  X,
  ListChecks,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from './ui/utils';
import { format } from 'date-fns';
import { Coach, Squad, CoachNote, NoteItem, NoteType, NoteStatus } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface NotesSectionProps {
  coach: Coach;
  squads: Squad[];
}

export function NotesSection({ coach, squads }: NotesSectionProps) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    type: NoteType;
    content: string;
    items: NoteItem[];
    selectedSquadIds: string[];
  }>({
    title: '',
    type: 'text',
    content: '',
    items: [],
    selectedSquadIds: [],
  });

  // Load notes from localStorage on mount
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
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('coach_notes', JSON.stringify(notes));
  }, [notes]);

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'text',
      content: '',
      items: [],
      selectedSquadIds: [],
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingNote(null);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (note: CoachNote) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      type: note.type,
      content: note.content || '',
      items: note.items || [],
      selectedSquadIds: note.squadIds,
    });
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || formData.selectedSquadIds.length === 0) return;

    const now = new Date();
    
    if (editingNote) {
      // Update existing note
      setNotes(prev => prev.map(note => 
        note.id === editingNote.id 
          ? {
              ...note,
              title: formData.title,
              type: formData.type,
              content: formData.type === 'text' ? formData.content : undefined,
              items: formData.type === 'checklist' ? formData.items : undefined,
              squadIds: formData.selectedSquadIds,
              updatedDate: now,
            }
          : note
      ));
    } else {
      // Create new note
      const newNote: CoachNote = {
        id: `note-${Date.now()}`,
        title: formData.title,
        type: formData.type,
        content: formData.type === 'text' ? formData.content : undefined,
        items: formData.type === 'checklist' ? formData.items : undefined,
        squadIds: formData.selectedSquadIds,
        status: 'open',
        creatorId: coach.id,
        createdDate: now,
        updatedDate: now,
      };
      setNotes(prev => [newNote, ...prev]);
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const toggleNoteStatus = (id: string) => {
    setNotes(prev => prev.map(note =>
      note.id === id
        ? { ...note, status: note.status === 'open' ? 'closed' : 'open', updatedDate: new Date() }
        : note
    ));
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

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `item-${Date.now()}`, text: '', completed: false }
      ]
    }));
  };

  const updateChecklistItem = (itemId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, text } : item
      )
    }));
  };

  const removeChecklistItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const toggleSquadSelection = (squadId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSquadIds: prev.selectedSquadIds.includes(squadId)
        ? prev.selectedSquadIds.filter(id => id !== squadId)
        : [...prev.selectedSquadIds, squadId]
    }));
  };

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

  const getSquadNames = (squadIds: string[]) => {
    return squadIds
      .map(id => squads.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getCompletionStats = (note: CoachNote) => {
    if (note.type !== 'checklist' || !note.items) return null;
    const completed = note.items.filter(item => item.completed).length;
    const total = note.items.length;
    return { completed, total };
  };

  const openNotes = notes.filter(note => note.status === 'open');
  const closedNotes = notes.filter(note => note.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Training Notes</h2>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Open Notes */}
      {openNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Active Notes ({openNotes.length})
          </h3>
          <div className="space-y-3">
            {openNotes.map(note => {
              const isExpanded = expandedNoteIds.has(note.id);
              const stats = getCompletionStats(note);
              
              return (
                <Card key={note.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => toggleNoteExpansion(note.id)}
                        className="flex items-start gap-2 flex-1 text-left group"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium group-hover:text-primary transition-colors">
                            {note.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {note.squadIds.map(squadId => {
                              const squad = squads.find(s => s.id === squadId);
                              return squad ? (
                                <Badge 
                                  key={squadId} 
                                  variant="secondary" 
                                  className="text-xs"
                                  style={{ backgroundColor: `${squad.color}20`, color: squad.color }}
                                >
                                  {squad.name}
                                </Badge>
                              ) : null;
                            })}
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
                          </div>
                        </div>
                      </button>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(note)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleNoteStatus(note.id)}
                        >
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    {isExpanded && (
                      <div className="pl-7 space-y-2">
                        {note.type === 'text' && note.content && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {note.content}
                          </p>
                        )}
                        
                        {note.type === 'checklist' && note.items && (
                          <div className="space-y-2">
                            {note.items.map(item => (
                              <div key={item.id} className="flex items-start gap-2">
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
                        
                        <p className="text-xs text-muted-foreground pt-2 border-t">
                          Updated {format(note.updatedDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed Notes */}
      {closedNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Completed Notes ({closedNotes.length})
          </h3>
          <div className="space-y-3">
            {closedNotes.map(note => (
              <Card key={note.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-muted-foreground">
                      {note.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {note.squadIds.map(squadId => {
                        const squad = squads.find(s => s.id === squadId);
                        return squad ? (
                          <Badge 
                            key={squadId} 
                            variant="secondary" 
                            className="text-xs opacity-60"
                          >
                            {squad.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleNoteStatus(note.id)}
                      title="Reopen note"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {notes.length === 0 && (
        <Card className="p-12 text-center">
          <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">
            No notes yet
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Create notes to track training ideas, drills to try, and session reminders
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Note
          </Button>
        </Card>
      )}

      {/* Add/Edit Note Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Note' : 'Add New Note'}
            </DialogTitle>
            <DialogDescription>
              Create a note or checklist to track training ideas and reminders
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Drills to try with Performance squad"
                className="mt-2"
              />
            </div>

            {/* Note Type */}
            <div>
              <Label>Type *</Label>
              <RadioGroup 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as NoteType }))}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="type-text" />
                  <Label htmlFor="type-text" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text Note
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checklist" id="type-checklist" />
                  <Label htmlFor="type-checklist" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Checklist
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Content - Text */}
            {formData.type === 'text' && (
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your note content..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            )}

            {/* Content - Checklist */}
            {formData.type === 'checklist' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Checklist Items</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addChecklistItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.items.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                      No items yet. Click "Add Item" to create your checklist.
                    </div>
                  ) : (
                    formData.items.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        <Input
                          value={item.text}
                          onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                          placeholder="Enter checklist item..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChecklistItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Squad Selection */}
            <div>
              <Label>Squads *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select which squads this note applies to
              </p>
              <div className="space-y-2">
                {squads.map(squad => (
                  <div key={squad.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`squad-${squad.id}`}
                      checked={formData.selectedSquadIds.includes(squad.id)}
                      onCheckedChange={() => toggleSquadSelection(squad.id)}
                    />
                    <Label 
                      htmlFor={`squad-${squad.id}`}
                      className="font-normal cursor-pointer flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: squad.color }}
                      />
                      {squad.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !formData.title.trim() || 
                formData.selectedSquadIds.length === 0 ||
                (formData.type === 'checklist' && formData.items.filter(item => item.text.trim()).length === 0)
              }
            >
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}