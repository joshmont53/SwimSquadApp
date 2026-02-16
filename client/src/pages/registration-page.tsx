import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useSearch } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationInput } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

export default function RegistrationPage() {
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect authenticated users to app
  useEffect(() => {
    if (!isLoading && isAuthenticated && !registrationComplete) {
      setLocation('/app');
    }
  }, [isLoading, isAuthenticated, registrationComplete, setLocation]);

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      inviteToken: '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
  });

  // Extract invite token from URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const token = params.get('token');
    if (token) {
      form.setValue('inviteToken', token);
    }
  }, [searchParams, form]);

  // Clear redirect timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationInput) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response;
    },
    onSuccess: (data: any) => {
      setRegistrationComplete(true);
      setEmailSent(data.emailSent || false);
      setRegisteredEmail(form.getValues('email'));
      
      // Invalidate auth cache to refresh status
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      
      toast({
        title: 'Registration successful!',
        description: data.emailSent 
          ? 'Please check your email to verify your account.' 
          : 'Your account has been created. You can now sign in.',
      });
      
      // Schedule redirect with ref for cleanup
      redirectTimeoutRef.current = setTimeout(() => {
        setLocation('/login');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Unable to create account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegistrationInput) => {
    registerMutation.mutate(data);
  };

  if (registrationComplete) {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto scroll-container bg-white py-8">
        <div className="max-w-md w-full px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <div className="bg-card rounded-2xl shadow-2xl p-8 text-center">
              <CheckCircle2 
                className="w-16 h-16 mx-auto mb-4 text-[#059467]"
              />
              <h2 className="text-2xl font-bold mb-2">Welcome aboard!</h2>
              <p className="text-muted-foreground mb-4">
                Your account has been created successfully.
              </p>
              {emailSent && (
                <p className="text-sm text-muted-foreground mb-4">
                  We've sent a verification email to <strong>{registeredEmail}</strong>. 
                  Please check your inbox and verify your account.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Redirecting to sign in...
              </p>
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
              <h2 className="text-2xl font-bold mb-2">Create your account</h2>
              <p className="text-muted-foreground text-sm">
                Complete your registration to access Swim Squad
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
                          disabled={registerMutation.isPending}
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
                          placeholder="Create a strong password"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        At least 12 characters with uppercase, lowercase, number, and special character
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passwordConfirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-password-confirm"
                          type="password"
                          placeholder="Re-enter your password"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-register"
                  className="w-full h-11 bg-[#059467] text-white hover:bg-[#047a55] transition-colors"
                  disabled={registerMutation.isPending || !form.watch('inviteToken')}
                >
                  {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button 
                  data-testid="link-signin"
                  className="text-[#059467] hover:underline transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/login');
                  }}
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
