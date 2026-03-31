import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function LoginPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Show success toast if redirected from password reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'success') {
      toast({
        title: 'Password reset successfully',
        description: 'You can now sign in with your new password.',
      });
      // Remove the query param without re-rendering
      window.history.replaceState({}, '', '/login');
    }
  }, [toast]);

  // Redirect authenticated users to app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/app');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      return await apiRequest('POST', '/api/auth/login', data);
    },
    onSuccess: () => {
      setShowResendVerification(false);
      // Invalidate auth status to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      
      // Navigation handled by App.tsx based on auth status
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Invalid email or password';
      
      // Check if error is about email verification
      if (errorMessage.toLowerCase().includes('verify your email')) {
        setShowResendVerification(true);
        setPendingEmail(form.getValues('email'));
      } else {
        setShowResendVerification(false);
      }
      
      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  
  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('POST', '/api/auth/resend-verification', { email });
    },
    onSuccess: () => {
      toast({
        title: 'Verification email sent!',
        description: 'Please check your inbox and click the verification link.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send verification email',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div 
      className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto scroll-container bg-white py-8"
    >
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-base">
                Sign in to your account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-email"
                          type="email"
                          placeholder="your.email@example.com"
                          className="h-11 bg-muted/50"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-password"
                          type="password"
                          placeholder="Enter your password"
                          className="h-11 bg-muted/50"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-signin"
                  className="w-full h-11 bg-[#059467] text-white hover:bg-[#047a55] transition-colors"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            {showResendVerification && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Your email hasn't been verified yet. Check your inbox for the verification link, or request a new one.
                </p>
                <Button
                  type="button"
                  data-testid="button-resend-verification"
                  variant="outline"
                  className="w-full border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  disabled={resendVerificationMutation.isPending}
                  onClick={() => resendVerificationMutation.mutate(pendingEmail)}
                >
                  {resendVerificationMutation.isPending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </div>
            )}

            <div className="mt-5 text-center">
              <Link
                data-testid="link-forgot-password"
                href="/forgot-password"
                className="text-sm text-[#059467] hover:underline transition-all"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-1">New to the platform?</p>
              <Link
                data-testid="link-register-club"
                href="/register-club"
                className="text-sm font-medium text-[#059467] hover:underline transition-all"
              >
                Register your club
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
