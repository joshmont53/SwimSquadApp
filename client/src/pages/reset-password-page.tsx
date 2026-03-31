import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    setToken(t);
  }, []);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: '',
      password: '',
      passwordConfirm: '',
    },
  });

  useEffect(() => {
    if (token) {
      form.setValue('token', token);
    }
  }, [token, form]);

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      return await apiRequest('POST', '/api/auth/reset-password', data);
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setLocation('/login');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: 'Reset failed',
        description: error.message || 'Please try again or request a new reset link',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ResetPasswordInput) => {
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto bg-white py-8">
        <div className="max-w-md w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Invalid reset link</h2>
              <p className="text-muted-foreground text-sm">
                This password reset link is invalid or missing. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-request-new-link"
                >
                  Request a new reset link
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto bg-white py-8">
        <div className="max-w-md w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-[#059467] mx-auto" />
              <h2 className="text-xl font-semibold">Password reset successfully</h2>
              <p className="text-muted-foreground text-sm">
                Your password has been updated. You'll be redirected to the sign in page shortly.
              </p>
              <Link href="/login">
                <Button
                  className="w-full bg-[#059467] text-white"
                  data-testid="button-go-to-login"
                >
                  Sign in now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto scroll-container bg-white py-8">
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold mb-1">Choose a new password</h1>
              <p className="text-muted-foreground text-sm">
                Your new password must be at least 12 characters and include uppercase, lowercase, a number, and a special character.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">New password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-new-password"
                          type="password"
                          placeholder="Enter your new password"
                          className="h-11 bg-muted/50"
                          disabled={resetMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passwordConfirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Confirm new password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-confirm-password"
                          type="password"
                          placeholder="Confirm your new password"
                          className="h-11 bg-muted/50"
                          disabled={resetMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-reset-password"
                  className="w-full h-11 bg-[#059467] text-white hover:bg-[#047a55] transition-colors"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <Link href="/forgot-password">
                <button
                  data-testid="link-request-new-link"
                  className="text-sm text-[#059467] hover:underline transition-all inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Request a new reset link
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
