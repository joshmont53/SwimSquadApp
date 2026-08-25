import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { AuthorizedInvitation, Coach as BackendCoach } from '@shared/schema';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Mail, Ban, AlertCircle } from 'lucide-react';

interface ManageInvitationsProps {
  onBack: () => void;
}

export function ManageInvitations({ onBack }: ManageInvitationsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [revokingInvitation, setRevokingInvitation] = useState<AuthorizedInvitation | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    coachId: '',
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<AuthorizedInvitation[]>({
    queryKey: ['/api/invitations'],
  });

  // Fetch coaches for dropdown
  const { data: coaches = [], isLoading: isLoadingCoaches } = useQuery<BackendCoach[]>({
    queryKey: ['/api/coaches'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; coachId: string }) => {
      return await apiRequest('POST', '/api/invitations', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setIsCreateDialogOpen(false);
      setFormData({ email: '', coachId: '' });
      
      if (response.emailSent) {
        toast({
          title: 'Invitation Created',
          description: 'Invitation email sent successfully',
        });
      } else {
        toast({
          title: 'Invitation Created',
          description: response.emailError || 'Invitation created but email failed to send. You can resend it.',
          variant: 'default',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invitation',
        variant: 'destructive',
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/invitations/${id}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      toast({
        title: 'Email Sent',
        description: 'Invitation email resent successfully',
      });
      setResendingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
      setResendingId(null);
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/invitations/${id}/reissue`);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      toast({
        title: 'Invitation Reissued',
        description: response.emailSent
          ? 'A new invitation email has been sent successfully'
          : response.emailError || 'Invitation reissued but email delivery failed. You can resend it.',
        variant: response.emailSent ? 'default' : 'destructive',
      });
      setReissuingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reissue invitation',
        variant: 'destructive',
      });
      setReissuingId(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/invitations/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setRevokingInvitation(null);
      toast({
        title: 'Invitation Revoked',
        description: 'Invitation has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke invitation',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!formData.email || !formData.coachId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleResend = (id: string) => {
    setResendingId(id);
    resendMutation.mutate(id);
  };

  const handleReissue = (id: string) => {
    setReissuingId(id);
    reissueMutation.mutate(id);
  };

  const handleRevoke = (invitation: AuthorizedInvitation) => {
    setRevokingInvitation(invitation);
  };

  const confirmRevoke = () => {
    if (!revokingInvitation) return;
    revokeMutation.mutate(revokingInvitation.id);
  };

  const getCoachName = (coachId: string): string => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return 'Unknown Coach';
    return `${coach.firstName} ${coach.lastName}`;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'accepted':
        return 'outline';
      case 'expired':
      case 'revoked':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isExpired = (expiresAt: string | Date | null): boolean => {
    if (!expiresAt) return false;
    const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return expiryDate < new Date();
  };

  const canResend = (invitation: AuthorizedInvitation): boolean => {
    return invitation.status === 'pending' && invitation.expiresAt !== null && !isExpired(invitation.expiresAt);
  };

  const canRevoke = (invitation: AuthorizedInvitation): boolean => {
    return invitation.status === 'pending';
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" data-testid="view-manage-invitations">
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
              <h1 className="text-base truncate">Coach Invitations</h1>
            </div>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="shrink-0" data-testid="button-create-invitation">
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto overflow-x-hidden scroll-container">
        <div className="max-w-4xl mx-auto pt-4">
          {isLoadingInvitations ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading invitations...</p>
            </Card>
          ) : invitations.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No invitations found. Create your first invitation to get started.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const expired = isExpired(invitation.expiresAt);
                
                return (
                  <Card
                    key={invitation.id}
                    className="p-4"
                    data-testid={`invitation-card-${invitation.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-medium truncate">{invitation.email}</h3>
                          <Badge 
                            variant={getStatusBadgeVariant(invitation.status)}
                            data-testid={`status-${invitation.id}`}
                            className="flex-shrink-0"
                          >
                            {invitation.status}
                          </Badge>
                          {expired && invitation.status === 'pending' && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Coach: {getCoachName(invitation.coachId)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created: {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString('en-CA') : '—'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('en-CA') : '—'}
                          </p>
                          {invitation.acceptedAt && (
                            <p className="text-sm text-muted-foreground">
                              Accepted: {new Date(invitation.acceptedAt).toLocaleDateString('en-CA')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canResend(invitation) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(invitation.id)}
                            disabled={resendingId === invitation.id}
                            data-testid={`button-resend-${invitation.id}`}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            {resendingId === invitation.id ? 'Sending...' : 'Resend'}
                          </Button>
                        )}
                        {invitation.status === 'revoked' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReissue(invitation.id)}
                            disabled={reissuingId === invitation.id}
                            data-testid={`button-reissue-${invitation.id}`}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            {reissuingId === invitation.id ? 'Sending...' : 'Reissue'}
                          </Button>
                        )}
                        {canRevoke(invitation) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(invitation)}
                            data-testid={`button-revoke-${invitation.id}`}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-invitation">
          <DialogHeader>
            <DialogTitle>Create Coach Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation email to a coach. They'll have 48 hours to register.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="coach">Coach *</Label>
              <Select
                value={formData.coachId}
                onValueChange={(value) => setFormData({ ...formData, coachId: value })}
                disabled={isLoadingCoaches}
              >
                <SelectTrigger id="coach" data-testid="select-coach">
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.filter((coach) => !coach.userId).map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName} - {coach.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the coach profile to link to this account
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">
                An invitation link will be sent to this email
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData({ email: '', coachId: '' });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
              data-testid="button-send-invitation"
            >
              {createMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokingInvitation} onOpenChange={(open) => !open && setRevokingInvitation(null)}>
        <DialogContent data-testid="dialog-revoke-invitation">
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the invitation for {revokingInvitation?.email}? 
              They will no longer be able to register using this invitation link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokingInvitation(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRevoke} 
              disabled={revokeMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
