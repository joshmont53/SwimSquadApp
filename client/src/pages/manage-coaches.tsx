import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Coach as AdaptedCoach, QualificationLevel } from '../lib/typeAdapters';
import type { InsertCoach } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, UserMinus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Backend coach shape — includes fields not present in the adapted type
interface BackendCoach {
  id: string;
  firstName: string;
  lastName: string;
  level: string;
  dob: string;
  clubId?: string | null;
  recordStatus?: string | null;
}

// The component receives the adapted Coach[] from App.tsx for type compatibility,
// but always fetches backend coaches directly (to access dob, recordStatus, etc.).
interface ManageCoachesProps {
  coaches: AdaptedCoach[];
  onBack: () => void;
}

const qualificationLevels: QualificationLevel[] = [
  'No Qualification',
  'Level 1',
  'Level 2',
  'Level 3',
];

export function ManageCoaches({ onBack }: ManageCoachesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<BackendCoach | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<BackendCoach | null>(null);
  const [deactivatingCoach, setDeactivatingCoach] = useState<BackendCoach | null>(null);
  const [reactivatingCoach, setReactivatingCoach] = useState<BackendCoach | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    level: 'Level 1' as QualificationLevel,
    dob: '',
  });

  // All coaches including inactive — admin only
  const { data: allCoaches } = useQuery<BackendCoach[]>({
    queryKey: ['/api/coaches/all'],
    enabled: isAdmin,
  });

  // Active coaches — for non-admins or as fallback
  const { data: activeCoaches } = useQuery<BackendCoach[]>({
    queryKey: ['/api/coaches'],
  });

  // Admins see all coaches (active + inactive), others see active only
  const coaches: BackendCoach[] = isAdmin
    ? (allCoaches ?? activeCoaches ?? [])
    : (activeCoaches ?? []);

  const createMutation = useMutation({
    mutationFn: async (data: InsertCoach) => {
      return await apiRequest('POST', '/api/coaches', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/all'] });
      setIsAddDialogOpen(false);
      setFormData({ firstName: '', lastName: '', level: 'Level 1' as QualificationLevel, dob: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to add coach', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCoach }) => {
      return await apiRequest('PATCH', `/api/coaches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/all'] });
      setEditingCoach(null);
      setFormData({ firstName: '', lastName: '', level: 'Level 1' as QualificationLevel, dob: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update coach', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/coaches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/all'] });
      setDeletingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete coach', variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/coaches/${id}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/all'] });
      toast({ title: 'Coach deactivated', description: 'The coach and their login have been deactivated. Billing updated.' });
      setDeactivatingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to deactivate coach', variant: 'destructive' });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/coaches/${id}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coaches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/all'] });
      toast({ title: 'Coach reactivated', description: 'The coach has been reactivated. Billing updated.' });
      setReactivatingCoach(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to reactivate coach', variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    if (!formData.firstName || !formData.lastName || !formData.dob) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      level: formData.level,
      dob: formData.dob,
    });
  };

  const handleEdit = (coach: BackendCoach) => {
    setEditingCoach(coach);
    setFormData({
      firstName: coach.firstName,
      lastName: coach.lastName,
      level: coach.level as QualificationLevel,
      dob: coach.dob,
    });
  };

  const handleSaveEdit = () => {
    if (!editingCoach) return;
    if (!formData.firstName || !formData.lastName || !formData.dob) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: editingCoach.id,
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        level: formData.level,
        dob: formData.dob,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" data-testid="view-manage-coaches">
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
              <h1 className="text-base truncate">Coaches</h1>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="shrink-0" data-testid="button-add-coach">
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {coaches.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No coaches found. Add your first coach to get started.</p>
              </Card>
            ) : (
              coaches.map((coach) => {
                const isInactive = coach.recordStatus === 'inactive';
                return (
                  <Card
                    key={coach.id}
                    className={cn('p-4', isInactive && 'opacity-50')}
                    data-testid={`coach-card-${coach.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium">{coach.firstName} {coach.lastName}</h3>
                          {isInactive && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-inactive-${coach.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={coach.level === 'Level 3' ? 'default' : 'secondary'}
                            className="flex-shrink-0"
                          >
                            {coach.level}
                          </Badge>
                          <p className="text-sm text-muted-foreground whitespace-nowrap">
                            DOB: {coach.dob}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {/* Edit — only for active coaches */}
                        {!isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(coach)}
                            data-testid={`button-edit-coach-${coach.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {/* Deactivate — admin only, active coaches */}
                        {isAdmin && !isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivatingCoach(coach)}
                            data-testid={`button-deactivate-coach-${coach.id}`}
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                        {/* Reactivate — admin only, inactive coaches */}
                        {isAdmin && isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReactivatingCoach(coach)}
                            data-testid={`button-reactivate-coach-${coach.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                        {/* Delete — admin only, active coaches */}
                        {isAdmin && !isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCoach(coach)}
                            data-testid={`button-delete-coach-${coach.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Coach Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-coach">
          <DialogHeader>
            <DialogTitle>Add New Coach</DialogTitle>
            <DialogDescription>Add a new coach to the system</DialogDescription>
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
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                data-testid="input-date-of-birth"
              />
            </div>
            <div>
              <Label htmlFor="level">Qualification Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value as QualificationLevel })}
              >
                <SelectTrigger id="level" data-testid="select-level">
                  <SelectValue placeholder="Select qualification level" />
                </SelectTrigger>
                <SelectContent>
                  {qualificationLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-coach">
              {createMutation.isPending ? 'Adding…' : 'Add Coach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog open={!!editingCoach} onOpenChange={(open) => !open && setEditingCoach(null)}>
        <DialogContent data-testid="dialog-edit-coach">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update coach information</DialogDescription>
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
              <Label htmlFor="edit-dob">Date of Birth *</Label>
              <Input
                id="edit-dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                data-testid="input-edit-date-of-birth"
              />
            </div>
            <div>
              <Label htmlFor="edit-level">Qualification Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value as QualificationLevel })}
              >
                <SelectTrigger id="edit-level" data-testid="select-edit-level">
                  <SelectValue placeholder="Select qualification level" />
                </SelectTrigger>
                <SelectContent>
                  {qualificationLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCoach(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} data-testid="button-update-coach">
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Coach Confirmation */}
      <AlertDialog open={!!deletingCoach} onOpenChange={(open) => !open && setDeletingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCoach?.firstName} {deletingCoach?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-coach">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingCoach && deleteMutation.mutate(deletingCoach.id)}
              data-testid="button-confirm-delete-coach"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Coach Confirmation */}
      <AlertDialog open={!!deactivatingCoach} onOpenChange={(open) => !open && setDeactivatingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivatingCoach?.firstName} {deactivatingCoach?.lastName}?
              They will no longer be able to log in and will be removed from your active billing count.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivateMutation.isPending}
              onClick={() => deactivatingCoach && deactivateMutation.mutate(deactivatingCoach.id)}
              data-testid="button-confirm-deactivate"
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Coach Confirmation */}
      <AlertDialog open={!!reactivatingCoach} onOpenChange={(open) => !open && setReactivatingCoach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Reactivate {reactivatingCoach?.firstName} {reactivatingCoach?.lastName}? They will regain access and will be included in your active billing count again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reactivate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reactivateMutation.isPending}
              onClick={() => reactivatingCoach && reactivateMutation.mutate(reactivatingCoach.id)}
              data-testid="button-confirm-reactivate"
            >
              {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
