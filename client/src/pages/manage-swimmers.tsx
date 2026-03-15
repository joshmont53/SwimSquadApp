import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Swimmer, Squad } from '../lib/typeAdapters';
import type { InsertSwimmer } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Menu, Search, Filter, Users, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SquadOverviewGrid } from './squad-overview-grid';

interface ManageSwimmersProps {
  swimmers: Swimmer[];
  squads: Squad[];
  onBack: () => void;
}

type ViewMode = 'list' | 'grid';

export function ManageSwimmers({ swimmers, squads, onBack }: ManageSwimmersProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSwimmer, setEditingSwimmer] = useState<Swimmer | null>(null);
  const [deletingSwimmer, setDeletingSwimmer] = useState<Swimmer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSquadId, setFilterSquadId] = useState<string>('all');
  const [selectedSwimmers, setSelectedSwimmers] = useState<Set<string>>(new Set());
  const [isBulkSquadDialogOpen, setIsBulkSquadDialogOpen] = useState(false);
  const [bulkSquadId, setBulkSquadId] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    squadId: '',
    asaNumber: 0,
    gender: 'male' as 'male' | 'female',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSwimmer) => {
      return await apiRequest('POST', '/api/swimmers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      setIsAddDialogOpen(false);
      setFormData({ firstName: '', lastName: '', dateOfBirth: '', squadId: '', asaNumber: 0, gender: 'male' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add swimmer',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSwimmer }) => {
      return await apiRequest('PATCH', `/api/swimmers/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      setEditingSwimmer(null);
      setFormData({ firstName: '', lastName: '', dateOfBirth: '', squadId: '', asaNumber: 0, gender: 'male' });
      // Remove edited swimmer from selection if it was selected
      if (selectedSwimmers.has(variables.id)) {
        const newSelected = new Set(selectedSwimmers);
        newSelected.delete(variables.id);
        setSelectedSwimmers(newSelected);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update swimmer',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/swimmers/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      setDeletingSwimmer(null);
      // Remove deleted swimmer from selection if it was selected
      if (selectedSwimmers.has(deletedId)) {
        const newSelected = new Set(selectedSwimmers);
        newSelected.delete(deletedId);
        setSelectedSwimmers(newSelected);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete swimmer',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdateSquadMutation = useMutation({
    mutationFn: async ({ swimmerIds, newSquadId }: { swimmerIds: string[]; newSquadId: string }) => {
      return await apiRequest('PATCH', '/api/swimmers/bulk-update-squad', { 
        swimmerIds, 
        newSquadId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      setIsBulkSquadDialogOpen(false);
      setSelectedSwimmers(new Set());
      setBulkSquadId('');
      toast({ 
        title: 'Success', 
        description: 'Swimmers moved successfully' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to move swimmers',
        variant: 'destructive' 
      });
    },
  });

  const handleAdd = () => {
    if (!formData.firstName || !formData.lastName || !formData.squadId || !formData.dateOfBirth) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const swimmerData: InsertSwimmer = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      squadId: formData.squadId,
      asaNumber: formData.asaNumber,
      dob: formData.dateOfBirth,
      gender: formData.gender,
    };

    createMutation.mutate(swimmerData);
  };

  const handleEdit = (swimmer: Swimmer) => {
    setEditingSwimmer(swimmer);
    setFormData({
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      dateOfBirth: swimmer.dateOfBirth.toISOString().split('T')[0],
      squadId: swimmer.squadId || '',
      asaNumber: swimmer.asaNumber,
      gender: swimmer.gender,
    });
  };

  const handleSaveEdit = () => {
    if (!editingSwimmer) return;

    if (!formData.firstName || !formData.lastName || !formData.squadId || !formData.dateOfBirth) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const swimmerData: InsertSwimmer = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      squadId: formData.squadId,
      asaNumber: formData.asaNumber,
      dob: formData.dateOfBirth,
      gender: formData.gender,
    };

    updateMutation.mutate({ id: editingSwimmer.id, data: swimmerData });
  };

  const handleDelete = (swimmer: Swimmer) => {
    setDeletingSwimmer(swimmer);
  };

  const confirmDelete = () => {
    if (!deletingSwimmer) return;
    deleteMutation.mutate(deletingSwimmer.id);
  };

  const handleBulkSquadChange = (swimmerId: string) => {
    const newSelectedSwimmers = new Set(selectedSwimmers);
    if (newSelectedSwimmers.has(swimmerId)) {
      newSelectedSwimmers.delete(swimmerId);
    } else {
      newSelectedSwimmers.add(swimmerId);
    }
    setSelectedSwimmers(newSelectedSwimmers);
  };

  const handleSelectAll = () => {
    if (selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0) {
      setSelectedSwimmers(new Set());
    } else {
      setSelectedSwimmers(new Set(filteredSwimmers.map(s => s.id)));
    }
  };

  const handleBulkSquadSubmit = () => {
    if (!bulkSquadId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a squad',
        variant: 'destructive',
      });
      return;
    }

    const selectedSwimmersArray = Array.from(selectedSwimmers);
    if (selectedSwimmersArray.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one swimmer',
        variant: 'destructive',
      });
      return;
    }

    bulkUpdateSquadMutation.mutate({ 
      swimmerIds: selectedSwimmersArray, 
      newSquadId: bulkSquadId 
    });
  };

  // Filter swimmers based on search query and squad filter
  const filteredSwimmers = useMemo(() => {
    return swimmers.filter(swimmer => {
      // Search by name or ASA number
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
                           swimmer.firstName.toLowerCase().includes(searchLower) ||
                           swimmer.lastName.toLowerCase().includes(searchLower) ||
                           swimmer.asaNumber.toString().includes(searchQuery);
      
      // Filter by squad
      const matchesSquad = filterSquadId === 'all' || swimmer.squadId === filterSquadId;
      
      return matchesSearch && matchesSquad;
    });
  }, [swimmers, searchQuery, filterSquadId]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" data-testid="view-manage-swimmers">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className={cn(viewMode === 'grid' ? 'max-w-7xl mx-auto' : 'max-w-4xl mx-auto')}>
          <div className="flex items-center gap-3 mb-6 pb-3 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base truncate">Swimmers</h1>
            </div>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="shrink-0" data-testid="button-add-swimmer">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ASA number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-swimmers"
              />
            </div>
            <Select
              value={filterSquadId}
              onValueChange={setFilterSquadId}
            >
              <SelectTrigger data-testid="select-filter-squad">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Squads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Squads</SelectItem>
                {squads.map((squad) => (
                  <SelectItem key={squad.id} value={squad.id}>
                    {squad.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle - hidden on mobile */}
          <div className="mt-3 hidden sm:flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4 mr-2" />
              List View
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              data-testid="button-grid-view"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid View
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="flex-1 overflow-hidden pt-4 pb-4 max-w-7xl mx-auto w-full">
          <SquadOverviewGrid swimmers={swimmers} squads={squads} />
        </div>
      )}

      {viewMode === 'list' && (
      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container">
        <div className="max-w-4xl mx-auto pt-4">
          {/* Select all control - only show if there are swimmers to select */}
          {filteredSwimmers.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedSwimmers.size === filteredSwimmers.length}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <label 
                htmlFor="select-all" 
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Select all {filteredSwimmers.length} swimmer{filteredSwimmers.length > 1 ? 's' : ''}
              </label>
            </div>
          )}
          
          <div className="space-y-3">
            {filteredSwimmers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {swimmers.length === 0 
                    ? 'No swimmers found. Add your first swimmer to get started.'
                    : 'No swimmers match your search criteria.'}
                </p>
              </Card>
            ) : (
              filteredSwimmers.map((swimmer) => {
                const isSelected = selectedSwimmers.has(swimmer.id);
                return (
                  <Card
                    key={swimmer.id}
                    className={`p-4 transition-all ${
                      isSelected 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700 shadow-sm' 
                        : ''
                    }`}
                    data-testid={`swimmer-card-${swimmer.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          id={`swimmer-${swimmer.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleBulkSquadChange(swimmer.id)}
                          className="mt-1"
                          data-testid={`checkbox-swimmer-${swimmer.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium mb-2">{swimmer.name}</h3>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="flex-shrink-0">
                              {squads.find((s) => s.id === swimmer.squadId)?.name || 'No Squad'}
                            </Badge>
                            <p className="text-sm text-muted-foreground whitespace-nowrap">
                              ASA: {swimmer.asaNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(swimmer)}
                          data-testid={`button-edit-swimmer-${swimmer.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(swimmer)}
                          data-testid={`button-delete-swimmer-${swimmer.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-swimmer">
          <DialogHeader>
            <DialogTitle>Add New Swimmer</DialogTitle>
            <DialogDescription>Add a new swimmer to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                data-testid="input-last-name"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-dob"
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' })}
              >
                <SelectTrigger id="gender" data-testid="select-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="squadId">Squad *</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) => setFormData({ ...formData, squadId: value })}
              >
                <SelectTrigger id="squadId" data-testid="select-squad">
                  <SelectValue placeholder="Select a squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asaNumber">ASA Number</Label>
              <Input
                id="asaNumber"
                type="number"
                value={formData.asaNumber}
                onChange={(e) => setFormData({ ...formData, asaNumber: parseInt(e.target.value) || 0 })}
                data-testid="input-asa-number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} data-testid="button-save-swimmer">
              Add Swimmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={!!editingSwimmer} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingSwimmer(null);
            setFormData({ firstName: '', lastName: '', dateOfBirth: '', squadId: '', asaNumber: 0, gender: 'male' });
          }
        }}
      >
        <DialogContent data-testid="dialog-edit-swimmer">
          <DialogHeader>
            <DialogTitle>Edit Swimmer</DialogTitle>
            <DialogDescription>Update swimmer information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                data-testid="input-edit-first-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                data-testid="input-edit-last-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-dateOfBirth">Date of Birth *</Label>
              <Input
                id="edit-dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                data-testid="input-edit-dob"
              />
            </div>
            <div>
              <Label htmlFor="edit-gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value as 'male' | 'female' })}
              >
                <SelectTrigger id="edit-gender" data-testid="select-edit-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-squadId">Squad *</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) => setFormData({ ...formData, squadId: value })}
              >
                <SelectTrigger id="edit-squadId" data-testid="select-edit-squad">
                  <SelectValue placeholder="Select a squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-asaNumber">ASA Number</Label>
              <Input
                id="edit-asaNumber"
                type="number"
                value={formData.asaNumber}
                onChange={(e) => setFormData({ ...formData, asaNumber: parseInt(e.target.value) || 0 })}
                data-testid="input-edit-asa-number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSwimmer(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-swimmer">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSwimmer} onOpenChange={(open) => !open && setDeletingSwimmer(null)}>
        <DialogContent data-testid="dialog-delete-swimmer">
          <DialogHeader>
            <DialogTitle>Delete Swimmer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingSwimmer?.firstName} {deletingSwimmer?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSwimmer(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-swimmer">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Squad Change Dialog */}
      <Dialog open={isBulkSquadDialogOpen} onOpenChange={setIsBulkSquadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-bulk-squad-change">
          <DialogHeader>
            <DialogTitle>Move {selectedSwimmers.size} Swimmer{selectedSwimmers.size > 1 ? 's' : ''} to Squad</DialogTitle>
            <DialogDescription>
              Select a squad to move the selected swimmers to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Moving swimmers list */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3">Moving swimmers:</h4>
              <div className="space-y-2">
                {Array.from(selectedSwimmers).map(swimmerId => {
                  const swimmer = swimmers.find(s => s.id === swimmerId);
                  if (!swimmer) return null;
                  const squadName = squads.find(s => s.id === swimmer.squadId)?.name || 'Unknown';
                  return (
                    <div key={swimmer.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{swimmer.name}</span>
                      <Badge variant="secondary">{squadName}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* New Squad Selector */}
            <div className="space-y-2">
              <Label htmlFor="bulk-squad">New Squad</Label>
              <Select
                value={bulkSquadId}
                onValueChange={setBulkSquadId}
              >
                <SelectTrigger id="bulk-squad" data-testid="select-bulk-squad">
                  <SelectValue placeholder="Select squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((squad) => (
                    <SelectItem key={squad.id} value={squad.id}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBulkSquadDialogOpen(false);
                setBulkSquadId('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkSquadSubmit}
              disabled={bulkUpdateSquadMutation.isPending}
              data-testid="button-move-swimmers"
            >
              {bulkUpdateSquadMutation.isPending ? 'Moving...' : 'Move Swimmers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Toolbar - Fixed at bottom */}
      {selectedSwimmers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-2xl">
          <div className="bg-green-600 dark:bg-green-700 text-white rounded-full shadow-lg px-6 py-3 flex items-center gap-4 justify-center">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{selectedSwimmers.size} selected</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                setBulkSquadId('');
                setIsBulkSquadDialogOpen(true);
              }}
              data-testid="button-change-squad"
            >
              Change Squad
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
