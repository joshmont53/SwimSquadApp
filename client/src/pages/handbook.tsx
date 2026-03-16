import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { 
  Upload, 
  FileText, 
  File, 
  Download, 
  Trash2, 
  Search, 
  X, 
  ArrowLeft,
  Calendar,
  Target,
  BookOpen,
  Folder,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trophy,
  Plus,
  Edit2,
  CheckSquare,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Coach, Squad } from '@/lib/typeAdapters';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  uploadDate: Date;
  uploadedBy: string;
  fileData: string;
}

type DocumentCategory = 
  | 'Session Plans'
  | 'Competition Calendars'
  | 'Training Programs'
  | 'Meet Results'
  | 'Meeting Notes'
  | 'Other';

type NoteType = 'text' | 'checklist';
type NoteStatus = 'open' | 'closed';

interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
}

interface CoachNote {
  id: string;
  title: string;
  type: NoteType;
  content?: string;
  items?: NoteItem[];
  squadIds: string[];
  status: NoteStatus;
  creatorId: string;
  createdDate: Date;
  updatedDate: Date;
}

interface HandbookProps {
  coach: Coach;
  squads: Squad[];
  onBack: () => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Session Plans',
  'Competition Calendars',
  'Training Programs',
  'Meet Results',
  'Meeting Notes',
  'Other',
];

const CATEGORY_ICONS: Record<DocumentCategory, React.ElementType> = {
  'Session Plans': Target,
  'Competition Calendars': Calendar,
  'Training Programs': BookOpen,
  'Meet Results': Trophy,
  'Meeting Notes': FileText,
  'Other': Folder,
};

