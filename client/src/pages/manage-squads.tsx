import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Squad, Coach } from '../lib/typeAdapters';
import type { InsertSquad } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Pencil, Trash2, Menu } from 'lucide-react';

interface ManageSquadsProps {
  squads: Squad[];
  coaches: Coach[];
  onBack: () => void;
}

export function ManageSquads({ squads, coaches, onBack }: ManageSquadsProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [deletingSquad, setDeletingSquad] = useState<Squad | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    primaryCoachId: '',
    color: '#3B82F6',
    average50mSeconds: '60',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSquad) => {
      return await apiRequest('POST', '/api/squads', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/squads'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', primaryCoachId: '', color: '#3B82F6', average50mSeconds: '60' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add squad',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSquad }) => {
      return await apiRequest('PATCH', `/api/squads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/squads'] });
      setEditingSquad(null);
      setFormData({ name: '', primaryCoachId: '', color: '#3B82F6', average50mSeconds: '60' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update squad',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/squads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/squads'] });
      setDeletingSquad(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete squad',
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    const average50mSeconds = Number(formData.average50mSeconds);
    if (!formData.name || !formData.primaryCoachId || !Number.isInteger(average50mSeconds) || average50mSeconds < 15 || average50mSeconds > 300) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all fields and enter an average 50m pace between 15 and 300 seconds',
        variant: 'destructive',
      });
      return;
    }

    const squadData: InsertSquad = {
      squadName: formData.name,
      primaryCoachId: formData.primaryCoachId,
      color: formData.color,
      average50mSeconds,
    };

    createMutation.mutate(squadData);
  };

  const handleEdit = (squad: Squad) => {
    setEditingSquad(squad);
    setFormData({
      name: squad.name,
      primaryCoachId: squad.primaryCoachId || '',
      color: squad.color,
      average50mSeconds: String(squad.average50mSeconds || 60),
    });
  };

  const handleSaveEdit = () => {
    if (!editingSquad) return;

    const average50mSeconds = Number(formData.average50mSeconds);
    if (!formData.name || !formData.primaryCoachId || !Number.isInteger(average50mSeconds) || average50mSeconds < 15 || average50mSeconds > 300) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all fields and enter an average 50m pace between 15 and 300 seconds',
        variant: 'destructive',
      });
      return;
    }

    const squadData: InsertSquad = {
      squadName: formData.name,
      primaryCoachId: formData.primaryCoachId,
      color: formData.color,
      average50mSeconds,
    };

    updateMutation.mutate({ id: editingSquad.id, data: squadData });
  };

  const handleDelete = (squad: Squad) => {
    setDeletingSquad(squad);
  };

  const confirmDelete = () => {
    if (!deletingSquad) return;
    deleteMutation.mutate(deletingSquad.id);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" data-testid="view-manage-squads">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background">
        <div className="max-w-4xl mx-auto">
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
              <h1 className="text-base truncate">Squads</h1>
            </div>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="shrink-0" data-testid="button-add-squad">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {squads.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No squads found. Add your first squad to get started.</p>
              </Card>
            ) : (
              squads.map((squad) => (
                <Card
                  key={squad.id}
                  className="p-4"
                  data-testid={`squad-card-${squad.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-1">{squad.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Primary Coach: {coaches.find((c) => c.id === squad.primaryCoachId)?.name || '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Average 50m pace: {squad.average50mSeconds || 60} seconds
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(squad)}
                        data-testid={`button-edit-squad-${squad.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(squad)}
                        data-testid={`button-delete-squad-${squad.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-squad">
          <DialogHeader>
            <DialogTitle>Add New Squad</DialogTitle>
            <DialogDescription>Add a new training squad to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Squad Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="primaryCoachId">Primary Coach *</Label>
              <Select
                value={formData.primaryCoachId}
                onValueChange={(value) => setFormData({ ...formData, primaryCoachId: value })}
              >
                <SelectTrigger id="primaryCoachId" data-testid="select-coach">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Squad Color *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-color"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="average50mSeconds">Average 50m pace (seconds) *</Label>
              <Input
                id="average50mSeconds"
                type="number"
                min={15}
                max={300}
                step={1}
                value={formData.average50mSeconds}
                onChange={(e) => setFormData({ ...formData, average50mSeconds: e.target.value })}
                data-testid="input-average-50m-seconds"
              />
              <p className="mt-1 text-xs text-muted-foreground">Used only to estimate session swimming time. Default: 60 seconds.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} data-testid="button-save-squad">
              Add Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSquad} onOpenChange={(open) => !open && setEditingSquad(null)}>
        <DialogContent data-testid="dialog-edit-squad">
          <DialogHeader>
            <DialogTitle>Edit Squad</DialogTitle>
            <DialogDescription>Update squad information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Squad Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-primaryCoachId">Primary Coach *</Label>
              <Select
                value={formData.primaryCoachId}
                onValueChange={(value) => setFormData({ ...formData, primaryCoachId: value })}
              >
                <SelectTrigger id="edit-primaryCoachId" data-testid="select-edit-coach">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-color">Squad Color *</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                  data-testid="input-edit-color"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-average50mSeconds">Average 50m pace (seconds) *</Label>
              <Input
                id="edit-average50mSeconds"
                type="number"
                min={15}
                max={300}
                step={1}
                value={formData.average50mSeconds}
                onChange={(e) => setFormData({ ...formData, average50mSeconds: e.target.value })}
                data-testid="input-edit-average-50m-seconds"
              />
              <p className="mt-1 text-xs text-muted-foreground">Used only to estimate session swimming time.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSquad(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-update-squad">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSquad} onOpenChange={(open) => !open && setDeletingSquad(null)}>
        <DialogContent data-testid="dialog-delete-squad">
          <DialogHeader>
            <DialogTitle>Delete Squad</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingSquad?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSquad(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete-squad">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
