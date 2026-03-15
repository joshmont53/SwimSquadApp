import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
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
  Trophy,
  ListChecks
} from 'lucide-react';
import { cn } from './ui/utils';
import { format } from 'date-fns';
import { Coach, Squad } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { NotesSection } from './NotesSection';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  uploadDate: Date;
  uploadedBy: string;
  fileData: string; // Base64 encoded file data
}

type DocumentCategory = 
  | 'Session Plans'
  | 'Competition Calendars'
  | 'Training Programs'
  | 'Meet Results'
  | 'Meeting Notes'
  | 'Other';

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

const CATEGORY_ICONS: Record<DocumentCategory, any> = {
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

  // Load documents from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('handbook_documents');
    if (stored) {
      const parsed = JSON.parse(stored);
      setDocuments(parsed.map((doc: any) => ({
        ...doc,
        uploadDate: new Date(doc.uploadDate),
      })));
    }
  }, []);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('handbook_documents', JSON.stringify(documents));
  }, [documents]);

  const handleFileUpload = async (files: FileList | null, category: DocumentCategory) => {
    if (!files) return;

    const newDocuments: Document[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Convert file to base64
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
        
        // Update state after all files are processed
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
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Handbook</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
            <Badge variant="secondary" className="ml-auto">
              {documents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 mt-3">
          {/* Upload Area */}
          <Card>
            <button
              onClick={() => setIsUploadExpanded(!isUploadExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
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
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => {
                        const Icon = CATEGORY_ICONS[category];
                        return (
                          <SelectItem key={category} value={category}>
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
                  />
                  <Button asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </label>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocumentCategory | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    All Categories
                  </div>
                </SelectItem>
                {CATEGORIES.map(category => {
                  const Icon = CATEGORY_ICONS[category];
                  return (
                    <SelectItem key={category} value={category}>
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

          {/* Documents Grid */}
          {filteredDocuments.length === 0 ? (
            <Card className="p-12 text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.type);
                const CategoryIcon = CATEGORY_ICONS[doc.category];
                
                return (
                  <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* File Icon and Name */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" title={doc.name}>
                            {doc.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>

                      {/* Category Badge */}
                      <Badge className={cn("text-xs", getCategoryColor(doc.category))}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {doc.category}
                      </Badge>

                      {/* Metadata */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Uploaded by {doc.uploadedBy}</div>
                        <div>{format(doc.uploadDate, 'MMM dd, yyyy')}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setPreviewDocument(doc)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-destructive hover:text-destructive"
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

      {/* Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
            <DialogDescription>
              {previewDocument && (
                <>
                  {previewDocument.category} uploaded by {previewDocument.uploadedBy} on {format(previewDocument.uploadDate, 'MMM dd, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewDocument && (
              <DocumentPreview document={previewDocument} />
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => previewDocument && handleDownload(previewDocument)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewDocument(null)}
              className="ml-auto"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Document Preview Component
function DocumentPreview({ document }: { document: Document }) {
  const [pdfError, setPdfError] = useState(false);

  if (document.type.includes('pdf')) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        {pdfError ? (
          <div className="text-center p-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              PDF preview not available in demo mode
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
            onError={() => setPdfError(true)}
          />
        )}
      </div>
    );
  }

  if (document.type.includes('word') || document.type.includes('document')) {
    return (
      <div className="text-center p-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Word document preview not available in demo mode
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Word
        </p>
      </div>
    );
  }

  if (document.type.includes('sheet') || document.type.includes('excel')) {
    return (
      <div className="text-center p-8">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">
          Excel spreadsheet preview not available in demo mode
        </p>
        <p className="text-sm text-muted-foreground">
          Click Download to view the file in Microsoft Excel
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}