export function Handbook({ coach, squads, onBack }: HandbookProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Session Plans');
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('handbook_documents');
    if (stored) {
      const parsed = JSON.parse(stored);
      setDocuments(parsed.map((doc: Document) => ({
        ...doc,
        uploadDate: new Date(doc.uploadDate),
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('handbook_documents', JSON.stringify(documents));
  }, [documents]);

  const handleFileUpload = async (files: FileList | null, category: DocumentCategory) => {
    if (!files) return;

    const newDocuments: Document[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string;
        
        const newDoc: Document = {
          id: `${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          category,
          uploadDate: new Date(),
          uploadedBy: `${coach.firstName} ${coach.lastName}`,
          fileData,
        };

        newDocuments.push(newDoc);
        
        if (newDocuments.length === files.length) {
          setDocuments(prev => [...prev, ...newDocuments]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files, uploadCategory);
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    setDeleteConfirmId(null);
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.name;
    link.click();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('word') || type.includes('document')) return FileText;
    if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const getCategoryColor = (category: DocumentCategory) => {
    const colors: Record<DocumentCategory, string> = {
      'Session Plans': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Competition Calendars': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Training Programs': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Meet Results': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Meeting Notes': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[category];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
          data-testid="button-back-handbook"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate" data-testid="text-handbook-title">Handbook</h1>
        </div>
        <Badge variant="secondary" className="hidden sm:flex shrink-0" data-testid="badge-document-count">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2" data-testid="tab-documents">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2" data-testid="tab-notes">
            <ListChecks className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 mt-3">

      <Card>
        <button
          onClick={() => setIsUploadExpanded(!isUploadExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
          data-testid="button-toggle-upload"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Upload Documents</span>
          </div>
          {isUploadExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {isUploadExpanded && (
          <div className="p-6 pt-0 space-y-4">
            <div>
              <Label>Upload Category</Label>
              <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as DocumentCategory)}>
                <SelectTrigger className="mt-2" data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => {
                    const Icon = CATEGORY_ICONS[category];
                    return (
                      <SelectItem key={category} value={category} data-testid={`select-item-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              data-testid="dropzone-upload"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports PDF, Word, Excel documents
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileUpload(e.target.files, uploadCategory)}
                data-testid="input-file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer" data-testid="button-choose-files">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </label>
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-search-documents"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all-categories">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                All Categories
              </div>
            </SelectItem>
            {CATEGORIES.map(category => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <SelectItem key={category} value={category} data-testid={`select-filter-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-empty-state">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">
            {searchQuery || selectedCategory !== 'all' 
              ? 'No documents found'
              : 'No documents yet'
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try a different search or filter'
              : 'Upload your first document to get started'
            }
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-documents">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.type);
            const CategoryIcon = CATEGORY_ICONS[doc.category];
            
            return (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow" data-testid={`card-document-${doc.id}`}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" title={doc.name} data-testid={`text-document-name-${doc.id}`}>
                        {doc.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>

                  <Badge className={cn("text-xs", getCategoryColor(doc.category))} data-testid={`badge-category-${doc.id}`}>
                    <CategoryIcon className="h-3 w-3 mr-1" />
                    {doc.category}
                  </Badge>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Uploaded by {doc.uploadedBy}</div>
                    <div>{format(doc.uploadDate, 'MMM dd, yyyy')}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setPreviewDocument(doc)}
                      data-testid={`button-preview-${doc.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

        </TabsContent>

        <TabsContent value="notes" className="mt-3">
          <NotesSection coach={coach} squads={squads} />
        </TabsContent>

      </Tabs>

      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col" data-testid="dialog-preview">
          <DialogHeader className="shrink-0">
            <div className="flex items-start gap-3">
              <DialogTitle className="flex-1" data-testid="text-preview-title">{previewDocument?.name}</DialogTitle>
              {previewDocument && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {previewDocument.type.includes('pdf') ? 'PDF' : 
                   previewDocument.type.includes('sheet') || previewDocument.type.includes('excel') || previewDocument.type.includes('spreadsheet') ? 'Excel' :
                   previewDocument.type.includes('word') || previewDocument.type.includes('document') ? 'Word' : 'Document'}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {previewDocument && (
                <>
                  {previewDocument.category} • Uploaded by {previewDocument.uploadedBy} on {format(previewDocument.uploadDate, 'MMM dd, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {previewDocument && (
              <DocumentPreview document={previewDocument} />
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewDocument && handleDownload(previewDocument)}
              data-testid="button-preview-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDocument(null)}
              className="ml-auto"
              data-testid="button-preview-close"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface NotesSectionProps {
  coach: Coach;
  squads: Squad[];
}

function NotesSection({ coach, squads }: NotesSectionProps) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    const stored = localStorage.getItem('coach_notes');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotes(parsed.map((note: CoachNote) => ({
        ...note,
        createdDate: new Date(note.createdDate),
        updatedDate: new Date(note.updatedDate),
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('coach_notes', JSON.stringify(notes));
  }, [notes]);

  const resetForm = () => {
    setFormData({ title: '', type: 'text', content: '', items: [], selectedSquadIds: [] });
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
      setNotes(prev => prev.map(n =>
        n.id === editingNote.id
          ? {
              ...n,
              title: formData.title,
              type: formData.type,
              content: formData.type === 'text' ? formData.content : undefined,
              items: formData.type === 'checklist' ? formData.items : undefined,
              squadIds: formData.selectedSquadIds,
              updatedDate: now,
            }
          : n
      ));
    } else {
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
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const toggleNoteStatus = (id: string) => {
    setNotes(prev => prev.map(n =>
      n.id === id
        ? { ...n, status: n.status === 'open' ? 'closed' : 'open', updatedDate: new Date() }
        : n
    ));
  };

  const toggleItemCompletion = (noteId: string, itemId: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id === noteId && n.items) {
        const updatedItems = n.items.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const allCompleted = updatedItems.every(item => item.completed);
        return { ...n, items: updatedItems, status: allCompleted ? 'closed' : n.status, updatedDate: new Date() };
      }
      return n;
    }));
  };

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: `item-${Date.now()}`, text: '', completed: false }],
    }));
  };

  const updateChecklistItem = (itemId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, text } : item),
    }));
  };

  const removeChecklistItem = (itemId: string) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== itemId) }));
  };

  const toggleSquadSelection = (squadId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSquadIds: prev.selectedSquadIds.includes(squadId)
        ? prev.selectedSquadIds.filter(id => id !== squadId)
        : [...prev.selectedSquadIds, squadId],
    }));
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) newSet.delete(noteId);
      else newSet.add(noteId);
      return newSet;
    });
  };

  const getCompletionStats = (note: CoachNote) => {
    if (note.type !== 'checklist' || !note.items) return null;
    const completed = note.items.filter(item => item.completed).length;
    return { completed, total: note.items.length };
  };

  const openNotes = notes.filter(n => n.status === 'open');
  const closedNotes = notes.filter(n => n.status === 'closed');

  const NoteCard = ({ note }: { note: CoachNote }) => {
    const isExpanded = expandedNoteIds.has(note.id);
    const stats = getCompletionStats(note);
    const isClosed = note.status === 'closed';

    return (
      <Card key={note.id} className={cn("p-4", isClosed && "opacity-60")} data-testid={`card-note-${note.id}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => toggleNoteExpansion(note.id)}
              className="flex items-start gap-2 flex-1 text-left group"
              data-testid={`button-expand-note-${note.id}`}
            >
              {isExpanded
                ? <ChevronDown className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                : <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <h4 className={cn("font-medium group-hover:text-primary transition-colors", isClosed && "line-through text-muted-foreground")}>
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
                    {note.type === 'checklist'
                      ? <><CheckSquare className="h-3 w-3 mr-1" />Checklist</>
                      : <><FileText className="h-3 w-3 mr-1" />Note</>
                    }
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
              {!isClosed && (
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(note)} data-testid={`button-edit-note-${note.id}`}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => toggleNoteStatus(note.id)} data-testid={`button-toggle-note-status-${note.id}`} title={isClosed ? 'Reopen' : 'Mark complete'}>
                <CheckSquare className={cn("h-4 w-4", !isClosed && "text-primary")} />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(note.id)} data-testid={`button-delete-note-${note.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="ml-7 space-y-3">
              {note.type === 'text' && note.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
              )}
              {note.type === 'checklist' && note.items && (
                <div className="space-y-2">
                  {note.items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 p-2 rounded hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => !isClosed && toggleItemCompletion(note.id, item.id)}
                        disabled={isClosed}
                        className="mt-0.5"
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <span className={cn("text-sm flex-1", item.completed && "line-through text-muted-foreground")}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Updated {format(note.updatedDate, 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Training Notes</h2>
        <Button onClick={openAddDialog} data-testid="button-add-note">
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-notes-empty">
          <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No notes yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create notes to track training ideas, drills to try, and session reminders
          </p>
          <Button onClick={openAddDialog} data-testid="button-add-first-note">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Note
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {openNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Active Notes ({openNotes.length})
              </h3>
              <div className="space-y-3" data-testid="list-open-notes">
                {openNotes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          )}

          {closedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Completed ({closedNotes.length})
              </h3>
              <div className="space-y-3" data-testid="list-closed-notes">
                {closedNotes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-note-form">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              Create a note or checklist to track training ideas and reminders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Drills to try with Performance squad"
                className="mt-2"
                data-testid="input-note-title"
              />
            </div>

            <div>
              <Label>Type *</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as NoteType }))}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="type-text" data-testid="radio-type-text" />
                  <Label htmlFor="type-text" className="flex items-center gap-2 font-normal cursor-pointer">
                    <FileText className="h-4 w-4" /> Text Note
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checklist" id="type-checklist" data-testid="radio-type-checklist" />
                  <Label htmlFor="type-checklist" className="flex items-center gap-2 font-normal cursor-pointer">
                    <CheckSquare className="h-4 w-4" /> Checklist
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type === 'text' ? (
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Add your note content here..."
                  rows={5}
                  className="mt-2"
                  data-testid="textarea-note-content"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Checklist Items *</Label>
                  <Button variant="outline" size="sm" onClick={addChecklistItem} data-testid="button-add-checklist-item">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2" data-testid="list-checklist-items">
                  {formData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.text}
                        onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                        placeholder="Checklist item..."
                        data-testid={`input-checklist-item-${item.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChecklistItem(item.id)}
                        data-testid={`button-remove-item-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items yet — click "Add Item" to start your checklist
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label>Squads *</Label>
              <p className="text-sm text-muted-foreground mb-2">Select which squads this note applies to</p>
              <div className="space-y-2" data-testid="list-squad-selection">
                {squads.map(squad => (
                  <div key={squad.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`squad-${squad.id}`}
                      checked={formData.selectedSquadIds.includes(squad.id)}
                      onCheckedChange={() => toggleSquadSelection(squad.id)}
                      data-testid={`checkbox-squad-${squad.id}`}
                    />
                    <Label htmlFor={`squad-${squad.id}`} className="font-normal cursor-pointer flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: squad.color }} />
                      {squad.name}
                    </Label>
                  </div>
                ))}
                {squads.length === 0 && (
                  <p className="text-sm text-muted-foreground">No squads available</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-note-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.title.trim() ||
                formData.selectedSquadIds.length === 0 ||
                (formData.type === 'checklist' && formData.items.filter(item => item.text.trim()).length === 0)
              }
              data-testid="button-note-save"
            >
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentPreview({ document }: { document: Document }) {
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  if (document.type.includes('pdf')) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 relative" data-testid="preview-pdf">
        {pdfLoading && !pdfError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {pdfError ? (
          <div className="text-center p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              PDF preview not available
            </p>
            <p className="text-sm text-muted-foreground">
              Click Download to view the file
            </p>
          </div>
        ) : (
          <iframe
            src={document.fileData}
            className="w-full h-full border-0"
            title={document.name}
            onLoad={() => setPdfLoading(false)}
            onError={() => {
              setPdfLoading(false);
              setPdfError(true);
            }}
          />
        )}
      </div>
    );
  }

  if (document.type.includes('sheet') || document.type.includes('excel') || document.type.includes('spreadsheet')) {
    return <ExcelPreview document={document} />;
  }

  if (document.type.includes('word') || (document.type.includes('document') && !document.type.includes('spreadsheet'))) {
    return <WordPreview document={document} />;
  }

  return (
    <div className="text-center p-8" data-testid="preview-unsupported">
      <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}

function ExcelPreview({ document }: { document: Document }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState(false);

  const workbookData = useMemo(() => {
    try {
      const base64Data = document.fileData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheets: { name: string; data: string[][] }[] = [];
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        sheets.push({
          name: sheetName,
          data: jsonData as string[][],
        });
      });
      
      return sheets;
    } catch (e) {
      console.error('Error parsing Excel file:', e);
      setError(true);
      return [];
    }
  }, [document.fileData]);

  if (error || workbookData.length === 0) {
    return (
      <div className="text-center p-8" data-testid="preview-excel-error">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Unable to preview this Excel file
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Excel
        </p>
      </div>
    );
  }

  const currentSheet = workbookData[activeSheet];

  return (
    <div className="w-full h-full flex flex-col" data-testid="preview-excel">
      {workbookData.length > 1 && (
        <div className="flex gap-1 p-2 border-b bg-muted/30 overflow-x-auto shrink-0">
          {workbookData.map((sheet, index) => (
            <Button
              key={sheet.name}
              variant={activeSheet === index ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSheet(index)}
              className="shrink-0"
              data-testid={`button-sheet-${index}`}
            >
              {sheet.name}
            </Button>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto">
        {currentSheet.data.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            This sheet is empty
          </div>
        ) : (
          <table className="w-full border-collapse text-sm" data-testid="table-excel-data">
            <tbody>
              {currentSheet.data.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-muted/50 font-medium" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="border border-border px-3 py-2 whitespace-nowrap"
                    >
                      {cell !== undefined && cell !== null ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WordPreview({ document }: { document: Document }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const convertDocument = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        const base64Data = document.fileData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        setHtmlContent(result.value);
      } catch (e) {
        console.error('Error converting Word document:', e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    convertDocument();
  }, [document.fileData]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center" data-testid="preview-word-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div className="text-center p-8" data-testid="preview-word-error">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Unable to preview this Word document
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Word
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full overflow-auto p-6 bg-white dark:bg-gray-900 prose prose-sm dark:prose-invert max-w-none"
      data-testid="preview-word"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
