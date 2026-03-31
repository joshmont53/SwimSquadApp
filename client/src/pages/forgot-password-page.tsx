import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      return await apiRequest('POST', '/api/auth/forgot-password', data);
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Something went wrong',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data);
  };

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
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-[#059467]" />
                </div>
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-muted-foreground text-sm">
                  If an account exists for that email address, we've sent a password reset link. It will expire in 1 hour.
                </p>
                <p className="text-muted-foreground text-sm">
                  Don't forget to check your spam folder if you don't see it.
                </p>
                <div className="pt-2">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full"
                      data-testid="button-back-to-login"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <Mail className="h-10 w-10 text-[#059467]" />
                  </div>
                  <h1 className="text-xl font-semibold mb-1">Forgot your password?</h1>
                  <p className="text-muted-foreground text-sm">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Email address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-forgot-email"
                              type="email"
                              placeholder="your.email@example.com"
                              className="h-11 bg-muted/50"
                              disabled={forgotPasswordMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      data-testid="button-send-reset"
                      className="w-full h-11 bg-[#059467] text-white hover:bg-[#047a55] transition-colors"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? 'Sending...' : 'Send reset link'}
                    </Button>
                  </form>
                </Form>

                <div className="mt-5 text-center">
                  <Link href="/login">
                    <button
                      data-testid="link-back-to-login"
                      className="text-sm text-[#059467] hover:underline transition-all inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to sign in
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
