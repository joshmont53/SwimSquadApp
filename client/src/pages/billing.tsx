import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
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

interface TierLineItem {
  label: string;
  users: number;
  unit_pence: number;
  subtotal_pence: number;
}

interface StripePriceTier {
  up_to: number | null;
  unit_amount: number | null;
  unit_amount_decimal: string | null;
  flat_amount: number | null;
  flat_amount_decimal: string | null;
}

interface BillingData {
  has_subscription: boolean;
  status?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  quantity?: number;
  active_users: number;
  club_status: string;
  currency?: string;
  billing_scheme?: string;
  tiers_mode?: string;
  tiers?: StripePriceTier[];
  stripe_customer_id?: string;
  estimated_breakdown: TierLineItem[] | null;
  estimated_monthly_total: number;
}

export function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const clubId = user?.clubId;

  const { data: billing, isLoading } = useQuery<BillingData>({
    queryKey: ['/api/clubs', clubId, 'billing'],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/billing`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch billing info');
      return res.json() as Promise<BillingData>;
    },
    enabled: !!clubId,
    retry: false,
  });

  const cancelClubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/clubs/${clubId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Club cancelled', description: 'Your club has been cancelled. You will be signed out.' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      setShowCancelConfirm(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Failed to cancel club', variant: 'destructive' });
      setShowCancelConfirm(false);
    },
  });

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiRequest('POST', `/api/clubs/${clubId}/billing/portal`, {});
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? 'Failed to open billing portal');
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setPortalLoading(false);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatGBP = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const statusLabel = (s?: string) => {
    if (!s) return null;
    const map: Record<string, string> = {
      active: 'Active',
      trialing: 'Trialing',
      past_due: 'Past due',
      canceled: 'Cancelled',
      unpaid: 'Unpaid',
      incomplete: 'Incomplete',
      incomplete_expired: 'Expired',
      paused: 'Paused',
    };
    return map[s] ?? s;
  };

  const statusVariant = (s?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'active' || s === 'trialing') return 'default';
    if (s === 'canceled' || s === 'incomplete_expired') return 'destructive';
    return 'secondary';
  };

  const estimatedBreakdown = billing?.estimated_breakdown ?? null;
  const estimatedMonthlyTotal = billing?.estimated_monthly_total ?? 0;

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/app')}
          data-testid="button-back-billing"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Billing
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">Subscription & Billing</h2>
        <p className="text-sm text-muted-foreground">
          View your current plan, active user count, and manage payment details via the Stripe Customer Portal.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 rounded-md bg-muted animate-pulse" />
          <div className="h-20 rounded-md bg-muted animate-pulse" />
        </div>
      ) : !billing?.has_subscription ? (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          No active subscription found for this club.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status card */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Subscription status</span>
              <Badge variant={statusVariant(billing.status)} data-testid="badge-billing-status">
                {statusLabel(billing.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Club status</span>
              <Badge
                variant={billing.club_status === 'active' ? 'default' : 'destructive'}
                data-testid="badge-club-status"
              >
                {billing.club_status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {billing.cancel_at_period_end && (
              <p className="text-sm text-destructive">
                Subscription will cancel at the end of the current period.
              </p>
            )}
            {billing.current_period_end && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {billing.cancel_at_period_end ? 'Cancels on' : 'Next billing date'}
                </span>
                <span className="text-sm" data-testid="text-billing-period-end">
                  {formatDate(billing.current_period_end)}
                </span>
              </div>
            )}
          </div>

          {/* Usage card */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Active coaches</span>
              <span className="text-sm font-semibold" data-testid="text-active-users">{billing.active_users}</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground">Billed quantity</span>
              <span className="text-sm" data-testid="text-billed-quantity">{billing.quantity}</span>
            </div>
          </div>

          {/* Estimated monthly charge breakdown (server-computed) */}
          {estimatedBreakdown && estimatedBreakdown.length > 0 && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">Estimated monthly charge</p>
              {estimatedBreakdown.map((part, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm flex-wrap gap-1"
                  data-testid={`billing-tier-row-${i}`}
                >
                  <span className="text-muted-foreground">
                    {part.users} user{part.users !== 1 ? 's' : ''} × {formatGBP(part.unit_pence)}/user (tier {part.label})
                  </span>
                  <span className="font-medium">{formatGBP(part.subtotal_pence)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold border-t pt-2 flex-wrap gap-1">
                <span>Total</span>
                <span data-testid="text-estimated-total">{formatGBP(estimatedMonthlyTotal)}/month</span>
              </div>
            </div>
          )}

          {/* Pricing tiers reference */}
          {billing.tiers_mode === 'graduated' && billing.tiers && billing.tiers.length > 0 && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">Pricing tiers (graduated)</p>
              {billing.tiers.map((tier, i) => (
                <div key={i} className="flex items-center justify-between text-sm flex-wrap gap-1">
                  <span>
                    {i === 0
                      ? `1–${tier.up_to ?? '∞'} users`
                      : tier.up_to
                      ? `${(billing.tiers![i - 1]?.up_to ?? 0) + 1}–${tier.up_to} users`
                      : `${(billing.tiers![i - 1]?.up_to ?? 0) + 1}+ users`}
                  </span>
                  <span className="font-medium">
                    {tier.unit_amount != null
                      ? formatGBP(tier.unit_amount)
                      : formatGBP(parseFloat(tier.unit_amount_decimal ?? '0'))}/user/month
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stripe Customer Portal button */}
      <div className="pt-2">
        <Button
          onClick={openPortal}
          disabled={portalLoading || !billing?.has_subscription}
          data-testid="button-open-billing-portal"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {portalLoading ? 'Opening portal…' : 'Manage billing in Stripe'}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Opens the Stripe Customer Portal where you can update payment methods, download invoices, and manage your subscription.
        </p>
      </div>

      {/* Cancel Club — destructive section */}
      <div className="border-t pt-6 space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-destructive">Cancel Club</h2>
          <p className="text-sm text-muted-foreground">
            Cancelling your club will immediately cancel your Stripe subscription, deactivate all coaches and users, and disable access to the app. All data is preserved in the database. This action cannot be undone from within the app.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowCancelConfirm(true)}
          data-testid="button-cancel-club-billing"
        >
          Cancel Club
        </Button>
      </div>

      {/* Cancel Club confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately cancel your Stripe subscription and deactivate all accounts associated with your club. You will be signed out and will not be able to log back in. All data is preserved but the club cannot be reactivated through the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-club-billing-back">Go back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelClubMutation.isPending}
              onClick={() => cancelClubMutation.mutate()}
              data-testid="button-confirm-cancel-club-billing"
            >
              {cancelClubMutation.isPending ? 'Cancelling…' : 'Yes, cancel my club'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
