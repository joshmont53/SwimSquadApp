import { ArrowLeft, Plus, Pencil, Trash2, CalendarIcon, Users, Search, Filter, List, LayoutGrid } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Swimmer, Squad } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { SquadOverviewGrid } from './SquadOverviewGrid';

interface ManageSwimmersProps {
  swimmers: Swimmer[];
  squads: Squad[];
  onBack: () => void;
}

type ViewMode = 'list' | 'grid';

export function ManageSwimmers({ swimmers, squads, onBack }: ManageSwimmersProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSwimmer, setEditingSwimmer] = useState<Swimmer | null>(null);
  const [selectedSwimmers, setSelectedSwimmers] = useState<Set<string>>(new Set());
  const [isBulkSquadDialogOpen, setIsBulkSquadDialogOpen] = useState(false);
  const [bulkSquadId, setBulkSquadId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSquadId, setFilterSquadId] = useState<string>('all');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    squadId: '',
    asaNumber: '',
  });

  const handleAddSwimmer = () => {
    setEditingSwimmer(null);
    setFormData({
      firstName: '',
      lastName: '',
      squadId: '',
      asaNumber: '',
    });
    setIsDialogOpen(true);
  };

  const handleEditSwimmer = (swimmer: Swimmer) => {
    setEditingSwimmer(swimmer);
    setFormData({
      firstName: swimmer.firstName,
      lastName: swimmer.lastName,
      squadId: swimmer.squadId,
      asaNumber: swimmer.asaNumber.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSwimmer = (swimmer: Swimmer) => {
    if (confirm(`Are you sure you want to delete ${swimmer.firstName} ${swimmer.lastName}?`)) {
      alert('Delete functionality coming soon!');
    }
  };

  const handleSubmit = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.squadId ||
      !formData.asaNumber
    ) {
      alert('Please fill in all fields');
      return;
    }

    const asaNum = parseInt(formData.asaNumber);
    if (isNaN(asaNum)) {
      alert('ASA Number must be a valid number');
      return;
    }

    if (editingSwimmer) {
      alert(`Update swimmer: ${formData.firstName} ${formData.lastName}`);
    } else {
      alert(`Add new swimmer: ${formData.firstName} ${formData.lastName}`);
    }
    setIsDialogOpen(false);
  };

  const getSquadName = (squadId: string) => {
    const squad = squads.find((s) => s.id === squadId);
    return squad ? squad.name : 'Unknown';
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
      alert('Please select a squad');
      return;
    }

    const selectedSwimmersArray = Array.from(selectedSwimmers);
    if (selectedSwimmersArray.length === 0) {
      alert('Please select at least one swimmer');
      return;
    }

    const squadName = getSquadName(bulkSquadId);
    const swimmerNames = selectedSwimmersArray
      .map(id => {
        const swimmer = swimmers.find(s => s.id === id);
        return swimmer ? `${swimmer.firstName} ${swimmer.lastName}` : '';
      })
      .filter(name => name !== '');

    // In real implementation, this would update the database
    alert(
      `Successfully moved ${selectedSwimmersArray.length} swimmer${selectedSwimmersArray.length > 1 ? 's' : ''} to ${squadName}:\n\n${swimmerNames.join('\n')}`
    );
    
    setIsBulkSquadDialogOpen(false);
    setSelectedSwimmers(new Set());
    setBulkSquadId('');
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
    <div className={cn(
      "mx-auto",
      viewMode === 'list' ? 'max-w-4xl pb-24' : 'max-w-7xl h-screen overflow-hidden flex flex-col'
    )}>
      {/* Compact Inline Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b flex-shrink-0 pt-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base truncate">Swimmers</h1>
        </div>
        <Button onClick={handleAddSwimmer} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ASA number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterSquadId}
          onValueChange={setFilterSquadId}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by squad" />
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

      {/* View Toggle */}
      <div className="mt-3 hidden sm:flex gap-2 flex-shrink-0">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4 mr-2" />
          List View
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Grid View
        </Button>
      </div>

      {viewMode === 'list' && (
        <>
          {/* Mobile Select All Button */}
          <div className="sm:hidden mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
              className="w-full"
            >
              {selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Desktop Select All Button */}
          <div className="hidden sm:block mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedSwimmers.size === filteredSwimmers.length && filteredSwimmers.length > 0 ? 'Deselect All' : 'Select All'}
              {selectedSwimmers.size > 0 && ` (${selectedSwimmers.size})`}
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedSwimmers.size > 0 && (
            <div className="mt-3 p-3 bg-muted rounded-lg flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                {selectedSwimmers.size} swimmer{selectedSwimmers.size !== 1 ? 's' : ''} selected
              </p>
              <Button 
                size="sm" 
                onClick={() => setIsBulkSquadDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-1.5" />
                Change Squad
              </Button>
            </div>
          )}

          {/* Swimmers List */}
          <div className="space-y-3 mt-6">
            {filteredSwimmers.length > 0 ? (
              filteredSwimmers.map((swimmer) => (
                <div
                  key={swimmer.id}
                  className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedSwimmers.has(swimmer.id)}
                      onCheckedChange={() => handleBulkSquadChange(swimmer.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mb-1">
                        <h3 className="break-words">
                          {swimmer.firstName} {swimmer.lastName}
                        </h3>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <Badge variant="outline">
                          {getSquadName(swimmer.squadId)}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          ASA: {swimmer.asaNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSwimmer(swimmer)}
                      >
                        <Pencil className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSwimmer(swimmer)}
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No swimmers found</p>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === 'grid' && (
        <div className="mt-6 flex-1 overflow-hidden">
          <SquadOverviewGrid swimmers={swimmers} squads={squads} />
        </div>
      )}

      {/* Add/Edit Swimmer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSwimmer ? 'Edit Swimmer' : 'Add New Swimmer'}
            </DialogTitle>
            <DialogDescription>
              {editingSwimmer 
                ? 'Update the swimmer details below'
                : 'Enter the details for the new swimmer'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="squad">Squad</Label>
              <Select
                value={formData.squadId}
                onValueChange={(value) =>
                  setFormData({ ...formData, squadId: value })
                }
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="asaNumber">ASA Number</Label>
              <Input
                id="asaNumber"
                value={formData.asaNumber}
                onChange={(e) =>
                  setFormData({ ...formData, asaNumber: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingSwimmer ? 'Update' : 'Add'} Swimmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Squad Change Dialog */}
      <Dialog open={isBulkSquadDialogOpen} onOpenChange={setIsBulkSquadDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Squad</DialogTitle>
            <DialogDescription>
              Move {selectedSwimmers.size} selected swimmer{selectedSwimmers.size !== 1 ? 's' : ''} to a new squad
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkSquad">New Squad</Label>
              <Select
                value={bulkSquadId}
                onValueChange={setBulkSquadId}
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkSquadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkSquadSubmit}>
              Move Swimmers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}